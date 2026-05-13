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
      const stats = fs.statSync(dbPath);
      console.log(`[DB-INIT] Loading existing database from ${dbPath} (${stats.size} bytes)`);
    } else {
      console.log(`[DB-INIT] No existing database found, creating new one at ${dbPath}`);
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
        designation TEXT
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
      CREATE TABLE IF NOT EXISTS department_received_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_id INTEGER NOT NULL,
        department TEXT NOT NULL,
        item_id INTEGER NOT NULL,
        item_name TEXT NOT NULL,
        quantity_received INTEGER NOT NULL,
        ris_number INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(request_id) REFERENCES ris_requests(id) ON DELETE CASCADE
      );
    `;
    
    db.run(schema);
    
    // Initialize default departments and users
    initializeDepartmentsAndUsers();
    
    // Initialize inventory with all 116 items
    initializeInventory();
    
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
      console.log(`[DB-SAVE] Database saved to ${dbPath}. File size: ${buffer.length} bytes`);
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

  const iconPath = path.join(__dirname, 'assets', 'logo', 'logo.ico');
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences,
    icon: fs.existsSync(iconPath) ? iconPath : undefined
  });

  mainWindow.loadFile('Index.html');
  mainWindow.webDevTools = false;

  // check for updates after window is ready
  if (app.isPackaged) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((e) => {
        console.warn('autoUpdater error', e);
      });
    }, 2000);
  }
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

// Helper to convert snake_case database fields to camelCase for API responses
function snakeToCamel(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => snakeToCamel(item));
  }
  
  const camelCaseObj = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const camelKey = key.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
      camelCaseObj[camelKey] = obj[key];
    }
  }
  return camelCaseObj;
}

// Helper to hash password with salt (must match frontend PasswordHash utility)
function hashPassword(password) {
  const salt = 'ris_salt_2026';
  const input = String(password || '') + salt;
  return crypto.createHash('sha256').update(input).digest('hex');
}

// Normalize department name to 3-letter acronym
function getDepartmentAcronym(departmentName, index = 0, allDepartments = []) {
  if (!departmentName) return 'GEN';
  
  // Generate base acronym from first letters
  const normalized = String(departmentName)
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .split(/\s+/)
    .map(word => word[0].toUpperCase())
    .join('')
    .slice(0, 3);
  
  const baseAcronym = normalized.padEnd(3, 'X');
  
  // If no allDepartments provided, just return the base acronym
  if (!allDepartments || allDepartments.length === 0) {
    return baseAcronym;
  }
  
  // Check for collisions with earlier departments
  let collidingIndices = [];
  for (let i = 0; i < index; i++) {
    const otherDept = allDepartments[i];
    const otherAcronym = String(otherDept)
      .replace(/[^a-z0-9]+/gi, ' ')
      .trim()
      .split(/\s+/)
      .map(word => word[0].toUpperCase())
      .join('')
      .slice(0, 3)
      .padEnd(3, 'X');
    
    if (otherAcronym === baseAcronym) {
      collidingIndices.push(i);
    }
  }
  
  // If no collision, return base acronym
  if (collidingIndices.length === 0) {
    return baseAcronym;
  }
  
  // If collision exists, add index suffix: AO (0) -> AO0, AO1, etc.
  // But keep it to 3 chars: use last char as index when possible
  const indexStr = index.toString();
  
  // For 2-char acronym: CO -> C01, C02, etc. (keep first 2 chars, append index digit)
  if (baseAcronym.slice(0, 2) !== 'XX' && indexStr.length === 1) {
    return baseAcronym.slice(0, 2) + indexStr;
  }
  
  // For edge cases, use: ACO0, ACO1, etc. (3 chars + number, but use first 2 + number)
  if (indexStr.length === 1) {
    return baseAcronym.slice(0, 2) + indexStr;
  }
  
  // Default fallback for multi-digit indices
  return baseAcronym.slice(0, 1) + indexStr;
}

// Initialize inventory with all 116 items from the system
function initializeInventory() {
  try {
    // All 116 items used in the RIS system
    const AVAILABLE_ITEMS = [
      // Office Items (Stock 001-084)
      { id: 1, name: 'Adding Slip', stock: 'OFF-001' },
      { id: 2, name: 'Ball Pen (black)', stock: 'OFF-002' },
      { id: 3, name: 'BALLPEN (BLUE) 1', stock: 'OFF-003' },
      { id: 4, name: 'BALLPEN (RED)', stock: 'OFF-004' },
      { id: 5, name: 'Battery 9v', stock: 'OFF-005' },
      { id: 6, name: 'Battery AA', stock: 'OFF-006' },
      { id: 7, name: 'Battery AAA', stock: 'OFF-007' },
      { id: 8, name: 'Bond Paper (A4)', stock: 'OFF-008' },
      { id: 9, name: 'Bond Paper (legal)', stock: 'OFF-009' },
      { id: 10, name: 'Bond Paper (short)', stock: 'OFF-010' },
      { id: 11, name: 'Bond Paper A3', stock: 'OFF-011' },
      { id: 12, name: 'Brown Envelope Long', stock: 'OFF-012' },
      { id: 13, name: 'Brown Envelope Short', stock: 'OFF-013' },
      { id: 14, name: 'Calculator', stock: 'OFF-014' },
      { id: 15, name: 'Carbon Paper (black)', stock: 'OFF-015' },
      { id: 16, name: 'Carolina Assorted Color', stock: 'OFF-016' },
      { id: 17, name: 'CERTIFICATE HOLDER', stock: 'OFF-017' },
      { id: 18, name: 'Clear Book Long (20 pages)', stock: 'OFF-018' },
      { id: 19, name: 'CLIP BACKFOLD 10MM (2")', stock: 'OFF-019' },
      { id: 20, name: 'CLIP BACKFOLD 25MM (1")', stock: 'OFF-020' },
      { id: 21, name: 'CLIP BACKFOLD 32MM (1.25")', stock: 'OFF-021' },
      { id: 22, name: 'CLIP BACKFOLD 50MM (2")', stock: 'OFF-022' },
      { id: 23, name: 'CONTINUOUS FORM 2PLY', stock: 'OFF-023' },
      { id: 24, name: 'Correction Tape', stock: 'OFF-024' },
      { id: 25, name: 'Cutter knife w/ Cutter Blade', stock: 'OFF-025' },
      { id: 26, name: 'DVD-R', stock: 'OFF-026' },
      { id: 27, name: 'Envelope Expanded legal', stock: 'OFF-027' },
      { id: 28, name: 'ERASER RUBBER', stock: 'OFF-028' },
      { id: 29, name: 'FILE BOX (magazine file box)', stock: 'OFF-029' },
      { id: 30, name: 'FILE FOLDER ARCHFILE', stock: 'OFF-030' },
      { id: 31, name: 'File Divider 76mx30mx80m', stock: 'OFF-031' },
      { id: 32, name: 'FOLDER ORDINARY (short)', stock: 'OFF-032' },
      { id: 33, name: 'FOLDER ORDINARY (LONG)', stock: 'OFF-033' },
      { id: 34, name: 'FOLDER Expanded Long', stock: 'OFF-034' },
      { id: 35, name: 'Glue all purposes', stock: 'OFF-035' },
      { id: 36, name: 'Index Card 5x8 100s/pack', stock: 'OFF-036' },
      { id: 37, name: 'Mailing Envelope Long', stock: 'OFF-037' },
      { id: 38, name: 'Mailing Envelope with window', stock: 'OFF-038' },
      { id: 39, name: 'MARKER FLUORESCENT (highlight)', stock: 'OFF-039' },
      { id: 40, name: 'Marker PERMANENT (Black)', stock: 'OFF-040' },
      { id: 41, name: 'MARKER PERMANENT (BLUE)', stock: 'OFF-041' },
      { id: 42, name: 'MARKER PERMANENT (Red)', stock: 'OFF-042' },
      { id: 43, name: 'MARKER WHITEBOARD (BLACK)', stock: 'OFF-043' },
      { id: 44, name: 'MARKER WHITEBOARD (BLUE)', stock: 'OFF-044' },
      { id: 45, name: 'MARKER WHITEBOARD (RED)', stock: 'OFF-045' },
      { id: 46, name: 'NOTEPAD STICK-ON 3X3', stock: 'OFF-046' },
      { id: 47, name: 'NOTEPAD STICK-ON 3X4', stock: 'OFF-047' },
      { id: 48, name: 'NOTEPAD STICK-ON 2X3', stock: 'OFF-048' },
      { id: 49, name: 'PAPER CLIP 45MM (jumbo)', stock: 'OFF-049' },
      { id: 50, name: 'Paper Fastener (Metal)', stock: 'OFF-050' },
      { id: 51, name: 'Paper Fastener (Plastic)', stock: 'OFF-051' },
      { id: 52, name: 'Paper Puncher (Big)', stock: 'OFF-052' },
      { id: 53, name: 'PAPER THERMAL 210MM X 30M', stock: 'OFF-053' },
      { id: 54, name: 'Pay Envelope', stock: 'OFF-054' },
      { id: 55, name: 'Pencil Mongol #2', stock: 'OFF-055' },
      { id: 56, name: 'Pencil Sharpener', stock: 'OFF-056' },
      { id: 57, name: 'Photo Paper A4', stock: 'OFF-057' },
      { id: 58, name: 'Plastic Cover', stock: 'OFF-058' },
      { id: 59, name: 'Plastic Envelope (Long)', stock: 'OFF-059' },
      { id: 60, name: 'Plastic Envelope (Short)', stock: 'OFF-060' },
      { id: 61, name: 'PUSH PIN 100PCS', stock: 'OFF-061' },
      { id: 62, name: 'Record Book (150 Pages)', stock: 'OFF-062' },
      { id: 63, name: 'Record Book (300 Pages)', stock: 'OFF-063' },
      { id: 64, name: 'Record Book (500 Pages)', stock: 'OFF-064' },
      { id: 65, name: 'RUBBER BAND 70MM (#18)', stock: 'OFF-065' },
      { id: 66, name: 'Sign Pen (Black)', stock: 'OFF-066' },
      { id: 67, name: 'Sign Pen (Blue)', stock: 'OFF-067' },
      { id: 68, name: 'Sign Pen (Green)', stock: 'OFF-068' },
      { id: 69, name: 'Sign Pen (Red)', stock: 'OFF-069' },
      { id: 70, name: 'SIGN PEN (VIOLET)', stock: 'OFF-070' },
      { id: 71, name: 'STAMP PAD', stock: 'OFF-071' },
      { id: 72, name: 'STAMP PAD INK BLACK', stock: 'OFF-072' },
      { id: 73, name: 'Stapler', stock: 'OFF-073' },
      { id: 74, name: 'Staple Wire N-35 Big Box', stock: 'OFF-074' },
      { id: 75, name: 'Sticker with sticker', stock: 'OFF-075' },
      { id: 76, name: 'Sticker Paper Matte', stock: 'OFF-076' },
      { id: 77, name: 'Tape Dispenser (Big)', stock: 'OFF-077' },
      { id: 78, name: 'Tape Double Sided 24mm (1")', stock: 'OFF-078' },
      { id: 79, name: 'TAPE Double Sided 48mm (2")', stock: 'OFF-079' },
      { id: 80, name: 'Tape Masking 48mm (2")', stock: 'OFF-080' },
      { id: 81, name: 'TAPE Scotch Tape 24mm (1")', stock: 'OFF-081' },
      { id: 82, name: 'TAPE Scotch Tape 48mm (2")', stock: 'OFF-082' },
      { id: 83, name: 'White Regular Mailing Envelope', stock: 'OFF-083' },
      { id: 84, name: 'YELLOW PAD PAPER', stock: 'OFF-084' },
      // Janitorial Items (Stock JAN-001 to JAN-032)
      { id: 85, name: 'Air Freshener', stock: 'JAN-001' },
      { id: 86, name: 'Alcohol', stock: 'JAN-002' },
      { id: 87, name: 'Broom', stock: 'JAN-003' },
      { id: 88, name: 'Broomstick', stock: 'JAN-004' },
      { id: 89, name: 'Detergent Bar', stock: 'JAN-005' },
      { id: 90, name: 'Detergent Powder', stock: 'JAN-006' },
      { id: 91, name: 'Dishwashing Liquid', stock: 'JAN-007' },
      { id: 92, name: 'Disinfectant Bleach', stock: 'JAN-008' },
      { id: 93, name: 'Disinfectant Spray', stock: 'JAN-009' },
      { id: 94, name: 'Doormat / Rug', stock: 'JAN-010' },
      { id: 95, name: 'Dust Pan', stock: 'JAN-011' },
      { id: 96, name: 'Fabric Conditioner', stock: 'JAN-012' },
      { id: 97, name: 'Floor Mop (with rug)', stock: 'JAN-013' },
      { id: 98, name: 'Furniture Polish', stock: 'JAN-014' },
      { id: 99, name: 'Glass Cleaner', stock: 'JAN-015' },
      { id: 100, name: 'Jumbo Tissue for CR', stock: 'JAN-016' },
      { id: 101, name: 'Liquid Hand Soap for CR 500ml', stock: 'JAN-017' },
      { id: 102, name: 'Mop Head (extra rug)', stock: 'JAN-018' },
      { id: 103, name: 'Multi-insect Killer', stock: 'JAN-019' },
      { id: 104, name: 'Muriatic Acid', stock: 'JAN-020' },
      { id: 105, name: 'Round Rug (5\'s)', stock: 'JAN-021' },
      { id: 106, name: 'Scotch Brite Pad with sponge', stock: 'JAN-022' },
      { id: 107, name: 'Toilet Bowl Cleaner', stock: 'JAN-023' },
      { id: 108, name: 'Toilet Brush', stock: 'JAN-024' },
      { id: 109, name: 'Toilet Deodorant', stock: 'JAN-025' },
      { id: 110, name: 'Sanitizer', stock: 'JAN-026' },
      { id: 111, name: 'Tissue Roll', stock: 'JAN-027' },
      { id: 112, name: 'Trashbag Small', stock: 'JAN-028' },
      { id: 113, name: 'Trashbag Big', stock: 'JAN-029' },
      { id: 114, name: 'Rubber Gloves', stock: 'JAN-030' },
      { id: 115, name: 'Tissue Box', stock: 'JAN-031' },
      { id: 116, name: 'Trash Can', stock: 'JAN-032' },
    ];

    // Ensure all 116 items exist in inventory (for new and upgraded databases)
    console.log('[INIT] Checking inventory items...');
    let insertedCount = 0;
    
    for (const item of AVAILABLE_ITEMS) {
      // Check if item already exists
      const existing = execToObjects('SELECT id FROM inventory WHERE item_id = ?', [item.id]);
      if (!existing.length) {
        // Insert missing item
        db.run(
          'INSERT INTO inventory (item_id, item_name, stock_number, quantity) VALUES (?, ?, ?, ?)',
          [item.id, item.name, item.stock, 0]
        );
        insertedCount++;
      }
    }
    
    const totalItems = execToObjects('SELECT COUNT(*) as count FROM inventory');
    console.log(`[INIT] ✓ Inventory initialized with ${totalItems[0]?.count || 0} items (${insertedCount} newly added)`);
    
    if (insertedCount > 0) {
      saveDatabase();
    }
  } catch (err) {
    console.error('Error initializing inventory:', err);
  }
}

// Initialize departments and users with default passwords
function initializeDepartmentsAndUsers() {
  try {
    // List of departments
    const DEPARTMENTS = [
      'ACCOUNTING OFFICE',
      'ADMINISTRATOR\'S OFFICE',
      'AGRICULTURE OFFICE',
      'ASSESSOR\'S OFFICE',
      'BAC',
      'BIR',
      'BJMP',
      'BPLO',
      'BUDGET OFFICE',
      'CDRRMO',
      'CENRO',
      'CGTECC (COOP)',
      'CITY PLANNING AND DEVELOPMENT COUNCIL',
      'CIVIL REGISTRAR\'S OFFICE',
      'COMMISSION ON AUDIT',
      'COMELEC',
      'COMMUNITY AFFAIRS OFFICE',
      'COMPUTER TRAINING CENTER/PDAO',
      'CSWD',
      'DILG',
      'ENGINEERING OFFICE',
      'FIRE STATION (Main)',
      'GSO GENERAL SERVICES OFFICE',
      'GSO-AMBULANCE SERVICE',
      'HUMAN RESOURCE MANAGEMENT OFFICE',
      'ICT',
      'INFORMATION OFFICE',
      'INVESTMENT PROMOTION OFFICE',
      'MAYOR\'S OFFICE',
      'OFFICE OF THE SENIOR CITIZENS AFFAIRS',
      'PESO',
      'POLICE MAIN STATION',
      'POLICE MAIN STATION (INVESTIGATION)',
      'POLICE PANLUNGSOD OFFICE',
      'SANGGUNIANG PANLUNGSOD',
      'TRAFFIC MANAGEMENT OFFICE',
      'TREASURER\'S OFFICE',
      'TRIAL COURT',
      'VICE MAYOR\'S OFFICE',
      'WOMEN DEVELOPMENT COUNCIL',
    ];

    console.log('[INIT] Checking departments and users...');
    console.log(`[INIT] Total departments to process: ${DEPARTMENTS.length}`);

    // Step 1: Seed departments if they don't exist
    const existingDepts = execToObjects('SELECT COUNT(*) as count FROM departments');
    if (existingDepts[0]?.count === 0) {
      console.log('[INIT] Seeding departments...');
      for (let i = 0; i < DEPARTMENTS.length; i++) {
        const dept = DEPARTMENTS[i];
        const acronym = getDepartmentAcronym(dept, i, DEPARTMENTS);
        db.run('INSERT INTO departments (name, acronym) VALUES (?, ?)', [dept, acronym]);
      }
      console.log(`[INIT] ✓ Seeded ${DEPARTMENTS.length} departments`);
    }

    // Step 2: ALWAYS check and fix users (even if departments existed)
    const existingUsers = execToObjects('SELECT COUNT(*) as count FROM users');
    const correctAdminHash = hashPassword('BAC2026');
    
    // Check if admin has correct password
    const adminUser = execToObjects('SELECT * FROM users WHERE email = ?', ['bryanfortuno@bac.gov']);
    const needsUserReset = 
      existingUsers[0]?.count === 0 || 
      adminUser.length === 0 || 
      adminUser[0].password_hash !== correctAdminHash;

    if (needsUserReset) {
      if (existingUsers[0]?.count > 0) {
        console.log('[INIT] ⚠️ Found users with INCORRECT password hashes - deleting and re-seeding...');
        db.run('DELETE FROM users');
      }

      console.log('[INIT] Seeding users with correct passwords...');

      // Seed admin user
      const adminPassword = 'BAC2026';
      const adminHash = hashPassword(adminPassword);
      db.run(
        'INSERT INTO users (name, email, password_hash, role, department, designation) VALUES (?, ?, ?, ?, ?, ?)',
        ['Bryan De Guzman Fortuno', 'bryanfortuno@bac.gov', adminHash, 'admin', 'BAC', 'Admin IV']
      );
      console.log('[INIT] ✓ Created admin user (bryanfortuno@bac.gov / BAC2026)');

      // Seed users for each department
      let createdCount = 0;
      for (let i = 0; i < DEPARTMENTS.length; i++) {
        const dept = DEPARTMENTS[i];
        const acronym = getDepartmentAcronym(dept, i, DEPARTMENTS);
        const password = `${acronym}2026`;
        const passwordHash = hashPassword(password);
        const email = `${acronym.toLowerCase()}@local.gov`;
        
        db.run(
          'INSERT INTO users (name, email, password_hash, role, department, designation) VALUES (?, ?, ?, ?, ?, ?)',
          [`${dept} User`, email, passwordHash, 'user', dept, 'Staff']
        );
        
        // Log first 10 created users for debugging
        if (createdCount < 10) {
          console.log(`[INIT]   ${createdCount + 1}. ${email} / ${password}`);
          createdCount++;
        }
      }
      console.log(`[INIT] ✓ Seeded ${DEPARTMENTS.length} department users`);
      
      // Show example login credentials
      const firstAcronym = getDepartmentAcronym(DEPARTMENTS[0], 0, DEPARTMENTS);
      console.log(`[INIT] 📝 First user login: ${firstAcronym.toLowerCase()}@local.gov / ${firstAcronym}2026`);
    } else {
      console.log('[INIT] Users already initialized with correct passwords');
    }

    // Step 3: VERIFICATION - Ensure all 40 departments have users
    const deptsWithoutUsers = [];
    for (let i = 0; i < DEPARTMENTS.length; i++) {
      const dept = DEPARTMENTS[i];
      const acronym = getDepartmentAcronym(dept, i, DEPARTMENTS);
      const email = `${acronym.toLowerCase()}@local.gov`;
      const user = execToObjects('SELECT id, email, role, department FROM users WHERE email = ?', [email]);
      if (user.length === 0) {
        deptsWithoutUsers.push({ dept, email, acronym, password: `${acronym}2026`, index: i });
      }
    }

    if (deptsWithoutUsers.length > 0) {
      console.log(`[INIT] ⚠️ Found ${deptsWithoutUsers.length} departments WITHOUT users - creating them now...`);
      for (const missing of deptsWithoutUsers) {
        const passwordHash = hashPassword(missing.password);
        db.run(
          'INSERT INTO users (name, email, password_hash, role, department, designation) VALUES (?, ?, ?, ?, ?, ?)',
          [`${missing.dept} User`, missing.email, passwordHash, 'user', missing.dept, 'Staff']
        );
        console.log(`[INIT]   ✓ Created missing user: ${missing.email} / ${missing.password}`);
      }
      saveDatabase();
    }

    // Step 4: Final verification - list all created users
    const allCreatedUsers = execToObjects('SELECT id, email, role, department FROM users ORDER BY role DESC, email ASC');
    console.log(`[INIT] 📊 FINAL VERIFICATION - Total users created: ${allCreatedUsers.length}`);
    console.log(`[INIT] 📋 Users created:`);
    
    // Show admin user
    const adminUsers = allCreatedUsers.filter(u => u.role === 'admin');
    adminUsers.forEach((u, idx) => {
      console.log(`[INIT]   ${idx + 1}. [ADMIN] ${u.email} @ ${u.department}`);
    });
    
    // Show department users
    const deptUsers = allCreatedUsers.filter(u => u.role !== 'admin');
    console.log(`[INIT] 🏢 ${deptUsers.length} Department Users:`);
    deptUsers.forEach((u, idx) => {
      if (idx < 15) { // Show first 15
        console.log(`[INIT]   ${idx + 1}. ${u.email} @ ${u.department}`);
      }
    });
    if (deptUsers.length > 15) {
      console.log(`[INIT]   ... and ${deptUsers.length - 15} more`);
    }
    
    console.log(`[INIT] ✅ Total: ${allCreatedUsers.length} users (1 admin + ${deptUsers.length} departments = ${1 + 40} expected)`);

    if (allCreatedUsers.length !== 41) {
      console.warn(`[INIT] ⚠️ WARNING: Expected 41 users but got ${allCreatedUsers.length}!`);
    }

    saveDatabase();
    console.log('[INIT] Database saved');

  } catch (err) {
    console.error('Error initializing departments and users:', err);
  }
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
      console.log(`[LOGIN] Attempting login for email: ${email}`);
      if (!users.length) {
        console.log(`[LOGIN] ✗ User not found with email: ${email}`);
        // List all users in database for debugging
        const allUsers = execToObjects('SELECT id, email, role FROM users LIMIT 5');
        console.log(`[LOGIN] Available users in DB:`, allUsers.map(u => `${u.email} (${u.role})`).join(', '));
        return { error: 'Invalid credentials' };
      }
      const user = users[0];
      const hash = hashPassword(password);
      const isAdmin = user.role === 'admin';
      const debugPrefix = `${isAdmin ? 'ADMIN' : 'USER'}`;
      console.log(`[LOGIN-${debugPrefix}] Email: ${email}, Password: ${password}`);
      console.log(`[LOGIN-${debugPrefix}] Generated hash: ${hash.substring(0, 20)}...`);
      console.log(`[LOGIN-${debugPrefix}] Stored hash:    ${user.password_hash.substring(0, 20)}...`);
      if (hash !== user.password_hash) {
        console.log(`[LOGIN-${debugPrefix}] ✗ Password hash MISMATCH`);
        return { error: 'Invalid credentials' };
      }
      console.log(`[LOGIN-${debugPrefix}] ✓ Login successful for ${email} (user_id: ${user.id})`);
      const tok = `user-${user.id}`;
      delete user.password_hash;
      return { user, token: tok };
    }

    // Departments: GET /api/departments
    if (method === 'GET' && endpoint === '/api/departments') {
      const rows = execToObjects('SELECT id, name, acronym FROM departments');
      return snakeToCamel(rows);
    }

    // Users: GET /api/users (admin) or GET /api/users/me
    if (method === 'GET' && endpoint === '/api/users') {
      const uid = userIdFromToken(token);
      if (!uid) return { error: 'Unauthorized' };
      const requesting = execToObjects('SELECT * FROM users WHERE id = ?', [uid]);
      if (!requesting.length) return { error: 'Unauthorized' };
      if (requesting[0].role === 'admin') {
        const rows = execToObjects('SELECT id, name, email, password_hash, role, department, designation FROM users ORDER BY id ASC');
        console.log(`[GET /api/users] Returning ${rows.length} users (admin request)`);
        return snakeToCamel(rows);
      }
      return { error: 'Forbidden' };
    }

    if (method === 'GET' && endpoint === '/api/users/me') {
      const uid = userIdFromToken(token);
      if (!uid) return { error: 'Unauthorized' };
      const users = execToObjects('SELECT id, name, email, role, department, designation FROM users WHERE id = ?', [uid]);
      return users.length ? snakeToCamel(users[0]) : { error: 'Not found' };
    }

    // Inventory: GET /api/inventory, GET /api/inventory/items
    if (method === 'GET' && endpoint === '/api/inventory') {
      const rows = execToObjects('SELECT * FROM inventory');
      console.log(`[GET /api/inventory] Returning ${rows.length} inventory items. First 3:`, rows.slice(0, 3).map(r => ({ item_id: r.item_id, item_name: r.item_name, quantity: r.quantity })));
      return snakeToCamel(rows);
    }

    if (method === 'GET' && endpoint === '/api/inventory/items') {
      const rows = execToObjects('SELECT * FROM inventory');
      return snakeToCamel(rows);
    }

    // Inventory: POST /api/inventory/restock
    if (method === 'POST' && endpoint === '/api/inventory/restock') {
      const uid = userIdFromToken(token);
      if (!uid) return { error: 'Unauthorized' };
      const requesting = execToObjects('SELECT * FROM users WHERE id = ?', [uid]);
      if (!requesting.length || requesting[0].role !== 'admin') return { error: 'Forbidden' };
      
      const { itemId, quantity, notes } = body || {};
      if (!itemId || quantity === undefined) return { error: 'Missing itemId or quantity' };
      
      let inventory = getInventoryForItem(itemId);
      
      // AUTO-CREATE inventory record if it doesn't exist
      if (!inventory) {
        const itemName = `Item ${itemId}`;
        const stockNumber = `STOCK-${itemId}`;
        console.log(`[RESTOCK] Creating new inventory record for item ${itemId}`);
        db.run('INSERT INTO inventory (item_id, item_name, stock_number, quantity) VALUES (?, ?, ?, ?)', 
          [itemId, itemName, stockNumber, 0]);
        saveDatabase();
        inventory = getInventoryForItem(itemId);
      }
      
      const previousStock = inventory.quantity;
      const newStock = previousStock + parseInt(quantity);
      console.log(`[RESTOCK] Item ${itemId}: adding ${quantity} to ${previousStock} → ${newStock}`);
      
      // Update inventory quantity
      db.run('UPDATE inventory SET quantity = ?, updated_at = ? WHERE item_id = ?', 
        [newStock, new Date().toISOString(), itemId]);
      
      // Save immediately after update
      saveDatabase();
      
      // Log history
      logStockHistory(itemId, inventory.item_name, parseInt(quantity), 'restock', previousStock, newStock, notes || '');
      
      // Save again after history (logStockHistory saves but let's be explicit)
      saveDatabase();
      
      // Re-fetch the item to ensure we get the updated data
      const updatedItem = getInventoryForItem(itemId);
      console.log(`[RESTOCK] ✓ Item ${itemId} restocked. New quantity: ${updatedItem.quantity}`);
      
      return snakeToCamel(updatedItem);
    }

    // Inventory: GET /api/inventory/history
    if (method === 'GET' && endpoint === '/api/inventory/history') {
      const rows = execToObjects('SELECT * FROM stock_history ORDER BY created_at DESC');
      return snakeToCamel(rows);
    }

    // Department Received Items: GET /api/inventory/department-received
    if (method === 'GET' && endpoint === '/api/inventory/department-received') {
      const rows = execToObjects('SELECT * FROM department_received_items ORDER BY created_at DESC');
      return snakeToCamel(rows);
    }

    // Requests: GET /api/requests (user's requests), GET /api/requests/admin (all requests for admin)
    if (method === 'GET' && endpoint === '/api/requests') {
      const uid = userIdFromToken(token);
      if (!uid) return { error: 'Unauthorized' };
      const rows = execToObjects('SELECT * FROM ris_requests WHERE user_id = ? ORDER BY id DESC', [uid]);
      return rows.map(req => {
        const items = execToObjects('SELECT * FROM request_items WHERE request_id = ?', [req.id]);
        const issuedItems = execToObjects('SELECT * FROM issued_items WHERE request_id = ?', [req.id]);
        return snakeToCamel({ ...req, items: snakeToCamel(items), issuedItems: snakeToCamel(issuedItems) });
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
        return snakeToCamel({ ...req, items: snakeToCamel(items), issuedItems: snakeToCamel(issuedItems), user: user.length ? snakeToCamel(user[0]) : null });
      });
    }

    // Requests: POST /api/requests
    if (method === 'POST' && endpoint === '/api/requests') {
      const uid = userIdFromToken(token);
      if (!uid) return { error: 'Unauthorized' };
      const data = body || {};
      
      // Calculate control number if not provided or is 0
      let controlNumber = data.control_number;
      if (!controlNumber || controlNumber === 0) {
        const currentYear = new Date().getFullYear();
        const requestYear = data.request_year || currentYear;
        const departmentNormalized = (data.department || '').trim().toLowerCase();
        
        // Count existing requests for this department in this year
        const result = execToObjects(
          'SELECT COUNT(*) as count FROM ris_requests WHERE department = ? AND request_year = ?',
          [data.department || '', requestYear]
        );
        const count = result.length > 0 ? result[0].count : 0;
        controlNumber = count + 1; // Start from 1
      }
      
      db.run(
        'INSERT INTO ris_requests (user_id, control_number, department, request_type, description, request_date, request_year, requester_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [uid, controlNumber, data.department || '', data.request_type || '', data.description || '', data.request_date || new Date().toISOString().slice(0,10), data.request_year || new Date().getFullYear(), data.requester_name || '']
      );
      saveDatabase();
      const created = execToObjects('SELECT * FROM ris_requests WHERE user_id = ? ORDER BY id DESC LIMIT 1', [uid]);
      
      // If items are provided, save them
      if (created.length && data.items && Array.isArray(data.items)) {
        const requestId = created[0].id;
        for (const item of data.items) {
          db.run(
            'INSERT INTO request_items (request_id, item_id, quantity) VALUES (?, ?, ?)',
            [requestId, item.itemId, item.quantity]
          );
        }
        saveDatabase();
        console.log(`[POST /api/requests] Created request ${requestId} with ${data.items.length} items`);
      }
      
      // Return created request with items and issuedItems
      if (created.length) {
        const requestId = created[0].id;
        const items = execToObjects('SELECT * FROM request_items WHERE request_id = ?', [requestId]);
        const issuedItems = execToObjects('SELECT * FROM issued_items WHERE request_id = ?', [requestId]);
        return snakeToCamel({ ...created[0], items: snakeToCamel(items), issuedItems: snakeToCamel(issuedItems) });
      }
      return { error: 'Failed to create' };
    }

    // Request Items: POST /api/requests/:id/items, GET /api/requests/:id/items
    const requestItemsMatch = endpoint.match(/^\/api\/requests\/(\d+)\/items$/);
    if (requestItemsMatch) {
      const requestId = parseInt(requestItemsMatch[1]);
      
      if (method === 'GET') {
        const items = execToObjects('SELECT * FROM request_items WHERE request_id = ?', [requestId]);
        return snakeToCamel(items);
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
        return snakeToCamel(updated);
      }
    }

    // Issued Items: POST /api/requests/:id/issued-items, GET /api/requests/:id/issued-items
    const issuedItemsMatch = endpoint.match(/^\/api\/requests\/(\d+)\/issued-items$/);
    if (issuedItemsMatch) {
      const requestId = parseInt(issuedItemsMatch[1]);
      
      if (method === 'GET') {
        const items = execToObjects('SELECT * FROM issued_items WHERE request_id = ?', [requestId]);
        return snakeToCamel(items);
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
        return snakeToCamel(updated);
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
      
      return snakeToCamel(getRequestWithItems(requestId));
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
      
      return snakeToCamel(getRequestWithItems(requestId));
    }

    // Mark Released: POST /api/requests/:id/mark-released
    // Uses ISSUED QUANTITIES (admin-provided), not requested quantities
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
      const requestItems = execToObjects('SELECT ri.* FROM request_items ri WHERE request_id = ?', [requestId]);

      // If no issued items exist, use requested items as fallback
      if (!issuedItems || issuedItems.length === 0) {
        issuedItems = requestItems.map(r => ({ item_id: r.item_id, quantity: r.quantity }));
      }

      let allSufficient = true;
      const stockCheckResults = [];

      // Unified pass: check availability for UI and always deduct stock / record received items
      console.log(`[MARK-RELEASED] Processing ${issuedItems.length} issued items for request ${requestId}`);
      for (const issued of issuedItems) {
        const requestItem = requestItems.find(ri => ri.item_id === issued.item_id) || {};
        let inventory = getInventoryForItem(issued.item_id);
        
        // AUTO-CREATE inventory record if it doesn't exist
        if (!inventory) {
          const itemName = requestItem.item_name || `Item ${issued.item_id}`;
          const stockNumber = `STOCK-${issued.item_id}`;
          console.log(`[MARK-RELEASED] Creating new inventory record for item ${issued.item_id}`);
          db.run('INSERT INTO inventory (item_id, item_name, stock_number, quantity) VALUES (?, ?, ?, ?)', 
            [issued.item_id, itemName, stockNumber, 0]);
          saveDatabase();
          inventory = getInventoryForItem(issued.item_id);
        }
        
        const available = inventory ? inventory.quantity : 0;
        const sufficient = available >= issued.quantity;

        stockCheckResults.push({
          itemId: issued.item_id,
          itemName: inventory ? inventory.item_name : (requestItem.item_name || ''),
          requestedQuantity: issued.quantity,
          availableQuantity: available,
          sufficient
        });

        if (!sufficient) allSufficient = false;

        // Record department received
        db.run(
          'INSERT INTO department_received_items (request_id, department, item_id, item_name, quantity_received, ris_number, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [requestId, request[0].department, issued.item_id, inventory.item_name, issued.quantity, request[0].ris_number, new Date().toISOString()]
        );

        // ALWAYS deduct from inventory (now guaranteed to exist)
        const previousStock = inventory.quantity;
        const newStock = Math.max(0, previousStock - issued.quantity);
        console.log(`[MARK-RELEASED] Item ${issued.item_id}: DEDUCTING ${issued.quantity} from ${previousStock} → ${newStock}`);
        
        db.run('UPDATE inventory SET quantity = ?, updated_at = ? WHERE item_id = ?', [newStock, new Date().toISOString(), issued.item_id]);
        
        // VERIFY: Check if update actually happened
        const verifyAfter = getInventoryForItem(issued.item_id);
        console.log(`[MARK-RELEASED] VERIFY after update: item ${issued.item_id} now has quantity ${verifyAfter ? verifyAfter.quantity : 'NOT FOUND'}`);
        
        logStockHistory(issued.item_id, inventory.item_name, issued.quantity, 'release', previousStock, newStock, `Request ID: ${requestId} - Department: ${request[0].department}`);
      }

      // Update request status
      db.run('UPDATE ris_requests SET status = ?, stocks_available = ?, issued_date = ? WHERE id = ?',
        ['released', allSufficient ? 1 : 0, new Date().toISOString().slice(0,10), requestId]
      );
      saveDatabase();
      console.log(`[MARK-RELEASED] Database saved. Request ${requestId} marked as released. Sufficient: ${allSufficient}`);

      // VERIFY: Log the inventory state after saving
      const inventoryAfterSave = execToObjects('SELECT item_id, quantity, item_name FROM inventory');
      console.log(`[MARK-RELEASED] Inventory after save (${inventoryAfterSave.length} items):`, inventoryAfterSave.slice(0, 5));

      const updated = snakeToCamel(getRequestWithItems(requestId));
      updated.stockCheckResults = stockCheckResults;
      
      // INCLUDE UPDATED INVENTORY IN RESPONSE so frontend gets fresh data immediately
      const updatedInventory = execToObjects('SELECT * FROM inventory');
      const normalizedInventory = {};
      for (const row of updatedInventory) {
        normalizedInventory[row.item_id] = row.quantity;
      }
      updated.inventoryAfterRelease = normalizedInventory;
      console.log(`[MARK-RELEASED] Returning updated inventory in response:`, Object.keys(normalizedInventory).map(k => `${k}:${normalizedInventory[k]}`).join(', '));
      
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
