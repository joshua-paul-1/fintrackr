import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { Link, useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from './config.js';

function Dashboard({ accessToken, onLogout, transactions, overallGoalStatus, overallDifference }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [pdfPassword, setPdfPassword] = useState(''); // New state for PDF password
  const navigate = useNavigate();

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a PDF file to upload.');
      return;
    }

    const formData = new FormData();
    formData.append('pdfFile', selectedFile);
    if (pdfPassword) { // Only append password if provided
      formData.append('password', pdfPassword);
    }

    try {
      const response = await fetch(API_ENDPOINTS.UPLOAD_PDF, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // Check if error is password-related
        if (errorData.message === 'INCORRECT_PASSWORD' || errorData.error?.includes('password')) {
          throw new Error('INCORRECT_PASSWORD');
        }
        throw new Error(errorData.error || 'PDF upload failed');
      }

      const data = await response.json();
      console.log('PDF upload successful:', data);
      alert('PDF uploaded and processed successfully!');
      window.location.reload(); // Simple refresh for now
    } catch (error) {
      console.error('Error uploading PDF:', error);
      // Show user-friendly message for password errors
      if (error.message === 'INCORRECT_PASSWORD' || error.message.toLowerCase().includes('password')) {
        alert('Password wasn\'t correct. Please check your PDF password and try again.');
      } else {
        // alert(`Error uploading PDF: ${error.message}`);
        alert('Password wasn\'t correct. Please check your PDF password and try again.');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('googleAccessToken');
    onLogout(); // Call the onLogout prop from App.jsx
  };

  return (
    <>
      <nav>
        <Link to="/home"><button className="nav-home-button">Home</button></Link>
        <button className="nav-logout-button" onClick={handleLogout}>Logout</button>
      </nav>
      <div className="dashboard-content">
        <h1>Welcome to FinTrackr!</h1>
        <p><b>Your personal daily spending tracker. Upload your PDF statements to get insights into your financial habits.</b></p>
 
        {overallGoalStatus && (
          <div className="goal-status-section">
            <h2>Overall Spending Goal Status:</h2>
            <p className={overallGoalStatus === "Met Goal" ? "goal-met" : "goal-exceeded"}>
              {overallGoalStatus}
              {overallDifference !== null && (
                <span> ({overallGoalStatus === "Met Goal" ? "Under" : "Over"} by ₹{overallDifference.toFixed(2)})</span>
              )}
            </p>
          </div>
        )}

        <div className="instructions-section">
          <h2>How to Get Your PDF Statement</h2>
          
          <div className="instruction-card">
            <h3>📱 PhonePe</h3>
            <ol>
              <li>Open the PhonePe app on your phone</li>
              <li>Tap on your profile icon (top left corner)</li>
              <li>Scroll down and select "Statements" or "Account Statement"</li>
              <li>Choose the date range for which you want the statement</li>
              <li>Select "Download PDF" or "Email Statement"</li>
              <li>If emailed, download the PDF from your email</li>
              <li>Upload the downloaded PDF file below</li>
            </ol>
          </div>

          <div className="instruction-card">
            <h3>💳 Paytm</h3>
            <ol>
              <li>Open the Paytm app on your phone</li>
              <li>Tap on "Passbook" or "Transactions" from the home screen</li>
              <li>Tap on the menu (three lines) or settings icon</li>
              <li>Select "Download Statement" or "Email Statement"</li>
              <li>Choose the date range for your statement</li>
              <li>Enter your email address if prompted</li>
              <li>Download the PDF from your email inbox</li>
              <li>Upload the downloaded PDF file below</li>
            </ol>
          </div>

          <p className="instruction-note">
            <strong>Note:</strong> Some PDF statements may be password protected. If your PDF requires a password, enter it in the field below before uploading.
          </p>
        </div>

        <div className="upload-pdf-section">
          <h2>Upload a PDF Statement</h2>
          <input type="file" accept=".pdf" onChange={handleFileChange} />
          {/* <br> */}
          <input
            type="password"
            placeholder="PDF Password (optional)"
            value={pdfPassword}
            onChange={(e) => setPdfPassword(e.target.value)}
            className="pdf-password-input"
          />
          <button className="upload-pdf-button" onClick={handleUpload}>Upload PDF</button>
        </div>

        <div className="dashboard-actions">
          <Link to="/summary"><button className="summary-button">Go to Transaction Summary</button></Link>
          <Link to="/friends"><button className="friends-button">👥 Friends</button></Link>
          <Link to="/leaderboard"><button className="leaderboard-button">🏆 Leaderboard</button></Link>
        </div>
      </div>
    </>
  );
}

export default Dashboard;
