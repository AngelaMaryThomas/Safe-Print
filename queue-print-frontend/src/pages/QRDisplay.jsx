import React, { useState, useEffect } from 'react';
import { socket } from '../socket';

function QRDisplay() {
  const [session, setSession] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    socket.connect();

    // This component only needs to know when a session starts or ends.
    // It doesn't need to join a specific session room initially,
    // as 'session-started' will be broadcast. However, to be robust,
    // let's have a way to get the current session if one is already active.
    // A simple approach is for the server to perhaps emit to newly connected sockets.
    // For now, we assume the display is opened before the session starts.

    function onSessionStarted(data) {
      console.log('QRDisplay received session-started:', data);
      setSession(data);
      setError('');
    }

    function onSessionEnded() {
      setSession(null);
    }
    
    function onError(err) {
      setError(err.message);
    }

    socket.on('session-started', onSessionStarted);
    socket.on('session-ended', onSessionEnded);
    socket.on('error', onError);

    // Optional: Ask the server if there's an active session upon connecting
    // socket.emit('get-active-session'); 
    // This would require a 'get-active-session' handler on the backend.

    return () => {
      socket.off('session-started', onSessionStarted);
      socket.off('session-ended', onSessionEnded);
      socket.off('error', onError);
      socket.disconnect();
    };
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Safe Print QR Display</h1>
        {error && <p style={styles.error}>Error: {error}</p>}
        {session ? (
          <div style={styles.qrContainer}>
            <p style={styles.instruction}>Scan this code to upload your files.</p>
            <img src={session.qrCode} alt="Upload QR Code" style={styles.qrImage} />
            <p style={styles.urlText}>Or go to: {session.uploadUrl}</p>
          </div>
        ) : (
          <div style={styles.waiting}>
            <p>Waiting for the shopkeeper to start a new session...</p>
            <p>The QR code will appear here automatically.</p>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#333',
    color: 'white',
    fontFamily: 'sans-serif',
    padding: '20px'
  },
  card: {
    backgroundColor: '#444',
    borderRadius: '15px',
    padding: '30px',
    textAlign: 'center',
    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
    width: '100%',
    maxWidth: '500px',
  },
  title: {
    margin: '0 0 20px 0',
    borderBottom: '1px solid #555',
    paddingBottom: '20px'
  },
  qrContainer: {
    marginTop: '20px'
  },
  instruction: {
    fontSize: '1.2em',
    color: '#ccc'
  },
  qrImage: {
    maxWidth: '100%',
    height: 'auto',
    borderRadius: '10px',
    border: '5px solid white'
  },
  urlText: {
    fontSize: '0.9em',
    color: '#aaa',
    wordBreak: 'break-all',
    marginTop: '15px'
  },
  waiting: {
    padding: '40px 0',
    fontSize: '1.2em',
    color: '#aaa'
  },
  error: {
    color: '#ff8a80'
  }
};

export default QRDisplay;
