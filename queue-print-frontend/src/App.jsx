import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import './App.css';

function App() {
  return (
    <div>
      <nav className="main-nav">
        <Link to="/" className="nav-logo">Safe Print</Link>
        <div className="nav-links">
          <Link to="/dashboard">Shopkeeper Dashboard</Link>
          <Link to="/display">QR Display (Phone)</Link>
        </div>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  );
}




export default App;
