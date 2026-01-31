import React from 'react';
import { Link } from 'react-router-dom';

function Home() {
  const styles = {
    container: {
      padding: '40px',
      textAlign: 'center',
      fontFamily: 'sans-serif',
      color: '#333'
    },
    title: {
      fontSize: '3rem',
      marginBottom: '20px'
    },
    description: {
      fontSize: '1.2rem',
      color: '#666',
      maxWidth: '600px',
      margin: '0 auto 30px auto'
    },
    rolesContainer: {
      display: 'flex',
      justifyContent: 'center',
      gap: '30px',
      marginTop: '40px'
    },
    roleCard: {
      background: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: '8px',
      padding: '30px',
      width: '250px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.05)'
    },
    roleTitle: {
      fontSize: '1.5rem',
      marginBottom: '15px'
    },
    roleDescription: {
      marginBottom: '20px'
    },
    button: {
      display: 'inline-block',
      padding: '10px 20px',
      backgroundColor: '#007bff',
      color: 'white',
      textDecoration: 'none',
      borderRadius: '5px',
      transition: 'background-color 0.3s'
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Welcome to Safe Print</h1>
      <p style={styles.description}>
        A secure and simple way to handle print jobs. Customers can upload files without seeing others' documents, and the shopkeeper manages a real-time queue.
      </p>

      <div style={styles.rolesContainer}>
        <div style={styles.roleCard}>
          <h2 style={styles.roleTitle}>For the Shopkeeper</h2>
          <p style={styles.roleDescription}>Manage the print queue, start/end sessions, and print files from your dashboard.</p>
          <Link to="/dashboard" style={styles.button}>Go to Dashboard</Link>
        </div>
        <div style={styles.roleCard}>
          <h2 style={styles.roleTitle}>For the QR Display</h2>
          <p style={styles.roleDescription}>Use a phone or tablet to show the QR code to customers.</p>
          <Link to="/display" style={styles.button}>Open QR Display</Link>
        </div>
      </div>
    </div>
  );
}

export default Home;
