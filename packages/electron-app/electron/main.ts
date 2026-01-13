import { app, BrowserWindow, ipcMain, shell, session } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import fs from 'fs';
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
import * as downloadManager from './services/downloadManager';
import * as autoDownloadManager from './services/autoDownloadManager';
import * as autoDeleteService from './services/autoDeleteService';

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

  // Initialize download manager (must be after window creation)
  if (mainWindow) {
    downloadManager.initDownloadManager(mainWindow);
  }

  // Start auto-delete scheduler
  autoDeleteService.startScheduler();

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
  downloadManager.cleanup();
  autoDeleteService.stopScheduler();
  stopMdnsService();
  await stopServer();
});

// IPC Handlers

// Open file with default application (VLC)
ipcMain.handle('open-with-vlc', async (_event, url: string) => {
  try {
    // Common VLC installation paths on Windows
    const vlcPaths = [
      'C:\\Program Files\\VideoLAN\\VLC\\vlc.exe',
      'C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe',
      path.join(process.env.ProgramFiles || 'C:\\Program Files', 'VideoLAN', 'VLC', 'vlc.exe'),
      path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'VideoLAN', 'VLC', 'vlc.exe'),
    ];

    // Find VLC executable
    let vlcPath: string | null = null;
    for (const pathToCheck of vlcPaths) {
      if (fs.existsSync(pathToCheck)) {
        vlcPath = pathToCheck;
        break;
      }
    }

    if (vlcPath) {
      // Launch VLC with the URL
      spawn(vlcPath, [url], {
        detached: true,
        stdio: 'ignore',
      }).unref();
      return { success: true };
    } else {
      // VLC not found, try protocol handler
      try {
        const vlcUrl = `vlc://${url}`;
        await shell.openExternal(vlcUrl);
        return { success: true };
      } catch {
        // Final fallback: open in default browser
        await shell.openExternal(url);
        return { success: true };
      }
    }
  } catch (error) {
    return { success: false, error: `Failed to open VLC: ${String(error)}` };
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

// ============================================================================
// Download IPC Handlers
// ============================================================================

// Start a new download
ipcMain.handle('start-download', async (_event, params: {
  fileId: string;
  fileName: string;
  sourceDeviceId: string;
  sourceDeviceName: string;
  sourceDeviceIp: string;
  sourceDevicePort: number;
  remotePath: string;
  totalBytes: number;
  isAutoDownload?: boolean;
}) => {
  try {
    const download = await downloadManager.startDownload(params);
    return { success: true, download };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

// Pause a download
ipcMain.handle('pause-download', (_event, downloadId: string) => {
  const success = downloadManager.pauseDownload(downloadId);
  return { success };
});

// Resume a download
ipcMain.handle('resume-download', (_event, downloadId: string) => {
  const success = downloadManager.resumeDownload(downloadId);
  return { success };
});

// Cancel a download
ipcMain.handle('cancel-download', (_event, downloadId: string) => {
  const success = downloadManager.cancelDownload(downloadId);
  return { success };
});

// Retry a failed download
ipcMain.handle('retry-download', (_event, downloadId: string) => {
  const success = downloadManager.retryDownload(downloadId);
  return { success };
});

// Delete a download (file and record)
ipcMain.handle('delete-download', (_event, downloadId: string) => {
  const success = downloadManager.deleteDownload(downloadId);
  return { success };
});

// Get all downloads
ipcMain.handle('get-downloads', () => {
  return downloadManager.getAllDownloads();
});

// Get a single download
ipcMain.handle('get-download', (_event, downloadId: string) => {
  return downloadManager.getDownload(downloadId);
});

// Open a downloaded file with VLC
ipcMain.handle('open-download-with-vlc', async (_event, downloadId: string) => {
  const download = downloadManager.getDownload(downloadId);
  if (!download || !download.localPath) {
    return { success: false, error: 'Download not found or not completed' };
  }

  // Use the existing VLC handler with local file path
  try {
    const vlcPaths = [
      'C:\\Program Files\\VideoLAN\\VLC\\vlc.exe',
      'C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe',
      path.join(process.env.ProgramFiles || 'C:\\Program Files', 'VideoLAN', 'VLC', 'vlc.exe'),
      path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'VideoLAN', 'VLC', 'vlc.exe'),
    ];

    let vlcPath: string | null = null;
    for (const pathToCheck of vlcPaths) {
      if (fs.existsSync(pathToCheck)) {
        vlcPath = pathToCheck;
        break;
      }
    }

    if (vlcPath) {
      spawn(vlcPath, [download.localPath], {
        detached: true,
        stdio: 'ignore',
      }).unref();
      return { success: true };
    } else {
      await shell.openPath(download.localPath);
      return { success: true };
    }
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

// ============================================================================
// Auto-Download IPC Handlers
// ============================================================================

// Set currently playing file (triggers auto-download)
ipcMain.handle('set-playing-file', async (_event, params: {
  fileId: string;
  fileName: string;
  deviceId: string;
  deviceIp: string;
  devicePort: number;
  deviceName: string;
}) => {
  try {
    await autoDownloadManager.setPlayingFile(params);
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

// Get auto-download queue
ipcMain.handle('get-auto-download-queue', () => {
  return autoDownloadManager.getQueue();
});

// Clear auto-download queue
ipcMain.handle('clear-auto-download-queue', () => {
  autoDownloadManager.clearQueue();
  return { success: true };
});

// ============================================================================
// Auto-Delete IPC Handlers
// ============================================================================

// Run cleanup manually
ipcMain.handle('run-cleanup', async () => {
  const deleted = await autoDeleteService.runCleanup();
  return { success: true, deletedCount: deleted };
});

// Get expired downloads count
ipcMain.handle('get-expired-count', () => {
  return autoDeleteService.getExpiredCount();
});
