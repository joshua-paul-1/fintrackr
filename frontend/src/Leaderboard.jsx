import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Leaderboard.css';
import { API_ENDPOINTS } from './config.js';

function Leaderboard({ accessToken }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [accessToken]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.LEADERBOARD, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard || []);
      } else {
        console.error('Error fetching leaderboard');
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getDifferenceColor = (difference) => {
    if (difference >= 0) return 'positive'; // Under budget (good)
    return 'negative'; // Over budget
  };

  const formatDifference = (difference) => {
    if (difference >= 0) {
      return `₹${difference.toFixed(2)} under budget`;
    } else {
      return `₹${Math.abs(difference).toFixed(2)} over budget`;
    }
  };

  return (
    <div className="leaderboard-container">
      <Link to="/dashboard" className="back-button">
        <span className="back-arrow">←</span> Back to Dashboard
      </Link>

      <h1 className="leaderboard-title">🏆 Spending Leaderboard</h1>
      <p className="leaderboard-subtitle">Compare your spending habits with friends!</p>

      {loading ? (
        <div className="loading-state">
          <p>Loading leaderboard...</p>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="empty-leaderboard">
          <p>No friends to compare with yet. Add friends to see the leaderboard!</p>
          <Link to="/friends">
            <button className="go-to-friends-button">Go to Friends</button>
          </Link>
        </div>
      ) : (
        <div className="leaderboard-content">
          <div className="leaderboard-table-container">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>User</th>
                  <th>Budget</th>
                  <th>Spent</th>
                  <th>Difference</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry) => (
                  <tr
                    key={entry.sub}
                    className={entry.isCurrentUser ? 'current-user-row' : ''}
                  >
                    <td className="rank-cell">
                      <span className="rank-icon">{getRankIcon(entry.rank)}</span>
                    </td>
                    <td className="user-cell">
                      <span className="user-email">
                        {entry.email}
                        {entry.isCurrentUser && <span className="you-badge"> (You)</span>}
                      </span>
                    </td>
                    <td className="budget-cell">₹{entry.budget.toFixed(2)}</td>
                    <td className="spent-cell">₹{entry.spending.toFixed(2)}</td>
                    <td className={`difference-cell ${getDifferenceColor(entry.difference)}`}>
                      {formatDifference(entry.difference)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="leaderboard-info">
            <p className="info-text">
              💡 <strong>How it works:</strong> Rankings are based on how much you're under or over your budget. 
              The more under budget you are, the higher your rank!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Leaderboard;


