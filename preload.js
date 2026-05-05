const { contextBridge, ipcRenderer } = require('electron');

// Safely expose safeStorage operations to the renderer process via IPC
contextBridge.exposeInMainWorld('__PRELOAD__', {
  safeStorage: {
    safeStorageSetString: (key, value) =>
      ipcRenderer.invoke('safe-storage-set', key, value),
    safeStorageGetString: (key) =>
      ipcRenderer.invoke('safe-storage-get', key),
    safeStorageClear: (key) =>
      ipcRenderer.invoke('safe-storage-clear', key),
  },
});
