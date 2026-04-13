import React, { useState } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);

  const handleLoginSuccess = (data) => {
    setIsLoggedIn(true);
    setUserData(data);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserData(null);
  };

  const handleProfileUpdate = (updatedUser) => {
    setUserData(updatedUser);
  };

  if (isLoggedIn && userData) {
    return <Dashboard userData={userData} onLogout={handleLogout} onProfileUpdate={handleProfileUpdate} />;
  }

  const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <div className="app-container">
        <Login onLoginSuccess={handleLoginSuccess} />
      </div>
    </GoogleOAuthProvider>
  );
}

export default App;
