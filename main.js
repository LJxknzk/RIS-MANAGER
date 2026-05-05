const { app, BrowserWindow, ipcMain, safeStorage, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { autoUpdater } = require('electron-updater');
const crypto = require('crypto');

// Use ProgramData for shared, writable location as requested
const programData = process.env['ProgramData'] || path.join('C:', 'ProgramData');
const dbDir = path.join(programData, 'RIS Manager');
if (!fs.existsSync(dbDir)) {
  try {
    fs.mkdirSync(dbDir, { recursive: true });
  } catch (err) {
    console.error('Failed to create ProgramData folder, falling back to userData', err);
  }
}
const dbPath = path.join(dbDir, 'data.db');

let db;
try {
  db = new Database(dbPath);
} catch (err) {
  console.error('Failed to open database at', dbPath, err);
  // fallback to userData
  const fallbackDir = path.join(app.getPath('userData'), 'RIS Manager');
  if (!fs.existsSync(fallbackDir)) fs.mkdirSync(fallbackDir, { recursive: true });
  const fallbackPath = path.join(fallbackDir, 'data.db');
  db = new Database(fallbackPath);
}

// Initialize schema (migrated from previous backend migrate.js)
const schema = `
PRAGMA foreign_keys = ON;
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

db.exec(schema);

// Ensure admin user exists with default credentials from README
const adminEmail = 'bryanfortuno@bac.gov';
const adminPassword = 'BAC2026';
const adminHash = crypto.createHash('sha256').update(adminPassword).digest('hex');
const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
if (!existingAdmin) {
  db.prepare('INSERT INTO users (name, email, password_hash, role, department) VALUES (?, ?, ?, ?, ?)')
    .run('Admin', adminEmail, adminHash, 'admin', 'Administration');
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

// Expose a lightweight API over IPC to replace the previous Express backend
ipcMain.handle('api-request', (event, { method, endpoint, body, token }) => {
  try {
    method = (method || 'GET').toUpperCase();
    // Auth: POST /auth/login
    if (method === 'POST' && endpoint === '/auth/login') {
      const { email, password } = body || {};
      if (!email || !password) return { error: 'Missing credentials' };
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (!user) return { error: 'Invalid credentials' };
      const hash = crypto.createHash('sha256').update(password).digest('hex');
      if (hash !== user.password_hash) return { error: 'Invalid credentials' };
      const tok = `user-${user.id}`;
      delete user.password_hash;
      return { user, token: tok };
    }

    // Departments: GET /api/departments
    if (method === 'GET' && endpoint === '/api/departments') {
      const rows = db.prepare('SELECT id, name, acronym FROM departments').all();
      return rows;
    }

    // Users: GET /api/users (admin) or GET /api/users/me
    if (method === 'GET' && endpoint === '/api/users') {
      const uid = userIdFromToken(token);
      if (!uid) return { error: 'Unauthorized' };
      const requesting = db.prepare('SELECT * FROM users WHERE id = ?').get(uid);
      if (!requesting) return { error: 'Unauthorized' };
      if (requesting.role === 'admin') {
        const rows = db.prepare('SELECT id, name, email, role, department, designation, created_at FROM users').all();
        return rows;
      }
      return { error: 'Forbidden' };
    }

    if (method === 'GET' && endpoint === '/api/users/me') {
      const uid = userIdFromToken(token);
      if (!uid) return { error: 'Unauthorized' };
      const u = db.prepare('SELECT id, name, email, role, department, designation, created_at FROM users WHERE id = ?').get(uid);
      return u || { error: 'Not found' };
    }

    // Inventory: GET /api/inventory
    if (method === 'GET' && endpoint === '/api/inventory') {
      const rows = db.prepare('SELECT * FROM inventory').all();
      return rows;
    }

    // Requests: GET /api/requests, POST /api/requests
    if (method === 'GET' && endpoint === '/api/requests') {
      const uid = userIdFromToken(token);
      if (!uid) return { error: 'Unauthorized' };
      const rows = db.prepare('SELECT * FROM ris_requests WHERE user_id = ?').all(uid);
      return rows;
    }

    if (method === 'POST' && endpoint === '/api/requests') {
      const uid = userIdFromToken(token);
      if (!uid) return { error: 'Unauthorized' };
      const data = body || {};
      const stmt = db.prepare(`INSERT INTO ris_requests (user_id, control_number, department, request_type, description, request_date, request_year, requester_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
      const info = stmt.run(uid, data.control_number || 0, data.department || '', data.request_type || '', data.description || '', data.request_date || new Date().toISOString().slice(0,10), data.request_year || new Date().getFullYear(), data.requester_name || '');
      const created = db.prepare('SELECT * FROM ris_requests WHERE id = ?').get(info.lastInsertRowid);
      return created;
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

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
