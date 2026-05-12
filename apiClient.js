// API Client for RIS Manager with secure JWT token storage
// This module handles all HTTP requests and token management for Electron

let tokenCache = null; // In-memory cache for the session

// Initialize token storage in Electron
let safeStorage = null;
try {
  if (typeof window !== 'undefined' && window.__PRELOAD__) {
    safeStorage = window.__PRELOAD__.safeStorage;
  }
} catch (e) {
  console.warn('safeStorage not available, using in-memory token storage');
}

const APIClient = {
  baseURL: 'http://localhost:5000',
  tokenKey: 'ris_jwt_token',
  userKey: 'ris_current_user',

  // Set API base URL (e.g., from config)
  setBaseURL: (url) => {
    APIClient.baseURL = url;
  },

  // Store token securely
  setToken: async (token) => {
    tokenCache = token;
    if (safeStorage) {
      try {
        await safeStorage.safeStorageSetString(APIClient.tokenKey, token);
      } catch (err) {
        console.warn('Failed to store token securely, using in-memory:', err);
      }
    }
  },

  // Retrieve token from secure storage or cache
  getToken: async () => {
    if (tokenCache) return tokenCache;
    
    if (safeStorage) {
      try {
        const token = await safeStorage.safeStorageGetString(APIClient.tokenKey);
        if (token) {
          tokenCache = token;
          return token;
        }
      } catch (err) {
        console.warn('Failed to retrieve token from secure storage:', err);
      }
    }
    
    return null;
  },

  // Clear token
  clearToken: async () => {
    tokenCache = null;
    if (safeStorage) {
      try {
        await safeStorage.safeStorageClear(APIClient.tokenKey);
      } catch (err) {
        console.warn('Failed to clear token:', err);
      }
    }
  },

  // Store user info in memory
  setUser: (user) => {
    if (typeof window !== 'undefined') {
      window.__ris_current_user = user;
    }
  },

  // Get current user
  getUser: () => {
    if (typeof window !== 'undefined') {
      return window.__ris_current_user || null;
    }
    return null;
  },

  // Generic HTTP request with token injection
  request: async (method, endpoint, body = null) => {
    const token = await APIClient.getToken();
    const url = `${APIClient.baseURL}${endpoint}`;

    const headers = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);

      // Handle 401 (token expired)
      if (response.status === 401) {
        await APIClient.clearToken();
        throw new Error('Session expired. Please login again.');
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.error(`API request failed [${method} ${endpoint}]:`, err);
      throw err;
    }
  },

  // Shorthand methods
  get: (endpoint) => APIClient.request('GET', endpoint),
  post: (endpoint, body) => APIClient.request('POST', endpoint, body),
  put: (endpoint, body) => APIClient.request('PUT', endpoint, body),
  delete: (endpoint) => APIClient.request('DELETE', endpoint),
};

// Export for use in app.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = APIClient;
}
