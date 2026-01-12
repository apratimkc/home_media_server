import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { startServer, stopServer } from './server';
import { startMdnsService, stopMdnsService } from './services/mdnsService';
import { initDatabase } from './database';
import { getSettings, saveSettings } from './database/settings';

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
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the built index.html
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
};

// Initialize app
app.whenReady().then(async () => {
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
