// API Configuration
// This file centralizes all API endpoints and configuration

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export const API_ENDPOINTS = {
  AUTH: `${API_BASE_URL}/auth/google`,
  TRANSACTIONS: `${API_BASE_URL}/api/transactions`,
  UPLOAD_PDF: `${API_BASE_URL}/api/upload-pdf`,
  FRIENDS_REQUESTS: `${API_BASE_URL}/api/friends/requests`,
  FRIENDS_SEND_REQUEST: `${API_BASE_URL}/api/friends/send-request`,
  FRIENDS_ACCEPT: `${API_BASE_URL}/api/friends/accept`,
  FRIENDS_IGNORE: `${API_BASE_URL}/api/friends/ignore`,
  LEADERBOARD: `${API_BASE_URL}/api/leaderboard`,
  BUDGET: `${API_BASE_URL}/api/budget`,
  BUDGET_STATUS: `${API_BASE_URL}/api/budget-status`,
  SET_BUDGET: `${API_BASE_URL}/api/set-budget`,
  DELETE_TRANSACTIONS: `${API_BASE_URL}/api/delete-transactions`,
  AI_ANALYTICS: `${API_BASE_URL}/api/ai-analytics`,
};

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '187428957013-97eqd6kdb9tol67u9ddmpf535b18nv7m.apps.googleusercontent.com';

export default {
  API_BASE_URL,
  API_ENDPOINTS,
  GOOGLE_CLIENT_ID,
};

