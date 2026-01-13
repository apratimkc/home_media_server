import { contextBridge, ipcRenderer } from 'electron';

// Shared folder type
interface SharedFolder {
  id: string;
  path: string;
  alias: string | null;
  enabled: boolean;
  addedAt: Date;
}

// Device type
interface DiscoveredDevice {
  id: string;
  name: string;
  ip: string;
  port: number;
  platform: 'windows' | 'android';
}

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

  // Shared folders
  getSharedFolders: () => ipcRenderer.invoke('get-shared-folders'),
  addSharedFolder: (folderPath: string, alias?: string) =>
    ipcRenderer.invoke('add-shared-folder', folderPath, alias),
  removeSharedFolder: (folderId: string) =>
    ipcRenderer.invoke('remove-shared-folder', folderId),
  updateSharedFolder: (folderId: string, updates: { alias?: string; enabled?: boolean }) =>
    ipcRenderer.invoke('update-shared-folder', folderId, updates),
  toggleFolderEnabled: (folderId: string) =>
    ipcRenderer.invoke('toggle-folder-enabled', folderId),

  // Device discovery
  getDiscoveredDevices: () => ipcRenderer.invoke('get-discovered-devices'),

  // Listen for events from main process
  onDeviceDiscovered: (callback: (device: DiscoveredDevice) => void) => {
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
      getSharedFolders: () => Promise<SharedFolder[]>;
      addSharedFolder: (folderPath: string, alias?: string) => Promise<{ success: boolean; folder?: SharedFolder; error?: string }>;
      removeSharedFolder: (folderId: string) => Promise<{ success: boolean }>;
      updateSharedFolder: (folderId: string, updates: { alias?: string; enabled?: boolean }) => Promise<{ success: boolean }>;
      toggleFolderEnabled: (folderId: string) => Promise<{ success: boolean }>;
      getDiscoveredDevices: () => Promise<DiscoveredDevice[]>;
      onDeviceDiscovered: (callback: (device: DiscoveredDevice) => void) => void;
      onDeviceRemoved: (callback: (deviceId: string) => void) => void;
      onDownloadProgress: (
        callback: (downloadId: string, progress: number, downloaded: number) => void
      ) => void;
    };
  }
}
