const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Docker = require('dockerode');
const qrcode = require('qrcode');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for simplicity. For production, restrict this to your frontend's URL.
    methods: ["GET", "POST"]
  }
});

const docker = new Docker();

// In-memory store for session management. In a real-world scenario, you might use a database like Redis.
let sessions = {};

// --- Directory Setup ---
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors());
app.use('/uploads', express.static(uploadsDir)); // Serve uploaded files


// --- Docker Helper Functions ---

/**
 * Starts a new Docker container for a session.
 * It mounts a session-specific directory to store files.
 * @param {string} sessionId - The unique ID for the session.
 * @returns {Promise<string>} - The ID of the created container.
 */
async function startSessionContainer(sessionId) {
  const sessionUploadPath = path.join(uploadsDir, sessionId);
  if (!fs.existsSync(sessionUploadPath)) {
    fs.mkdirSync(sessionUploadPath, { recursive: true });
  }

  console.log(`Starting container for session: ${sessionId}`);
  try {
    // Ensure the image is available locally
    await new Promise((resolve, reject) => {
      docker.pull('alpine:latest', (err, stream) => {
        if (err) return reject(err);
        docker.modem.followProgress(stream, (err, output) => {
          if (err) return reject(err);
          resolve(output);
        });
      });
    });

    const container = await docker.createContainer({
      Image: 'alpine:latest',
      Cmd: ['/bin/sh', '-c', 'tail -f /dev/null'], // Keep container running
      HostConfig: {
        Binds: [`${sessionUploadPath}:/app/uploads`],
      },
      Labels: {
        'safe-print-session': sessionId
      }
    });

    await container.start();
    console.log(`Container ${container.id} started for session ${sessionId}`);
    return container.id;
  } catch (error) {
    console.error(`Error starting container for session ${sessionId}:`, error);
    throw error;
  }
}

/**
 * Stops and removes a Docker container.
 * @param {string} containerId - The ID of the container to remove.
 */
async function stopAndRemoveContainer(containerId) {
  try {
    const container = docker.getContainer(containerId);
    await container.stop();
    await container.remove();
    console.log(`Container ${containerId} stopped and removed.`);
  } catch (error) {
    // If container doesn't exist, it might have been removed already.
    if (error.statusCode === 404) {
        console.log(`Container ${containerId} not found, likely already removed.`);
        return;
    }
    console.error(`Error stopping/removing container ${containerId}:`, error);
  }
}

/**
 * Simulates printing a file by executing a command inside the container.
 * @param {string} containerId - The ID of the container.
 * @param {string} fileName - The name of the file to "print".
 */
async function printFileInContainer(containerId, fileName) {
  try {
    const container = docker.getContainer(containerId);
    const exec = await container.exec({
      Cmd: ['/bin/sh', '-c', `echo "--- PRINTING FILE: ${fileName} ---"`],
      AttachStdout: true,
      AttachStderr: true
    });

    const stream = await exec.start({ hijack: true, stdin: true });
    let output = '';
    stream.on('data', chunk => output += chunk.toString('utf8'));
    await new Promise(resolve => stream.on('end', resolve));
    
    console.log(`Print command output for ${fileName} in ${containerId}:\n${output}`);
  } catch (error) {
    console.error(`Error printing file ${fileName} in container ${containerId}:`, error);
  }
}


// --- Multer Setup for File Uploads ---

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const sessionId = req.query.sessionId;
    if (!sessionId || !sessions[sessionId]) {
      return cb(new Error('Invalid or expired session.'), null);
    }
    const sessionUploadPath = path.join(uploadsDir, sessionId);
    cb(null, sessionUploadPath);
  },
  filename: function (req, file, cb) {
    // Use original filename, sanitized for safety
    const sanitizedFilename = path.basename(file.originalname);
    cb(null, sanitizedFilename);
  }
});

const upload = multer({ storage: storage });


// --- API Endpoints ---

// Endpoint for customers to upload files
app.post('/upload', upload.single('file'), (req, res) => {
  const sessionId = req.query.sessionId;
  const session = sessions[sessionId];
  
  if (!session) {
    return res.status(404).json({ message: "Session not found or has expired." });
  }

  const file = req.file;
  if (!file) {
    return res.status(400).json({ message: "File upload failed." });
  }

  const ticketNumber = session.fileCounter++;
  const fileData = {
    id: ticketNumber,
    name: file.filename,
    size: file.size,
    timestamp: new Date().toISOString()
  };

  session.files.push(fileData);

  // Notify the dashboard that a new file has been added
  io.to(sessionId).emit('file-uploaded', fileData);

  console.log(`File ${file.filename} uploaded to session ${sessionId} (Ticket #${ticketNumber})`);
  res.status(200).json({ message: "File sent to the counter!", ticketNumber });
});


