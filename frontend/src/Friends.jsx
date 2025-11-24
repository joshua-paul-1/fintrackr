import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Friends.css';
import { API_ENDPOINTS } from './config.js';

function Friends({ accessToken }) {
  const [friendEmail, setFriendEmail] = useState('');
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchFriendRequests();
  }, [accessToken]);

  const fetchFriendRequests = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.FRIENDS_REQUESTS, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setReceivedRequests(data.receivedRequests || []);
        setSentRequests(data.sentRequests || []);
        setFriends(data.friends || []);
      }
    } catch (error) {
      console.error('Error fetching friend requests:', error);
    }
  };

  const handleSendRequest = async (e) => {
    e.preventDefault();
    if (!friendEmail.trim()) {
      setMessage('Please enter an email address');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const response = await fetch(API_ENDPOINTS.FRIENDS_SEND_REQUEST, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ recipientEmail: friendEmail.trim() })
      });

      const data = await response.json();
      if (response.ok) {
        setMessage('Friend request sent successfully!');
        setFriendEmail('');
        fetchFriendRequests();
      } else {
        setMessage(data.message || 'Error sending friend request');
      }
    } catch (error) {
      setMessage('Error sending friend request: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId) => {
    try {
      const response = await fetch(API_ENDPOINTS.FRIENDS_ACCEPT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ requestId })
      });

      if (response.ok) {
        fetchFriendRequests();
      } else {
        const data = await response.json();
        alert(data.message || 'Error accepting friend request');
      }
    } catch (error) {
      alert('Error accepting friend request: ' + error.message);
    }
  };

  const handleIgnore = async (requestId) => {
    try {
      const response = await fetch(API_ENDPOINTS.FRIENDS_IGNORE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ requestId })
      });

      if (response.ok) {
        fetchFriendRequests();
      } else {
        const data = await response.json();
        alert(data.message || 'Error ignoring friend request');
      }
    } catch (error) {
      alert('Error ignoring friend request: ' + error.message);
    }
  };

  return (
    <div className="friends-container">
      <Link to="/dashboard" className="back-button">
        <span className="back-arrow">←</span> Back to Dashboard
      </Link>
      
      <h1 className="friends-title">👥 Friends</h1>

      {/* Send Friend Request Section */}
      <div className="send-request-section">
        <h2>Send Friend Request</h2>
        <form onSubmit={handleSendRequest} className="friend-request-form">
          <input
            type="email"
            placeholder="Enter friend's email address"
            value={friendEmail}
            onChange={(e) => setFriendEmail(e.target.value)}
            className="friend-email-input"
            disabled={loading}
          />
          <button type="submit" className="send-request-button" disabled={loading}>
            {loading ? 'Sending...' : 'Send Request'}
          </button>
        </form>
        {message && (
          <p className={`message ${message.includes('successfully') ? 'success' : 'error'}`}>
            {message}
          </p>
        )}
      </div>

      {/* Received Requests Section */}
      {receivedRequests.length > 0 && (
        <div className="requests-section">
          <h2>Friend Requests Received ({receivedRequests.length})</h2>
          <div className="requests-list">
            {receivedRequests.map((request) => (
              <div key={request._id} className="request-card">
                <div className="request-info">
                  <p className="request-email">{request.senderEmail}</p>
                  <p className="request-date">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="request-actions">
                  <button
                    onClick={() => handleAccept(request._id)}
                    className="accept-button"
                  >
                    ✓ Accept
                  </button>
                  <button
                    onClick={() => handleIgnore(request._id)}
                    className="ignore-button"
                  >
                    ✗ Ignore
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sent Requests Section */}
      {sentRequests.length > 0 && (
        <div className="requests-section">
          <h2>Sent Friend Requests ({sentRequests.length})</h2>
          <div className="requests-list">
            {sentRequests.map((request) => (
              <div key={request._id} className="request-card sent">
                <div className="request-info">
                  <p className="request-email">{request.recipientEmail}</p>
                  <p className="request-date">
                    Sent on {new Date(request.createdAt).toLocaleDateString()}
                  </p>
                  <p className="request-status">Pending</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends List Section */}
      {friends.length > 0 && (
        <div className="friends-list-section">
          <h2>My Friends ({friends.length})</h2>
          <div className="friends-list">
            {friends.map((friend) => (
              <div key={friend._id} className="friend-card">
                <div className="friend-info">
                  <p className="friend-email">{friend.friendEmail}</p>
                  <p className="friend-date">
                    Friends since {new Date(friend.acceptedAt || friend.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {receivedRequests.length === 0 && sentRequests.length === 0 && friends.length === 0 && (
        <div className="empty-state">
          <p>No friend requests or friends yet. Send a friend request to get started!</p>
        </div>
      )}
    </div>
  );
}

export default Friends;

