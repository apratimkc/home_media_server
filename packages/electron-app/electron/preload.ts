import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Open file with VLC
  openWithVLC: (url: string) => ipcRenderer.invoke('open-with-vlc', url),

  // Select folder dialog
  selectFolder: () => ipcRenderer.invoke('select-folder'),

  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: Record<string, unknown>) =>
    ipcRenderer.invoke('save-settings', settings),

  // Server control
  restartServer: (port: number) => ipcRenderer.invoke('restart-server', port),

  // Listen for events from main process
  onDeviceDiscovered: (callback: (device: unknown) => void) => {
    ipcRenderer.on('device-discovered', (_event, device) => callback(device));
  },
  onDeviceRemoved: (callback: (deviceId: string) => void) => {
    ipcRenderer.on('device-removed', (_event, deviceId) => callback(deviceId));
  },
  onDownloadProgress: (
    callback: (downloadId: string, progress: number, downloaded: number) => void
  ) => {
    ipcRenderer.on('download-progress', (_event, downloadId, progress, downloaded) =>
      callback(downloadId, progress, downloaded)
    );
  },
});

// Type definitions for the exposed API
declare global {
  interface Window {
    electronAPI: {
      openWithVLC: (url: string) => Promise<{ success: boolean; error?: string }>;
      selectFolder: () => Promise<string | null>;
      getSettings: () => Promise<Record<string, unknown>>;
      saveSettings: (settings: Record<string, unknown>) => Promise<{ success: boolean }>;
      restartServer: (port: number) => Promise<{ success: boolean }>;
      onDeviceDiscovered: (callback: (device: unknown) => void) => void;
      onDeviceRemoved: (callback: (deviceId: string) => void) => void;
      onDownloadProgress: (
        callback: (downloadId: string, progress: number, downloaded: number) => void
      ) => void;
    };
  }
}
