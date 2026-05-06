const { app, BrowserWindow, ipcMain, safeStorage, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');
const { autoUpdater } = require('electron-updater');
const crypto = require('crypto');

// ============================================================
// 🔒 LICENSE EXPIRY CHECK — Business subscription model
const EXPIRY_DATE = new Date('2026-06-06T13:00:00'); // Set your desired expiry date here
let isLicenseValid = true;
// ============================================================

// Store DB under app userData so uninstall can remove app data.
let dbPath = '';

function resolveDatabasePath() {
  const userDataDir = app.getPath('userData');
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }

  const localDbPath = path.join(userDataDir, 'data.db');

  // One-time migration from previous ProgramData location to preserve existing data on update.
  const oldProgramDataPath = path.join(process.env['ProgramData'] || path.join('C:', 'ProgramData'), 'RIS Manager', 'data.db');
  if (!fs.existsSync(localDbPath) && fs.existsSync(oldProgramDataPath)) {
    try {
      fs.copyFileSync(oldProgramDataPath, localDbPath);
      console.log('Migrated database from ProgramData to userData');
    } catch (err) {
      console.warn('Failed to migrate old ProgramData database:', err.message);
    }
  }

  return localDbPath;
}

let db = null;
let dbReady = false;

// Initialize sql.js and load/create database
async function initializeDatabase() {
  try {
    dbPath = resolveDatabasePath();
    const SQL = await initSqlJs();
    
    // Try to load existing database from file
    let dbData = null;
    if (fs.existsSync(dbPath)) {
      dbData = fs.readFileSync(dbPath);
    }
    
    // Create or load database
    db = dbData ? new SQL.Database(dbData) : new SQL.Database();
    
    // Initialize schema
    const schema = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        department TEXT NOT NULL,
        designation TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS ris_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        control_number INTEGER NOT NULL,
        ris_number INTEGER,
        department TEXT NOT NULL,
        request_type TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        stocks_available INTEGER,
        request_date DATE NOT NULL,
        request_year INTEGER NOT NULL,
        requester_name TEXT,
        requester_designation TEXT,
        requester_date DATE,
        approver_name TEXT,
        approver_designation TEXT,
        approver_date DATE,
        issued_date DATE,
        received_date DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS request_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(request_id) REFERENCES ris_requests(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS issued_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(request_id) REFERENCES ris_requests(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER UNIQUE,
        item_name TEXT NOT NULL,
        stock_number TEXT UNIQUE NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS stock_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER NOT NULL,
        item_name TEXT,
        quantity INTEGER NOT NULL,
        action TEXT NOT NULL,
        previous_stock INTEGER,
        new_stock INTEGER,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS departments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        acronym TEXT
      );
    `;
    
    db.run(schema);
    
    // Persist database to file
    saveDatabase();
    
    dbReady = true;
    console.log('Database initialized at', dbPath);
  } catch (err) {
    console.error('Failed to initialize database:', err);
    throw err;
  }
}

// Save database to file
function saveDatabase() {
  if (db) {
    try {
      const data = db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbPath, buffer);
    } catch (err) {
      console.error('Error saving database:', err);
    }
  }
}

// ----------------------------
// Check if license/app is expired
// ----------------------------
function checkExpiry() {
  const now = new Date();
  if (now >= EXPIRY_DATE) {
    isLicenseValid = false;
  }
}

// ----------------------------
// Continuously watch expiry while app is running
// ----------------------------
function startExpiryWatcher() {
  setInterval(() => {
    checkExpiry();
    if (!isLicenseValid) {
      const focused = BrowserWindow.getFocusedWindow();
      if (focused) {
        dialog.showErrorBox(
          'License Expired',
          'Your subscription has ended. Please contact the developer for license renewal.'
        );
      }
      app.quit();
    }
  }, 60 * 1000); // Check every 1 minute
}

// -- Electron window and IPC + safeStorage handlers --
function createWindow() {
  const preloadPath = path.join(__dirname, 'preload.js');
  const webPreferences = {
    preload: preloadPath,
    nodeIntegration: false,
    contextIsolation: true,
  };

  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences
  });

  mainWindow.loadFile('Index.html');
  mainWindow.webDevTools = false;

  // check for updates after window is ready
  setTimeout(() => {
    try { autoUpdater.checkForUpdates(); } catch (e) { console.warn('autoUpdater error', e); }
  }, 2000);
}

// Safe storage IPC handlers
ipcMain.handle('safe-storage-set', (event, key, value) => {
  try {
    const encrypted = safeStorage.encryptString(value);
    const storePath = path.join(app.getPath('userData'), '.ris-storage');
    if (!fs.existsSync(storePath)) {
      fs.mkdirSync(storePath, { recursive: true });
    }
    fs.writeFileSync(path.join(storePath, `${key}.enc`), encrypted);
    return true;
  } catch (err) {
    console.error('Safe storage set error:', err);
    throw err;
  }
});

ipcMain.handle('safe-storage-get', (event, key) => {
  try {
    const storePath = path.join(app.getPath('userData'), '.ris-storage');
    const filePath = path.join(storePath, `${key}.enc`);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const encrypted = fs.readFileSync(filePath);
    return safeStorage.decryptString(encrypted);
  } catch (err) {
    console.error('Safe storage get error:', err);
    return null;
  }
});

ipcMain.handle('safe-storage-clear', (event, key) => {
  try {
    const storePath = path.join(app.getPath('userData'), '.ris-storage');
    const filePath = path.join(storePath, `${key}.enc`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return true;
  } catch (err) {
    console.error('Safe storage clear error:', err);
    throw err;
  }
});

// Simple token handling: token === `user-{id}`
function userIdFromToken(token) {
  if (!token) return null;
  if (typeof token !== 'string') return null;
  if (!token.startsWith('user-')) return null;
  const id = parseInt(token.split('-')[1], 10);
  return Number.isNaN(id) ? null : id;
}

// Helper to convert sql.js results to objects
function execToObjects(sql, params = []) {
  if (!db) return [];
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

// Helper to get request with items (request_items)
function getRequestWithItems(requestId) {
  const request = execToObjects('SELECT * FROM ris_requests WHERE id = ?', [requestId]);
  if (!request.length) return null;
  const req = request[0];
  const items = execToObjects('SELECT * FROM request_items WHERE request_id = ?', [requestId]);
  req.items = items;
  return req;
}

// Helper to get request with issued items
function getRequestWithIssuedItems(requestId) {
  const request = execToObjects('SELECT * FROM ris_requests WHERE id = ?', [requestId]);
  if (!request.length) return null;
  const req = request[0];
  const items = execToObjects('SELECT * FROM issued_items WHERE request_id = ?', [requestId]);
  req.issuedItems = items;
  return req;
}

// Helper to get inventory for item
function getInventoryForItem(itemId) {
  const inv = execToObjects('SELECT * FROM inventory WHERE item_id = ?', [itemId]);
  return inv.length ? inv[0] : null;
}

// Helper to create/update inventory record
function ensureInventoryRecord(itemId, itemName, stockNumber) {
  const existing = getInventoryForItem(itemId);
  if (existing) return existing;
  
  db.run(
    'INSERT INTO inventory (item_id, item_name, stock_number, quantity) VALUES (?, ?, ?, ?)',
    [itemId, itemName, stockNumber, 0]
  );
  saveDatabase();
  return getInventoryForItem(itemId);
}

// Helper to log stock history
function logStockHistory(itemId, itemName, quantity, action, previousStock, newStock, notes) {
  db.run(
    'INSERT INTO stock_history (item_id, item_name, quantity, action, previous_stock, new_stock, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [itemId, itemName, quantity, action, previousStock, newStock, notes, new Date().toISOString()]
  );
  saveDatabase();
}

// Expose a lightweight API over IPC to replace the previous Express backend
ipcMain.handle('api-request', (event, { method, endpoint, body, token }) => {
  try {
    // License check: block all API calls if expired
    if (!isLicenseValid) {
      return { error: 'License has expired. Please contact the developer.' };
    }
    if (!dbReady) return { error: 'Database not ready' };
    
    method = (method || 'GET').toUpperCase();
    
    // Auth: POST /auth/login
    if (method === 'POST' && endpoint === '/auth/login') {
      const { email, password } = body || {};
      if (!email || !password) return { error: 'Missing credentials' };
      const users = execToObjects('SELECT * FROM users WHERE email = ?', [email]);
      if (!users.length) return { error: 'Invalid credentials' };
      const user = users[0];
      const hash = crypto.createHash('sha256').update(password).digest('hex');
      if (hash !== user.password_hash) return { error: 'Invalid credentials' };
      const tok = `user-${user.id}`;
      delete user.password_hash;
      return { user, token: tok };
    }

    // Departments: GET /api/departments
    if (method === 'GET' && endpoint === '/api/departments') {
      const rows = execToObjects('SELECT id, name, acronym FROM departments');
      return rows;
    }

    // Users: GET /api/users (admin) or GET /api/users/me
    if (method === 'GET' && endpoint === '/api/users') {
      const uid = userIdFromToken(token);
      if (!uid) return { error: 'Unauthorized' };
      const requesting = execToObjects('SELECT * FROM users WHERE id = ?', [uid]);
      if (!requesting.length) return { error: 'Unauthorized' };
      if (requesting[0].role === 'admin') {
        const rows = execToObjects('SELECT id, name, email, role, department, designation, created_at FROM users');
        return rows;
      }
      return { error: 'Forbidden' };
    }

    if (method === 'GET' && endpoint === '/api/users/me') {
      const uid = userIdFromToken(token);
      if (!uid) return { error: 'Unauthorized' };
      const users = execToObjects('SELECT id, name, email, role, department, designation, created_at FROM users WHERE id = ?', [uid]);
      return users.length ? users[0] : { error: 'Not found' };
    }

    // Inventory: GET /api/inventory, GET /api/inventory/items
    if (method === 'GET' && endpoint === '/api/inventory') {
      const rows = execToObjects('SELECT * FROM inventory');
      return rows;
    }

    if (method === 'GET' && endpoint === '/api/inventory/items') {
      const rows = execToObjects('SELECT * FROM inventory');
      return rows;
    }

    // Inventory: POST /api/inventory/restock
    if (method === 'POST' && endpoint === '/api/inventory/restock') {
      const uid = userIdFromToken(token);
      if (!uid) return { error: 'Unauthorized' };
      const requesting = execToObjects('SELECT * FROM users WHERE id = ?', [uid]);
      if (!requesting.length || requesting[0].role !== 'admin') return { error: 'Forbidden' };
      
      const { itemId, quantity, notes } = body || {};
      const inventory = getInventoryForItem(itemId);
      if (!inventory) return { error: 'Inventory record not found' };
      
      const previousStock = inventory.quantity;
      const newStock = previousStock + quantity;
      
      db.run('UPDATE inventory SET quantity = ?, updated_at = ? WHERE item_id = ?', [newStock, new Date().toISOString(), itemId]);
      logStockHistory(itemId, inventory.item_name, quantity, 'restock', previousStock, newStock, notes);
      saveDatabase();
      
      return getInventoryForItem(itemId);
    }

    // Inventory: GET /api/inventory/history
    if (method === 'GET' && endpoint === '/api/inventory/history') {
      const rows = execToObjects('SELECT * FROM stock_history ORDER BY created_at DESC');
      return rows;
    }

    // Requests: GET /api/requests (user's requests), GET /api/requests/admin (all requests for admin)
    if (method === 'GET' && endpoint === '/api/requests') {
      const uid = userIdFromToken(token);
      if (!uid) return { error: 'Unauthorized' };
      const rows = execToObjects('SELECT * FROM ris_requests WHERE user_id = ? ORDER BY id DESC', [uid]);
      return rows.map(req => {
        const items = execToObjects('SELECT * FROM request_items WHERE request_id = ?', [req.id]);
        const issuedItems = execToObjects('SELECT * FROM issued_items WHERE request_id = ?', [req.id]);
        return { ...req, items, issuedItems };
      });
    }

    if (method === 'GET' && endpoint === '/api/requests/admin') {
      const uid = userIdFromToken(token);
      if (!uid) return { error: 'Unauthorized' };
      const requesting = execToObjects('SELECT * FROM users WHERE id = ?', [uid]);
      if (!requesting.length || requesting[0].role !== 'admin') return { error: 'Forbidden' };
      
      const rows = execToObjects('SELECT * FROM ris_requests ORDER BY id DESC');
      return rows.map(req => {
        const items = execToObjects('SELECT * FROM request_items WHERE request_id = ?', [req.id]);
        const issuedItems = execToObjects('SELECT * FROM issued_items WHERE request_id = ?', [req.id]);
        const user = execToObjects('SELECT id, name, email, department FROM users WHERE id = ?', [req.user_id]);
        return { ...req, items, issuedItems, user: user.length ? user[0] : null };
      });
    }

    // Requests: POST /api/requests
    if (method === 'POST' && endpoint === '/api/requests') {
      const uid = userIdFromToken(token);
      if (!uid) return { error: 'Unauthorized' };
      const data = body || {};
      db.run(
        'INSERT INTO ris_requests (user_id, control_number, department, request_type, description, request_date, request_year, requester_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [uid, data.control_number || 0, data.department || '', data.request_type || '', data.description || '', data.request_date || new Date().toISOString().slice(0,10), data.request_year || new Date().getFullYear(), data.requester_name || '']
      );
      saveDatabase();
      const created = execToObjects('SELECT * FROM ris_requests WHERE user_id = ? ORDER BY id DESC LIMIT 1', [uid]);
      return created.length ? created[0] : { error: 'Failed to create' };
    }

    // Request Items: POST /api/requests/:id/items, GET /api/requests/:id/items
    const requestItemsMatch = endpoint.match(/^\/api\/requests\/(\d+)\/items$/);
    if (requestItemsMatch) {
      const requestId = parseInt(requestItemsMatch[1]);
      
      if (method === 'GET') {
        const items = execToObjects('SELECT * FROM request_items WHERE request_id = ?', [requestId]);
        return items;
      }
      
      if (method === 'POST') {
        const uid = userIdFromToken(token);
        if (!uid) return { error: 'Unauthorized' };
        const { items } = body || {};
        
        // Delete existing items
        db.run('DELETE FROM request_items WHERE request_id = ?', [requestId]);
        
        // Insert new items
        if (items && Array.isArray(items)) {
          items.forEach(item => {
            db.run('INSERT INTO request_items (request_id, item_id, quantity) VALUES (?, ?, ?)', [requestId, item.itemId, item.quantity]);
          });
        }
        saveDatabase();
        
        const updated = execToObjects('SELECT * FROM request_items WHERE request_id = ?', [requestId]);
        return updated;
      }
    }

    // Issued Items: POST /api/requests/:id/issued-items, GET /api/requests/:id/issued-items
    const issuedItemsMatch = endpoint.match(/^\/api\/requests\/(\d+)\/issued-items$/);
    if (issuedItemsMatch) {
      const requestId = parseInt(issuedItemsMatch[1]);
      
      if (method === 'GET') {
        const items = execToObjects('SELECT * FROM issued_items WHERE request_id = ?', [requestId]);
        return items;
      }
      
      if (method === 'POST') {
        const uid = userIdFromToken(token);
        if (!uid) return { error: 'Unauthorized' };
        const requesting = execToObjects('SELECT * FROM users WHERE id = ?', [uid]);
        if (!requesting.length || requesting[0].role !== 'admin') return { error: 'Forbidden' };
        
        const { issuedItems } = body || {};
        
        // Delete existing issued items
        db.run('DELETE FROM issued_items WHERE request_id = ?', [requestId]);
        
        // Insert new issued items
        if (issuedItems && Array.isArray(issuedItems)) {
          issuedItems.forEach(item => {
            db.run('INSERT INTO issued_items (request_id, item_id, quantity) VALUES (?, ?, ?)', [requestId, item.itemId, item.quantity]);
          });
        }
        saveDatabase();
        
        const updated = execToObjects('SELECT * FROM issued_items WHERE request_id = ?', [requestId]);
        return updated;
      }
    }

    // Approve Request: POST /api/requests/:id/approve
    const approveMatch = endpoint.match(/^\/api\/requests\/(\d+)\/approve$/);
    if (method === 'POST' && approveMatch) {
      const requestId = parseInt(approveMatch[1]);
      const uid = userIdFromToken(token);
      if (!uid) return { error: 'Unauthorized' };
      const requesting = execToObjects('SELECT * FROM users WHERE id = ?', [uid]);
      if (!requesting.length || requesting[0].role !== 'admin') return { error: 'Forbidden' };
      
      // Assign RIS number (use current max + 1)
      const maxRis = execToObjects('SELECT MAX(ris_number) as max FROM ris_requests WHERE ris_number IS NOT NULL');
      const nextRis = (maxRis[0]?.max || 0) + 1;
      
      db.run('UPDATE ris_requests SET status = ?, ris_number = ?, approver_name = ?, approver_date = ? WHERE id = ?',
        ['approved', nextRis, requesting[0].name, new Date().toISOString().slice(0,10), requestId]
      );
      saveDatabase();
      
      return getRequestWithItems(requestId);
    }

    // Reject Request: POST /api/requests/:id/reject
    const rejectMatch = endpoint.match(/^\/api\/requests\/(\d+)\/reject$/);
    if (method === 'POST' && rejectMatch) {
      const requestId = parseInt(rejectMatch[1]);
      const uid = userIdFromToken(token);
      if (!uid) return { error: 'Unauthorized' };
      const requesting = execToObjects('SELECT * FROM users WHERE id = ?', [uid]);
      if (!requesting.length || requesting[0].role !== 'admin') return { error: 'Forbidden' };
      
      db.run('UPDATE ris_requests SET status = ? WHERE id = ?', ['rejected', requestId]);
      saveDatabase();
      
      return getRequestWithItems(requestId);
    }

    // Mark Released: POST /api/requests/:id/mark-released
    // CRITICAL: Uses ISSUED QUANTITIES (admin-provided), not requested quantities
    const markReleasedMatch = endpoint.match(/^\/api\/requests\/(\d+)\/mark-released$/);
    if (method === 'POST' && markReleasedMatch) {
      const requestId = parseInt(markReleasedMatch[1]);
      const uid = userIdFromToken(token);
      if (!uid) return { error: 'Unauthorized' };
      const requesting = execToObjects('SELECT * FROM users WHERE id = ?', [uid]);
      if (!requesting.length || requesting[0].role !== 'admin') return { error: 'Forbidden' };
      
      const request = execToObjects('SELECT * FROM ris_requests WHERE id = ?', [requestId]);
      if (!request.length) return { error: 'Request not found' };
      
      // Get issued items (admin-provided quantities)
      let issuedItems = execToObjects('SELECT * FROM issued_items WHERE request_id = ?', [requestId]);
      
      // Get request items to get item details
      const requestItems = execToObjects('SELECT ri.*, (SELECT COUNT(*) FROM inventory WHERE item_id = ri.item_id) as hasInventory FROM request_items ri WHERE request_id = ?', [requestId]);
      
      // CRITICAL FIX: If no issued items exist, use requested items as fallback
      if (!issuedItems || issuedItems.length === 0) {
        issuedItems = requestItems;
      }
      
      let allSufficient = true;
      const stockCheckResults = [];
      
      // First pass: check stock availability for all issued items
      for (const issued of issuedItems) {
        const requestItem = requestItems.find(ri => ri.item_id === issued.item_id);
        if (!requestItem) continue;
        
        const inventory = getInventoryForItem(issued.item_id);
        const available = inventory ? inventory.quantity : 0;
        const sufficient = available >= issued.quantity;
        
        stockCheckResults.push({
          itemId: issued.item_id,
          itemName: requestItem.item_id, // Note: we'd need item name, using ID for now
          requestedQuantity: issued.quantity,
          availableQuantity: available,
          sufficient
        });
        
        if (!sufficient) allSufficient = false;
      }
      
      // Second pass: if all sufficient, deduct from inventory
      if (allSufficient) {
        for (const issued of issuedItems) {
          const inventory = getInventoryForItem(issued.item_id);
          if (inventory) {
            const previousStock = inventory.quantity;
            const newStock = previousStock - issued.quantity;
            db.run('UPDATE inventory SET quantity = ?, updated_at = ? WHERE item_id = ?', [newStock, new Date().toISOString(), issued.item_id]);
            logStockHistory(issued.item_id, inventory.item_name, issued.quantity, 'release', previousStock, newStock, `Request ID: ${requestId}`);
          }
        }
      }
      
      // Update request status
      db.run('UPDATE ris_requests SET status = ?, stocks_available = ?, issued_date = ? WHERE id = ?',
        ['released', allSufficient ? 1 : 0, new Date().toISOString().slice(0,10), requestId]
      );
      saveDatabase();
      
      const updated = getRequestWithItems(requestId);
      updated.stocksAvailable = allSufficient;
      updated.stockCheckResults = stockCheckResults;
      return updated;
    }

    return { error: 'Unknown endpoint' };
  } catch (err) {
    console.error('API request error', err);
    return { error: err.message || 'Internal error' };
  }
});

// Auto-updater handlers
autoUpdater.on('update-available', (info) => {
  const focused = BrowserWindow.getFocusedWindow();
  dialog.showMessageBox(focused, {
    type: 'info',
    title: 'Update Available',
    message: `Version ${info.version} is available. Download now?`,
    buttons: ['Update Now', 'Later']
  }).then(res => {
    if (res.response === 0) autoUpdater.downloadUpdate();
  });
});

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall();
});

autoUpdater.on('error', (err) => {
  console.warn('Auto-update error', err);
});

// Initialize database and start app
app.on('ready', async () => {
  // Check expiry FIRST before anything else
  checkExpiry();
  
  if (!isLicenseValid) {
    dialog.showErrorBox(
      'License Expired',
      'Your subscription has ended. Please contact the developer for license renewal.'
    );
    app.quit();
    return;
  }
  
  try {
    await initializeDatabase();
    createWindow();
    startExpiryWatcher(); // Start background license monitor
  } catch (err) {
    console.error('Failed to start app:', err);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    // Re-check license before reopening
    checkExpiry();
    
    if (!isLicenseValid) {
      dialog.showErrorBox(
        'License Expired',
        'Your subscription has ended. Please contact the developer for license renewal.'
      );
      app.quit();
      return;
    }
    
    createWindow();
  }
});
