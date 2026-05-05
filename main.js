const { app, BrowserWindow, ipcMain, safeStorage, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');
const { autoUpdater } = require('electron-updater');
const crypto = require('crypto');

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

// Expose a lightweight API over IPC to replace the previous Express backend
ipcMain.handle('api-request', (event, { method, endpoint, body, token }) => {
  try {
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

    // Inventory: GET /api/inventory
    if (method === 'GET' && endpoint === '/api/inventory') {
      const rows = execToObjects('SELECT * FROM inventory');
      return rows;
    }

    // Requests: GET /api/requests, POST /api/requests
    if (method === 'GET' && endpoint === '/api/requests') {
      const uid = userIdFromToken(token);
      if (!uid) return { error: 'Unauthorized' };
      const rows = execToObjects('SELECT * FROM ris_requests WHERE user_id = ?', [uid]);
      return rows;
    }

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
  try {
    await initializeDatabase();
    createWindow();
  } catch (err) {
    console.error('Failed to start app:', err);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
