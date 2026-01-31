import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './UserUpload.css';

// A custom hook to parse query parameters
function useQuery() {
  return new URLSearchParams(useLocation().search);
}

function UserUpload() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('waiting'); // waiting, uploading, success, error
  const [message, setMessage] = useState('Select a file to send to the print queue.');
  const [sessionId, setSessionId] = useState('');
  const query = useQuery();

  useEffect(() => {
    const sid = query.get('sessionId');
    if (sid) {
      setSessionId(sid);
    } else {
      setStatus('error');
      setMessage('Error: No session ID provided. Please scan the QR code again.');
    }
  }, [query]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
        setFile(selectedFile);
        setStatus('ready');
        setMessage(`Ready to upload: ${selectedFile.name}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !sessionId) {
      setMessage('Cannot upload. No file selected or session is invalid.');
      return;
    }

    setStatus('uploading');
    setMessage('Sending file to the counter...');

    const formData = new FormData();
    formData.append('file', file);

    // IMPORTANT: Replace this URL with the actual address of your backend server.
    const UPLOAD_URL = `http://172.20.10.2:3001/upload?sessionId=${sessionId}`;

    try {
      const response = await fetch(UPLOAD_URL, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(`File sent! Your ticket number is #${data.ticketNumber}. The page will now lock.`);
      } else {
        throw new Error(data.message || 'An unknown error occurred.');
      }
    } catch (err) {
      setStatus('error');
      setMessage(`Upload failed: ${err.message}`);
    }
  };

  return (
    <div className="upload-container">
      <div className="upload-box">
        <h1 className="upload-title">Safe Print</h1>
        <div className={`message-area status-${status}`}>
            <p>{message}</p>
        </div>

        {status !== 'success' && status !== 'error' && (
            <form onSubmit={handleSubmit} className="upload-form">
                <input 
                    type="file" 
                    id="file-input" 
                    onChange={handleFileChange} 
                    className="file-input"
                    disabled={status === 'uploading'}
                />
                <label htmlFor="file-input" className="file-label">
                    Choose File
                </label>

                {file && <span className="file-name-display">{file.name}</span>}

                <button 
                    type="submit" 
                    className="upload-button"
                    disabled={!file || status === 'uploading'}
                >
                    {status === 'uploading' ? 'Sending...' : 'Send to Counter'}
                </button>
            </form>
        )}

         {status === 'success' && (
             <div className="locked-notice">
                <p>✅</p>
                <p>Your file has been securely sent. You can now close this page.</p>
             </div>
         )}
      </div>
    </div>
  );
}




export default UserUpload;
