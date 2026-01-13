import { app, BrowserWindow, ipcMain, shell, session } from 'electron';
import path from 'path';
import { startServer, stopServer } from './server';
import { startMdnsService, stopMdnsService, getDiscoveredDevices } from './services/mdnsService';
import { initDatabase } from './database';
import { getSettings, saveSettings } from './database/settings';
import {
  getSharedFolders,
  addSharedFolder,
  removeSharedFolder,
  updateSharedFolder,
  toggleFolderEnabled,
} from './database/sharedFolders';

let mainWindow: BrowserWindow | null = null;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// Only used in production builds with Squirrel installer
try {
  if (require('electron-squirrel-startup')) {
    app.quit();
  }
} catch {
  // Module not available in development
}

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, '../public/icon.ico'),
  });

  // In development, load from Vite dev server
  if (process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173');
  } else {
    // In production, load the built index.html
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Only open DevTools in development mode
  if (process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools();
  }
};

// Initialize app
app.whenReady().then(async () => {
  // Configure Content Security Policy to allow local network connections
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
          "connect-src 'self' http://localhost:* http://127.0.0.1:* http://192.168.*:* http://10.*:* http://172.16.*:* ws://localhost:* ws://127.0.0.1:*; " +
          "img-src 'self' data: blob:; " +
          "media-src 'self' http://localhost:* http://127.0.0.1:* http://192.168.*:* http://10.*:* http://172.16.*:* blob:; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval';"
        ]
      }
    });
  });

  // Initialize database (async now with sql.js)
  await initDatabase();

  // Get settings
  const settings = getSettings();

  // Start HTTP server if sharing is enabled
  if (settings.shareEnabled) {
    await startServer(settings.serverPort);
  }

  // Start mDNS service for device discovery
  startMdnsService(settings.deviceName, settings.serverPort);

  // Create main window
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Cleanup on quit
app.on('before-quit', async () => {
  stopMdnsService();
  await stopServer();
});

// IPC Handlers

// Open file with default application (VLC)
ipcMain.handle('open-with-vlc', async (_event, url: string) => {
  try {
    // Try VLC protocol first
    const vlcUrl = `vlc://${url}`;
    await shell.openExternal(vlcUrl);
    return { success: true };
  } catch {
    // Fallback to regular URL
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
});

// Open folder picker dialog
ipcMain.handle('select-folder', async () => {
  const { dialog } = require('electron');
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
  });
  return result.canceled ? null : result.filePaths[0];
});

// Get settings
ipcMain.handle('get-settings', () => {
  return getSettings();
});

// Save settings
ipcMain.handle('save-settings', (_event, settings: Record<string, unknown>) => {
  saveSettings(settings);
  return { success: true };
});

// Restart server with new port
ipcMain.handle('restart-server', async (_event, port: number) => {
  await stopServer();
  await startServer(port);
  return { success: true };
});

// Shared Folders IPC Handlers

// Get all shared folders
ipcMain.handle('get-shared-folders', () => {
  return getSharedFolders();
});

// Add a shared folder
ipcMain.handle('add-shared-folder', (_event, folderPath: string, alias?: string) => {
  try {
    const folder = addSharedFolder(folderPath, alias);
    return { success: true, folder };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

// Remove a shared folder
ipcMain.handle('remove-shared-folder', (_event, folderId: string) => {
  const removed = removeSharedFolder(folderId);
  return { success: removed };
});

// Update a shared folder
ipcMain.handle('update-shared-folder', (_event, folderId: string, updates: { alias?: string; enabled?: boolean }) => {
  const updated = updateSharedFolder(folderId, updates);
  return { success: updated };
});

// Toggle folder enabled state
ipcMain.handle('toggle-folder-enabled', (_event, folderId: string) => {
  const toggled = toggleFolderEnabled(folderId);
  return { success: toggled };
});

// Get discovered devices
ipcMain.handle('get-discovered-devices', () => {
  return getDiscoveredDevices();
});
