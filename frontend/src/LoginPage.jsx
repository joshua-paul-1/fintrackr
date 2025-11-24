import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Link } from 'react-router-dom';
import { API_ENDPOINTS } from './config.js';

function LoginPage({ onLoginSuccess }) {
  const handleLoginSuccess = async (credentialResponse) => {
    const accessToken = credentialResponse.credential;

    try {
      const response = await fetch(API_ENDPOINTS.AUTH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessToken }),
      });

      if (!response.ok) {
        throw new Error('Backend authentication failed');
      }

      const data = await response.json();
      console.log('Backend response:', data);
      localStorage.setItem('googleAccessToken', accessToken);
      onLoginSuccess(accessToken);
    } catch (error) {
      console.error('Login error:', error);
      handleLoginError();
    }
  };

  const handleLoginError = () => {
    console.log('Login Failed');
  };

  return (
    <div className="login-page">
      <h1>Welcome Back!</h1>
      <p>Please log in to continue</p>
      <GoogleLogin
        onSuccess={handleLoginSuccess}
        onError={handleLoginError}
      />
      <p>
        <Link to="/home"><button>Learn more about FinTrackr</button></Link>
      </p>
    </div>
  );
}

export default LoginPage;
