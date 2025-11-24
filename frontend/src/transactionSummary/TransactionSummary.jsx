import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Link } from "react-router-dom";
import "./tsummary.css";
import { API_ENDPOINTS } from "../config.js";

export default function TransactionSummary({ transactions, accessToken }) {
  const [view, setView] = useState("table");
  const [budgetStatus, setBudgetStatus] = useState(null);
  const [budget, setBudget] = useState(null);
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetPeriod, setBudgetPeriod] = useState('monthly');
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiProvider, setAiProvider] = useState('auto');
  const [spendingInsights, setSpendingInsights] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Calculate spending insights
  useEffect(() => {
    if (transactions && transactions.length > 0) {
      calculateSpendingInsights();
    }
  }, [transactions]);

  const calculateSpendingInsights = () => {
    // Flatten transactions if nested
    let allTransactions = [];
    transactions.forEach(tx => {
      if (tx.transactions && Array.isArray(tx.transactions)) {
        allTransactions = allTransactions.concat(tx.transactions);
      } else {
        allTransactions.push(tx);
      }
    });

    if (allTransactions.length === 0) {
      setSpendingInsights(null);
      return;
    }

    // Calculate average spending per transaction
    const totalAmount = allTransactions.reduce((sum, tx) => sum + (Number(tx.total) || 0), 0);
    const avgTransactionCost = allTransactions.length > 0 ? totalAmount / allTransactions.length : 0;

    // Calculate most likely spending time
    const timeSlots = {
      'Morning (5-12)': 0,
      'Afternoon (12-17)': 0,
      'Evening (17-20)': 0,
      'Night (20-5)': 0
    };

    allTransactions.forEach(tx => {
      if (tx.time) {
        const hour = parseInt(tx.time.split(':')[0]);
        if (hour >= 5 && hour < 12) timeSlots['Morning (5-12)']++;
        else if (hour >= 12 && hour < 17) timeSlots['Afternoon (12-17)']++;
        else if (hour >= 17 && hour < 20) timeSlots['Evening (17-20)']++;
        else timeSlots['Night (20-5)']++;
      }
    });

    const mostLikelyTime = Object.entries(timeSlots).reduce((max, [time, count]) => 
      count > max.count ? { time, count } : max, 
      { time: 'Not available', count: 0 }
    );

    // Calculate most common day of week
    const dayCounts = {
      'Monday': 0, 'Tuesday': 0, 'Wednesday': 0, 
      'Thursday': 0, 'Friday': 0, 'Saturday': 0, 'Sunday': 0
    };

    allTransactions.forEach(tx => {
      if (tx.date) {
        const dayOfWeek = new Date(tx.date).toLocaleDateString('en-US', { weekday: 'long' });
        if (dayCounts[dayOfWeek] !== undefined) {
          dayCounts[dayOfWeek]++;
        }
      }
    });

    const mostCommonDay = Object.entries(dayCounts).reduce((max, [day, count]) => 
      count > max.count ? { day, count } : max, 
      { day: 'Not available', count: 0 }
    );

    // Calculate total number of unique merchants
    const uniqueMerchants = new Set(allTransactions.map(tx => tx.name)).size;

    // Calculate biggest single transaction
    const biggestTransaction = allTransactions.reduce((max, tx) => {
      const amount = Number(tx.total) || 0;
      return amount > max.amount ? { merchant: tx.name, amount, date: tx.date } : max;
    }, { merchant: 'None', amount: 0, date: null });

    setSpendingInsights({
      avgTransactionCost,
      mostLikelyTime: mostLikelyTime.time,
      mostCommonDay: mostCommonDay.day,
      uniqueMerchants,
      biggestTransaction,
      totalTransactions: allTransactions.length
    });
  };

  // Fetch budget status
  useEffect(() => {
    const fetchBudgetStatus = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.BUDGET_STATUS, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setBudgetStatus(data.budgetStatus);
          setBudget(data.budget);
        }
      } catch (error) {
        console.error('Error fetching budget status:', error);
      }
    };

    if (accessToken) {
      fetchBudgetStatus();
    }
  }, [accessToken]);

  // Fetch AI analytics
  // const fetchAIAnalytics = async () => {
  //   setLoading(true);
  //   try {
  //     const response = await fetch(`${API_ENDPOINTS.AI_ANALYTICS}?provider=${aiProvider}`, {
  //       headers: {
  //         'Authorization': `Bearer ${accessToken}`
  //       }
  //     });

  //     if (response.ok) {
  //       const data = await response.json();
  //       if (data.status === 'success') {
  //         setAiAnalysis(data.analysis);
  //         setShowAIAnalysis(true);
  //       } else {
  //         alert(data.message || 'Error loading AI analysis');
  //       }
  //     } else {
  //       const errorData = await response.json();
  //       alert(errorData.message || 'Error loading AI analysis');
  //     }
  //   } catch (error) {
  //     console.error('Error fetching AI analytics:', error);
  //     alert('Error loading AI analysis: ' + error.message);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // Handle deleting all transactions and PDFs
  const handleDeleteTransactions = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete all your transactions and PDF files? This action cannot be undone.'
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(API_ENDPOINTS.DELETE_TRANSACTIONS, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete transactions');
      }

      const data = await response.json();
      alert(data.message || 'All transactions and PDFs deleted successfully!');
      window.location.reload(); // Reload to reflect the changes
    } catch (error) {
      console.error('Error deleting transactions:', error);
      alert(`Error deleting transactions: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle setting budget
  const handleSetBudget = async () => {
    if (!budgetAmount || budgetAmount <= 0) {
      alert('Please enter a valid budget amount');
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.SET_BUDGET, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          budgetAmount: parseFloat(budgetAmount),
          budgetPeriod: budgetPeriod
        })
      });

      if (response.ok) {
        alert(budget ? 'Budget updated successfully!' : 'Budget set successfully!');
        setShowBudgetForm(false);
        setBudgetAmount('');
        window.location.reload();
      } else {
        const errorData = await response.json();
        alert(`Error setting budget: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error setting budget:', error);
      alert('Error setting budget');
    }
  };

  // Handle opening budget form with current values
  const handleEditBudget = () => {
    if (budget) {
      setBudgetAmount(budget.budgetAmount.toString());
      setBudgetPeriod(budget.budgetPeriod || 'monthly');
    }
    setShowBudgetForm(true);
  };

  return (
    <div className="summary-container">
      <Link to="/dashboard" className="back-button">
        <span className="back-arrow">←</span> Back to Dashboard
      </Link>
      <h1 className="summary-title">💳 Spending Summary</h1>

      <div className="view-buttons">
        <button
          onClick={() => setView("table")}
          className={view === "table" ? "active" : ""}
        >
          📊 Table View
        </button>
        <button
          onClick={() => setView("chart")}
          className={view === "chart" ? "active" : ""}
        >
          📈 Chart View
        </button>
        <button
          onClick={handleDeleteTransactions}
          className="delete-button"
          disabled={isDeleting}
        >
          {isDeleting ? '⏳ Deleting...' : '🗑️ Delete Transactions'}
        </button>
        {/* <button
          onClick={fetchAIAnalytics}
          className={showAIAnalysis ? "active" : ""}
          disabled={loading}
        >
          {loading ? '⏳ Analyzing...' : '🤖 AI Insights'}
        </button> */}
      </div>

      {/* AI Provider Selection */}
      {showAIAnalysis && (
        <div className="ai-provider-selector">
          <label>AI Provider: </label>
          <select 
            value={aiProvider} 
            onChange={(e) => setAiProvider(e.target.value)}
            disabled={loading}
          >
            <option value="auto">Auto (Best Available)</option>
            <option value="claude">Claude (Anthropic)</option>
            <option value="openai">GPT-4 (OpenAI)</option>
          </select>
          <button onClick={fetchAIAnalytics} disabled={loading} className="refresh-btn">
            🔄 Refresh Analysis
          </button>
        </div>
      )}

      {/* Spending Insights Section */}
      {spendingInsights && (
        <div className="smart-dashboard">
          <div className="smart-header">
            <h2>🎯 Smart Spending Insights</h2>
            <p className="smart-subtitle">Understand your spending patterns at a glance</p>
          </div>

          <div className="insights-grid">
            <div className="insight-card highlight">
              <div className="insight-icon">💰</div>
              <div className="insight-content">
                <h3>Average Transaction</h3>
                <p className="insight-value">₹{spendingInsights.avgTransactionCost.toFixed(2)}</p>
                <p className="insight-label">per purchase</p>
              </div>
            </div>

            <div className="insight-card">
              <div className="insight-icon">⏰</div>
              <div className="insight-content">
                <h3>Peak Spending Time</h3>
                <p className="insight-value">{spendingInsights.mostLikelyTime}</p>
                <p className="insight-label">when you spend most</p>
              </div>
            </div>

            <div className="insight-card">
              <div className="insight-icon">📅</div>
              <div className="insight-content">
                <h3>Busiest Day</h3>
                <p className="insight-value">{spendingInsights.mostCommonDay}</p>
                <p className="insight-label">most active day</p>
              </div>
            </div>

            <div className="insight-card">
              <div className="insight-icon">🏪</div>
              <div className="insight-content">
                <h3>Unique Merchants</h3>
                <p className="insight-value">{spendingInsights.uniqueMerchants}</p>
                <p className="insight-label">different stores</p>
              </div>
            </div>

            <div className="insight-card big-transaction">
              <div className="insight-icon">💸</div>
              <div className="insight-content">
                <h3>Biggest Transaction</h3>
                <p className="insight-value">₹{spendingInsights.biggestTransaction.amount.toFixed(2)}</p>
                <p className="insight-label">
                  {spendingInsights.biggestTransaction.merchant}
                  {spendingInsights.biggestTransaction.date && 
                    ` • ${new Date(spendingInsights.biggestTransaction.date).toLocaleDateString()}`
                  }
                </p>
              </div>
            </div>

            <div className="insight-card">
              <div className="insight-icon">📊</div>
              <div className="insight-content">
                <h3>Total Transactions</h3>
                <p className="insight-value">{spendingInsights.totalTransactions}</p>
                <p className="insight-label">this period</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Analysis Dashboard */}
      {showAIAnalysis && aiAnalysis && (
        <div className="ai-analysis-dashboard">
          <div className="ai-header">
            <h2>🤖 AI-Powered Financial Analysis</h2>
            <span className="ai-badge">Powered by AI</span>
          </div>

          {/* Spending Score */}
          {aiAnalysis.spending_score && (
            <div className="spending-score-card">
              <div className="score-circle">
                <div className="score-value">{aiAnalysis.spending_score.score}</div>
                <div className="score-label">Spending Score</div>
              </div>
              <div className="score-explanation">
                <p>{aiAnalysis.spending_score.explanation}</p>
              </div>
            </div>
          )}

          {/* Quick Summary */}
          {aiAnalysis.summary && (
            <div className="quick-summary">
              <h3>📋 Quick Summary</h3>
              <div className="summary-grid">
                <div className="summary-item">
                  <span className="summary-icon">⏰</span>
                  <div>
                    <p className="summary-label">Peak Spending Time</p>
                    <p className="summary-value">{aiAnalysis.summary.peak_spending_time}</p>
                  </div>
                </div>
                <div className="summary-item">
                  <span className="summary-icon">📅</span>
                  <div>
                    <p className="summary-label">Peak Spending Day</p>
                    <p className="summary-value">{aiAnalysis.summary.peak_spending_day}</p>
                  </div>
                </div>
                <div className="summary-item">
                  <span className="summary-icon">🏪</span>
                  <div>
                    <p className="summary-label">Most Frequent Merchant</p>
                    <p className="summary-value">{aiAnalysis.summary.most_frequent_merchant}</p>
                  </div>
                </div>
                <div className="summary-item alert">
                  <span className="summary-icon">⚠️</span>
                  <div>
                    <p className="summary-label">Biggest Concern</p>
                    <p className="summary-value">{aiAnalysis.summary.biggest_concern}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI Insights */}
          <div className="ai-insights-section">
            <h3>💡 Key Insights from AI</h3>
            <div className="insights-grid">
              {aiAnalysis.insights && aiAnalysis.insights.map((insight, idx) => (
                <div key={idx} className="insight-card">
                  <div className="insight-number">{idx + 1}</div>
                  <p className="insight-text">{insight}</p>
                </div>
              ))}
            </div>
          </div>

          {/* AI Recommendations */}
          <div className="ai-recommendations-section">
            <h3>✨ Personalized Recommendations</h3>
            <div className="recommendations-grid">
              {aiAnalysis.recommendations && aiAnalysis.recommendations.map((rec, idx) => (
                <div key={idx} className="recommendation-card">
                  <div className="rec-icon">💡</div>
                  <p className="rec-text">{rec}</p>
                  <button className="action-btn">Take Action</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="summary-card">
        {/* Budget Status Section */}
        <div className="budget-section">
          <h2>💰 Budget Status</h2>
          {budget && budgetStatus ? (
            <div className="budget-status">
              <p className={`budget-message ${budgetStatus.status}`}>
                {budgetStatus.message}
              </p>
              <div className="budget-details">
                <p>Total Spent: ₹{budgetStatus.totalSpending}</p>
                <p>Budget Limit: ₹{budgetStatus.budgetAmount}</p>
                <p>Difference: ₹{budgetStatus.difference}
                  {budgetStatus.status === 'over_budget' ? ' over' : ' remaining'}
                </p>
                <p>Percentage Used: {budgetStatus.percentage}%</p>
              </div>
              <button onClick={handleEditBudget} className="edit-budget-btn">
                Edit Budget
              </button>
            </div>
          ) : (
            <div className="no-budget">
              <p>No budget set yet</p>
              <button onClick={() => setShowBudgetForm(true)} className="set-budget-btn">
                Set Budget
              </button>
            </div>
          )}
        </div>

        {/* Budget Form */}
        {showBudgetForm && (
          <div className="budget-form">
            <h3>{budget ? 'Update Your Budget' : 'Set Your Budget'}</h3>
            <div className="form-group">
              <label>Budget Amount (₹):</label>
              <input
                type="number"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                placeholder="Enter budget amount"
                min="1"
              />
            </div>
            <div className="form-group">
              <label>Budget Period:</label>
              <select
                value={budgetPeriod}
                onChange={(e) => setBudgetPeriod(e.target.value)}
              >
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div className="form-actions">
              <button onClick={handleSetBudget} className="save-budget-btn">
                {budget ? 'Update Budget' : 'Save Budget'}
              </button>
              <button onClick={() => {
                setShowBudgetForm(false);
                setBudgetAmount('');
                setBudgetPeriod('monthly');
              }} className="cancel-btn">
                Cancel
              </button>
            </div>
          </div>
        )}

        {transactions && transactions.length === 0 ? (
          <p className="no-transactions-message">No transactions to display.</p>
        ) : view === "table" ? (
          <table className="summary-table">
            <thead>
              <tr>
                <th>Recipient</th>
                <th>Total Spent</th>
                <th>Transactions</th>
                <th>Date</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, i) => (
                <tr key={i}>
                  <td>{tx.name}</td>
                  <td>₹{(Number(tx.total) || 0)}</td>
                  <td>{(Number(tx.count) || 0)}</td>
                  <td>{tx.date ? new Date(tx.date).toLocaleDateString() : 'N/A'}</td>
                  <td>{tx.time || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Grand Total</td>
                <td>₹{transactions.reduce((acc, tx) => acc + (Number(tx.total) || 0), 0)}</td>
                <td>{transactions.reduce((acc, tx) => acc + (Number(tx.count) || 0), 0)}</td>
                <td colSpan="2"></td>
              </tr>
            </tfoot>
          </table>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={transactions}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="#007bff" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}