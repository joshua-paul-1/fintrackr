import React from 'react';
import { Link } from 'react-router-dom';
import './homePage.css'; // Import the CSS file

function HomePage() {
  return (
    <div className="home-page">
      <h1>Welcome to FinTrackr!</h1>
      <p>Your personal financial tracker designed to help you manage your transactions efficiently.</p>
      <p className="tagline">Get started in minutes, not hours.</p>

      <div className="features-section">
        <h2>What FinTrackr Offers:</h2>
        <div className="feature-item">
          <h3>Secure Google Login</h3>
          <p>Effortlessly log in using your existing Google account. Your data is protected with industry-standard OAuth 2.0 protocols, ensuring a secure and seamless authentication experience.</p>
        </div>
        <div className="feature-item">
          <h3>Individual Transaction View</h3>
          <p>Access and review all your personal transactions in one place. FinTrackr fetches your linked financial data, providing a clear and concise overview of your spending and income.</p>
        </div>
        <div className="feature-item">
          <h3>Financial Activity Summary</h3>
          <p>Gain valuable insights with comprehensive summaries of your financial activities. Understand your spending patterns, identify trends, and make informed decisions about your money.</p>
        </div>
        <div className="feature-item">
          <h3>Track Spending and Income</h3>
          <p>Monitor every dollar in and out. Our intuitive interface allows you to categorize transactions, set budgets, and visualize your financial health, helping you stay on top of your financial goals.</p>
        </div>
      </div>

      <p>Ready to take control of your finances?</p>
      <Link to="/"><button>Go to Login</button></Link>
    </div>
  );
}

export default HomePage;
