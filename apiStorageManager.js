// APIStorageManager - Replaces localStorage-based StorageManager
// All data now comes from the backend API instead of local storage

let tokenCache = null;
let currentUserCache = null;

const APIStorageManager = {
  // API configuration
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  
  // Set API URL (call this before login)
  setBaseURL: (url) => {
    APIStorageManager.baseURL = url;
  },

  // ============= TOKEN MANAGEMENT =============
  setToken: async (token) => {
    tokenCache = token;
    // In Electron, tokens are stored securely via safeStorage (see preload.js)
    if (window.__PRELOAD__ && window.__PRELOAD__.safeStorage) {
      try {
        await window.__PRELOAD__.safeStorage.safeStorageSetString('ris_jwt_token', token);
      } catch (err) {
        console.warn('Failed to store token securely:', err);
      }
    }
  },

  getToken: async () => {
    if (tokenCache) return tokenCache;
    
    if (window.__PRELOAD__ && window.__PRELOAD__.safeStorage) {
      try {
        const token = await window.__PRELOAD__.safeStorage.safeStorageGetString('ris_jwt_token');
        if (token) {
          tokenCache = token;
          return token;
        }
      } catch (err) {
        console.warn('Failed to retrieve token:', err);
      }
    }
    return null;
  },

  clearToken: async () => {
    tokenCache = null;
    if (window.__PRELOAD__ && window.__PRELOAD__.safeStorage) {
      try {
        await window.__PRELOAD__.safeStorage.safeStorageClear('ris_jwt_token');
      } catch (err) {
        console.warn('Failed to clear token:', err);
      }
    }
  },

  setCurrentUser: (user) => {
    currentUserCache = user;
  },

  getCurrentUser: () => currentUserCache,

  // ============= HTTP HELPERS =============
  async request(method, endpoint, body = null) {
    const token = await APIStorageManager.getToken();
    try {
      // Use IPC-based local API exposed by preload.js
      if (window.__PRELOAD__ && window.__PRELOAD__.api && window.__PRELOAD__.api.request) {
        const res = await window.__PRELOAD__.api.request(method, endpoint, body);
        // Maintain session handling behaviour
        if (res && res.error && res.error.toLowerCase().includes('unauthorized')) {
          await APIStorageManager.clearToken();
          currentUserCache = null;
          throw new Error('Session expired. Please login again.');
        }
        return res;
      }
      throw new Error('Local API not available');
    } catch (err) {
      console.error(`API [${method} ${endpoint}]:`, err.message);
      throw err;
    }
  },

  get: (endpoint) => APIStorageManager.request('GET', endpoint),
  post: (endpoint, body) => APIStorageManager.request('POST', endpoint, body),
  put: (endpoint, body) => APIStorageManager.request('PUT', endpoint, body),

  // ============= AUTHENTICATION =============
  // Login with email/password (returns user + token)
  login: async (email, password) => {
    try {
      const result = await APIStorageManager.post('/auth/login', { email, password });
      await APIStorageManager.setToken(result.token);
      APIStorageManager.setCurrentUser(result.user);
      APIStorageManager.setRememberedUserId(result.user.id);
      return result.user;
    } catch (err) {
      throw err;
    }
  },

  logout: async () => {
    try {
      await APIStorageManager.post('/auth/logout', {});
    } catch (err) {
      console.warn('Logout API error:', err);
    }
    await APIStorageManager.clearToken();
    APIStorageManager.clearRememberedUserId();
    currentUserCache = null;
  },

  // ============= USER MANAGEMENT =============
  setRememberedUserId: (userId) => {
    localStorage.setItem('ris_remembered_user_id', String(userId));
  },

  getRememberedUserId: () => {
    const stored = localStorage.getItem('ris_remembered_user_id');
    return stored ? parseInt(stored) : null;
  },

  clearRememberedUserId: () => {
    localStorage.removeItem('ris_remembered_user_id');
  },

  // Get all users (admin only)
  getUsers: async () => {
    try {
      return await APIStorageManager.get('/api/users');
    } catch (err) {
      console.error('Failed to fetch users:', err);
      return [];
    }
  },

  // Get current user details
  getCurrentUserDetails: async () => {
    try {
      return await APIStorageManager.get('/api/users/me');
    } catch (err) {
      console.error('Failed to fetch current user:', err);
      return null;
    }
  },

  // ============= REQUESTS (RIS) =============
  getRequests: async (department = null) => {
    try {
      let endpoint = '/api/requests';
      if (department) {
        endpoint += `?department=${encodeURIComponent(department)}`;
      }
      const result = await APIStorageManager.get(endpoint);
      return result || [];
    } catch (err) {
      console.error('Failed to fetch requests:', err);
      return [];
    }
  },

  getSingleRequest: async (requestId) => {
    try {
      return await APIStorageManager.get(`/api/requests/${requestId}`);
    } catch (err) {
      console.error('Failed to fetch request:', err);
      return null;
    }
  },

  // Create new RIS request
  createRequest: async (requestData) => {
    try {
      return await APIStorageManager.post('/api/requests', requestData);
    } catch (err) {
      throw err;
    }
  },

  // Update request items (admin)
  updateRequest: async (requestId, updateData) => {
    try {
      return await APIStorageManager.put(`/api/requests/${requestId}`, updateData);
    } catch (err) {
      throw err;
    }
  },

  // Approve request (admin)
  approveRequest: async (requestId) => {
    try {
      return await APIStorageManager.post(`/api/requests/${requestId}/approve`, {});
    } catch (err) {
      throw err;
    }
  },

  // Reject request (admin)
  rejectRequest: async (requestId) => {
    try {
      return await APIStorageManager.post(`/api/requests/${requestId}/reject`, {});
    } catch (err) {
      throw err;
    }
  },

  // Mark request as released (admin)
  markReleased: async (requestId) => {
    try {
      return await APIStorageManager.post(`/api/requests/${requestId}/mark-released`, {});
    } catch (err) {
      throw err;
    }
  },

  // Update issued items (admin)
  updateIssuedItems: async (requestId, issuedItems) => {
    try {
      return await APIStorageManager.post(`/api/requests/${requestId}/issued-items`, { issuedItems });
    } catch (err) {
      throw err;
    }
  },

  // ============= INVENTORY =============
  getInventory: async () => {
    try {
      return await APIStorageManager.get('/api/inventory');
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
      return {};
    }
  },

  getInventoryItems: async () => {
    try {
      return await APIStorageManager.get('/api/inventory/items');
    } catch (err) {
      console.error('Failed to fetch inventory items:', err);
      return [];
    }
  },

  // Restock item (admin)
  restockItem: async (itemId, quantity, notes = '') => {
    try {
      return await APIStorageManager.post('/api/inventory/restock', {
        itemId,
        quantity,
        notes,
      });
    } catch (err) {
      throw err;
    }
  },

  // Get stock history (admin)
  getStockHistory: async () => {
    try {
      return await APIStorageManager.get('/api/inventory/history');
    } catch (err) {
      console.error('Failed to fetch stock history:', err);
      return [];
    }
  },

  // ============= DEPARTMENTS =============
  getDepartments: async () => {
    try {
      return await APIStorageManager.get('/api/departments');
    } catch (err) {
      console.error('Failed to fetch departments:', err);
      return [];
    }
  },

  // ============= INITIALIZATION =============
  // Initialize app - check for remembered user and validate token
  initializeDefaults: async (apiURL = null) => {
    if (apiURL) {
      APIStorageManager.setBaseURL(apiURL);
    }

    try {
      const rememberedUserId = APIStorageManager.getRememberedUserId();
      if (rememberedUserId) {
        const token = await APIStorageManager.getToken();
        if (token) {
          try {
            // Try to get current user
            const user = await APIStorageManager.getCurrentUserDetails();
            if (user && user.id === rememberedUserId) {
              APIStorageManager.setCurrentUser(user);
              return { success: true, user };
            }
          } catch (err) {
            // Token expired, clear it
            await APIStorageManager.clearToken();
            APIStorageManager.clearRememberedUserId();
          }
        }
      }
      return { success: false };
    } catch (err) {
      console.error('Initialization error:', err);
      return { success: false };
    }
  },
};

// Export for use in app.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = APIStorageManager;
}
