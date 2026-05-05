const { app, BrowserWindow, ipcMain, safeStorage } = require('electron');
const path = require('path');

function createWindow() {
  const fs = require('fs');
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
  mainWindow.webDevTools = false; // Disable in production
}

// Safe storage IPC handlers
ipcMain.handle('safe-storage-set', (event, key, value) => {
  try {
    const encrypted = safeStorage.encryptString(value);
    const fs = require('fs');
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
    const fs = require('fs');
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
    const fs = require('fs');
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

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
