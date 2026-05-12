// APIStorageManager - Replaces localStorage-based StorageManager
// All data now comes from the backend API instead of local storage

let tokenCache = null;
let currentUserCache = null;

const APIStorageManager = {
  // API configuration (not used in Electron - uses IPC instead)
  baseURL: 'http://localhost:5000',
  
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
    // Fallback: persist token in localStorage so reloads keep the session when safeStorage isn't available
    try {
      localStorage.setItem('ris_jwt_token', token);
    } catch (e) {
      // ignore
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
    // Fallback: try localStorage
    try {
      const t = localStorage.getItem('ris_jwt_token');
      if (t) {
        tokenCache = t;
        return t;
      }
    } catch (e) {
      // ignore
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
    try {
      localStorage.removeItem('ris_jwt_token');
    } catch (e) {
      // ignore
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
        const res = await window.__PRELOAD__.api.request(method, endpoint, body, token);
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
      if (result.error) {
        throw new Error(result.error);
      }
      if (!result.user) {
        throw new Error('No user returned from server');
      }
      if (!result.user.id) {
        console.warn('User object missing id:', result.user);
        throw new Error('User record is invalid (missing ID)');
      }
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

  // Get ALL requests (admin only)
  getAdminRequests: async () => {
    try {
      const result = await APIStorageManager.get('/api/requests/admin');
      console.log('[getAdminRequests] Fetched admin requests:', Array.isArray(result) ? result.length : 0, 'requests');
      return result || [];
    } catch (err) {
      console.error('Failed to fetch admin requests:', err);
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
      const res = await APIStorageManager.post('/api/requests', requestData);
      try { window.dispatchEvent(new CustomEvent('ris:dataChanged')); } catch(e) {}
      return res;
    } catch (err) {
      throw err;
    }
  },

  // Update request items (admin)
  updateRequest: async (requestId, updateData) => {
    try {
      const res = await APIStorageManager.put(`/api/requests/${requestId}`, updateData);
      try { window.dispatchEvent(new CustomEvent('ris:dataChanged')); } catch(e) {}
      return res;
    } catch (err) {
      throw err;
    }
  },

  // Approve request (admin)
  approveRequest: async (requestId) => {
    try {
      const res = await APIStorageManager.post(`/api/requests/${requestId}/approve`, {});
      try { window.dispatchEvent(new CustomEvent('ris:dataChanged')); } catch(e) {}
      return res;
    } catch (err) {
      throw err;
    }
  },

  // Reject request (admin)
  rejectRequest: async (requestId) => {
    try {
      const res = await APIStorageManager.post(`/api/requests/${requestId}/reject`, {});
      try { window.dispatchEvent(new CustomEvent('ris:dataChanged')); } catch(e) {}
      return res;
    } catch (err) {
      throw err;
    }
  },

  // Mark request as released (admin)
  markReleased: async (requestId) => {
    try {
      const res = await APIStorageManager.post(`/api/requests/${requestId}/mark-released`, {});
      try { window.dispatchEvent(new CustomEvent('ris:dataChanged')); } catch(e) {}
      return res;
    } catch (err) {
      throw err;
    }
  },

  // Update issued items (admin)
  updateIssuedItems: async (requestId, issuedItems) => {
    try {
      const res = await APIStorageManager.post(`/api/requests/${requestId}/issued-items`, { issuedItems });
      try { window.dispatchEvent(new CustomEvent('ris:dataChanged')); } catch(e) {}
      return res;
    } catch (err) {
      throw err;
    }
  },

  // ============= INVENTORY =============
  getInventory: async () => {
    try {
      const rows = await APIStorageManager.get('/api/inventory');
      console.log(`[getInventory] Received ${Array.isArray(rows) ? rows.length : 0} items from API`);
      if (Array.isArray(rows)) {
        const result = rows.reduce((acc, row) => {
          // API returns camelCase field names (itemId, not item_id)
          const itemId = parseInt(row.itemId) || row.itemId;
          acc[itemId] = row.quantity;
          return acc;
        }, {});
        console.log(`[getInventory] Normalized inventory with ${Object.keys(result).length} keys. Sample:`, Object.keys(result).slice(0, 10).map(k => `${k}:${result[k]}`).join(', '));
        return result;
      }
      console.log(`[getInventory] Response is not an array:`, rows);
      return rows || {};
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
      const res = await APIStorageManager.post('/api/inventory/restock', {
        itemId,
        quantity,
        notes,
      });
      try { window.dispatchEvent(new CustomEvent('ris:dataChanged')); } catch(e) {}
      return res;
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