// --- Socket.IO Event Handlers ---

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Client joins a session room (for dashboard or QR display)
  socket.on('join-session', (sessionId) => {
    if (sessions[sessionId]) {
      socket.join(sessionId);
      console.log(`Socket ${socket.id} joined session room: ${sessionId}`);
      // Send the current list of files to the newly connected dashboard
      socket.emit('file-list', sessions[sessionId].files);
    } else {
      socket.emit('error', { message: `Session ${sessionId} does not exist.` });
    }
  });

  // Shopkeeper starts a new session
  socket.on('start-session', async () => {
    const sessionId = `session-${Date.now()}`;
    console.log(`Attempting to start a new session: ${sessionId}`);

    try {
        const containerId = await startSessionContainer(sessionId);
        
        // The URL for the QR code MUST point to the frontend upload page.
        // The frontend will then send the file to the backend API.
        // We assume the frontend runs on port 5173 (default for Vite).
        const FRONTEND_PORT = 5173;
        const uploadUrl = `http://172.20.10.2:${FRONTEND_PORT}/upload?sessionId=${sessionId}`;
        
        const qrCodeDataUrl = await qrcode.toDataURL(uploadUrl);

        sessions[sessionId] = {
            id: sessionId,
            containerId: containerId,
            startTime: new Date(),
            files: [],
            fileCounter: 1 // For ticket numbers
        };
        
        // The client who started the session automatically joins the room
        socket.join(sessionId);

        // Send session details back to the dashboard
        socket.emit('session-started', {
            sessionId: sessionId,
            qrCode: qrCodeDataUrl,
            uploadUrl: uploadUrl // for display on QR page
        });
        
        console.log(`Session ${sessionId} started successfully.`);

    } catch (error) {
        console.error('Failed to start session:', error);
        socket.emit('error', { message: 'Failed to start Docker container. Is Docker running?' });
    }
  });

  // Shopkeeper ends the current session
  socket.on('end-session', async (sessionId) => {
    const session = sessions[sessionId];
    if (session) {
      console.log(`Ending session: ${sessionId}`);
      await stopAndRemoveContainer(session.containerId);

      // Clean up the session's upload directory
      const sessionUploadPath = path.join(uploadsDir, sessionId);
      fs.rm(sessionUploadPath, { recursive: true, force: true }, (err) => {
        if (err) {
            console.error(`Failed to delete session directory ${sessionUploadPath}:`, err);
        } else {
            console.log(`Cleaned up directory: ${sessionUploadPath}`);
        }
      });
      
      // Notify clients and clean up
      io.to(sessionId).emit('session-ended');
      delete sessions[sessionId];
      
      console.log(`Session ${sessionId} has been terminated.`);
    }
  });

  // Shopkeeper requests to print a file
  socket.on('print-file', (data) => {
    const { sessionId, fileName } = data;
    const session = sessions[sessionId];
    if (session && session.files.some(f => f.name === fileName)) {
      console.log(`Request to print ${fileName} in session ${sessionId}`);
      printFileInContainer(session.containerId, fileName);
      // Optional: emit an event back to dashboard to show print status
      io.to(sessionId).emit('file-printed', { fileName });
    }
  });

  // A client (dashboard) requests the file list for a session
  socket.on('get-session-files', (sessionId) => {
      if (sessions[sessionId]) {
          socket.emit('file-list', sessions[sessionId].files);
      }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// --- Server Start ---
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`);
  console.log('IMPORTANT: Ensure Docker is running on your machine.');
  console.log('IMPORTANT: When starting a session, you must replace <YOUR_LOCAL_IP> in the generated URL with your actual IP address to allow other devices to connect.');
});

// --- Graceful Shutdown ---
process.on('SIGINT', () => {
    console.log('\nGracefully shutting down... Please wait.');

    // 1. Close the Socket.IO server, which will disconnect all clients.
    io.close(async (err) => {
        if (err) {
            console.error('Error closing Socket.IO server:', err);
        }
        console.log('Socket.IO connections closed.');

        // 2. Close the HTTP server.
        server.close(async (err) => {
            if (err) {
                console.error('Error closing HTTP server:', err);
                process.exit(1); // Exit with an error code if server can't close
            }
            console.log('HTTP server closed.');

            // 3. Clean up Docker containers and files after the server is fully closed.
            console.log('Cleaning up active sessions and containers...');
            for (const sessionId in sessions) {
                try {
                    const session = sessions[sessionId];
                    if (session.containerId) {
                        await stopAndRemoveContainer(session.containerId);
                    }
                    const sessionUploadPath = path.join(uploadsDir, sessionId);
                    if (fs.existsSync(sessionUploadPath)) {
                        fs.rmSync(sessionUploadPath, { recursive: true, force: true });
                        console.log(`Cleaned up directory: ${sessionUploadPath}`);
                    }
                } catch (cleanupErr) {
                    console.error(`Error during cleanup for session ${sessionId}:`, cleanupErr);
                }
            }
            
            console.log('Cleanup complete. Exiting now.');
            process.exit(0);
        });

        // 4. Failsafe: If the server is stuck and doesn't close, force exit after a timeout.
        setTimeout(() => {
            console.error('Graceful shutdown timed out. Forcing exit.');
            process.exit(1);
        }, 10000); // 10-second timeout
    });
});