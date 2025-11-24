import { useState, useEffect } from 'react'
import './App.css'
import { Routes, Route, useNavigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import LoginPage from './LoginPage.jsx';
import Dashboard from './Dashboard.jsx';
import HomePage from './HomePage.jsx'; // Import HomePage
import TransactionSummary from './transactionSummary/TransactionSummary.jsx'; // Keep this import for the nested route
import Friends from './Friends.jsx'; // Import Friends component
import Leaderboard from './Leaderboard.jsx'; // Import Leaderboard component
import { API_ENDPOINTS, GOOGLE_CLIENT_ID } from './config.js';

function App() {
  const [accessToken, setAccessToken] = useState(localStorage.getItem('googleAccessToken'));
  const [transactions, setTransactions] = useState([]); // Add transactions state
  const navigate = useNavigate();

  const handleLoginSuccess = (token) => {
    setAccessToken(token);
    navigate('/dashboard'); // Redirect to dashboard after login
  };

  const handleLogout = () => {
    console.log('App.js handleLogout: Before setting accessToken to null. Current accessToken:', accessToken);
    setAccessToken(null);
    setTransactions([]); // Clear transactions on logout
    localStorage.removeItem('googleAccessToken');
    navigate('/home'); // Explicitly navigate to home after logout
    console.log('App.js handleLogout: After navigating to /home.');
  };

  useEffect(() => {
    console.log('App.js useEffect: Current accessToken:', accessToken, 'Path:', window.location.pathname);
    if (!accessToken) {
      console.log('App.js useEffect: accessToken is null or undefined.');
      if (window.location.pathname !== '/home' && window.location.pathname !== '/') {
        console.log('App.js useEffect: Redirecting to /home due to no accessToken.');
        navigate('/home'); // Redirect to home page if not authenticated and not on home/login
      }
    } else {
      console.log('App.js useEffect: accessToken is present.');
      // Fetch transactions when accessToken is available
      fetch(API_ENDPOINTS.TRANSACTIONS, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
        .then(response => response.json())
        .then(data => {
          console.log('Transactions API response data:', data); // Log the API response
          // Adjust this logic to correctly extract the transactions array
          let extractedTransactions = [];
          if (Array.isArray(data) && data.length > 0 && data[0].transactions) {
            extractedTransactions = data[0].transactions;
          } else if (Array.isArray(data)) {
            // If the backend directly returns an array of transactions without nesting in an object
            extractedTransactions = data;
          }
          setTransactions(extractedTransactions);
        })
        .catch(error => console.error('Error fetching transactions:', error));

      if (window.location.pathname === '/' || window.location.pathname === '/home') {
        console.log('App.js useEffect: Redirecting to /dashboard due to accessToken presence.');
        navigate('/dashboard'); // Redirect to dashboard if authenticated and on home/login
      }
    }
  }, [accessToken, navigate]);

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Routes>
        <Route path="/" element={!accessToken ? <LoginPage onLoginSuccess={handleLoginSuccess} /> : <Dashboard accessToken={accessToken} onLogout={handleLogout} transactions={transactions} />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/dashboard" element={accessToken ? <Dashboard accessToken={accessToken} onLogout={handleLogout} transactions={transactions} /> : <LoginPage onLoginSuccess={handleLoginSuccess} />} />
        {/* Nested route for TransactionSummary, accessible from Dashboard */}
        <Route path="/summary" element={accessToken ? <TransactionSummary accessToken={accessToken} transactions={transactions} /> : <LoginPage onLoginSuccess={handleLoginSuccess} />} />
        {/* Friends route */}
        <Route path="/friends" element={accessToken ? <Friends accessToken={accessToken} /> : <LoginPage onLoginSuccess={handleLoginSuccess} />} />
        {/* Leaderboard route */}
        <Route path="/leaderboard" element={accessToken ? <Leaderboard accessToken={accessToken} /> : <LoginPage onLoginSuccess={handleLoginSuccess} />} />
      </Routes>
    </GoogleOAuthProvider>
  )
}

export default App
