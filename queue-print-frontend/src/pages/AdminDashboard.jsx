import React, { useState, useEffect } from 'react';
import { socket } from '../socket';
import './AdminDashboard.css';

function AdminDashboard() {
  const [session, setSession] = useState(null);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [printedFiles, setPrintedFiles] = useState(new Set());

  useEffect(() => {
    socket.connect();

    function onSessionStarted(data) {
      console.log('Session started:', data);
      setSession(data);
      setFiles([]); // Clear files from previous session
      setPrintedFiles(new Set());
      setError('');
      // Join the room for this session to receive updates
      socket.emit('join-session', data.sessionId);
    }

    function onSessionEnded() {
      alert('Session has ended. All files have been deleted.');
      setSession(null);
      setFiles([]);
      setPrintedFiles(new Set());
    }

    function onFileUploaded(file) {
        console.log('File uploaded:', file);
        // Add a 'new' class for animation
        setFiles(prevFiles => [...prevFiles, { ...file, isNew: true }]);
        
        // Remove the 'new' class after the animation
        setTimeout(() => {
            setFiles(prevFiles => prevFiles.map(f => f.id === file.id ? { ...f, isNew: false } : f));
        }, 500);
    }
    
    function onFileList(fileList) {
        setFiles(fileList);
    }

    function onFilePrinted({ fileName }) {
        setPrintedFiles(prev => new Set(prev).add(fileName));
    }

    function onError(err) {
      console.error('Backend Error:', err);
      setError(err.message);
    }

    socket.on('session-started', onSessionStarted);
    socket.on('session-ended', onSessionEnded);
    socket.on('file-uploaded', onFileUploaded);
    socket.on('file-list', onFileList);
    socket.on('file-printed', onFilePrinted);
    socket.on('error', onError);

    return () => {
      socket.off('session-started', onSessionStarted);
      socket.off('session-ended', onSessionEnded);
      socket.off('file-uploaded', onFileUploaded);
      socket.off('file-list', onFileList);
      socket.off('file-printed', onFilePrinted);
      socket.off('error', onError);
      socket.disconnect();
    };
  }, []);

  const handleStartSession = () => {
    socket.emit('start-session');
  };

  const handleEndSession = () => {
    if (session && window.confirm('Are you sure you want to end the session? All unprinted files will be permanently deleted.')) {
      socket.emit('end-session', session.sessionId);
    }
  };

  const handlePrintFile = (fileName) => {
    if (session) {
      socket.emit('print-file', { sessionId: session.sessionId, fileName: fileName });
    }
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };


  return (
    <div className="admin-dashboard">
      <header className="dashboard-header">
        <h1>Shopkeeper Dashboard</h1>
        {!session ? (
          <button onClick={handleStartSession} className="session-button start">Start New Print Session</button>
        ) : (
          <button onClick={handleEndSession} className="session-button end">End Session</button>
        )}
      </header>
      
      {error && <div className="error-message">Error: {error}</div>}

      {!session ? (
        <div className="no-session">
          <h2>Welcome to Safe Print!</h2>
          <p>Click "Start New Print Session" to begin.</p>
          <p>A QR code will be generated for customers to scan and upload their files.</p>
        </div>
      ) : (
        <div className="session-active">
          <h2>Session Active: {session.sessionId}</h2>
          <div className="print-queue-container">
            <h3>Print Queue</h3>
            {files.length === 0 ? (
              <p className="empty-queue-message">Waiting for files...</p>
            ) : (
              <ul className="file-list">
                {files.map((file) => (
                  <li key={file.id} className={`file-item ${file.isNew ? 'new-file-animation' : ''} ${printedFiles.has(file.name) ? 'printed' : ''}`}>
                    <div className="file-info">
                      <span className="file-name">#{file.id} - {file.name}</span>
                      <span className="file-meta">
                        {formatBytes(file.size)} | {new Date(file.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <button 
                      onClick={() => handlePrintFile(file.name)} 
                      className="print-button"
                      disabled={printedFiles.has(file.name)}
                    >
                      {printedFiles.has(file.name) ? 'Printed' : 'Print'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import './AdminDashboard.css';


export default AdminDashboard;
