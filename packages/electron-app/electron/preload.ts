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

// Download type
interface Download {
  id: string;
  fileId: string;
  fileName: string;
  sourceDeviceId: string;
  sourceDeviceName: string;
  remotePath: string;
  localPath?: string;
  totalBytes: number;
  downloadedBytes: number;
  status: 'queued' | 'downloading' | 'paused' | 'completed' | 'failed';
  progress: number;
  startedAt?: string;
  completedAt?: string;
  expiresAt?: string;
  isAutoDownload: boolean;
  error?: string;
}

// Auto-download queue item
interface AutoDownloadItem {
  id: string;
  playingFileId: string;
  deviceId: string;
  queuedFileIds: string[];
  detectionMethod: 'episode' | 'alphabetical';
  createdAt: Date;
}

// Download start parameters
interface StartDownloadParams {
  fileId: string;
  fileName: string;
  sourceDeviceId: string;
  sourceDeviceName: string;
  sourceDeviceIp: string;
  sourceDevicePort: number;
  remotePath: string;
  totalBytes: number;
  isAutoDownload?: boolean;
}

// Playing file parameters
interface PlayingFileParams {
  fileId: string;
  fileName: string;
  deviceId: string;
  deviceIp: string;
  devicePort: number;
  deviceName: string;
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

  // ============================================================================
  // Downloads
  // ============================================================================
  startDownload: (params: StartDownloadParams) => ipcRenderer.invoke('start-download', params),
  pauseDownload: (downloadId: string) => ipcRenderer.invoke('pause-download', downloadId),
  resumeDownload: (downloadId: string) => ipcRenderer.invoke('resume-download', downloadId),
  cancelDownload: (downloadId: string) => ipcRenderer.invoke('cancel-download', downloadId),
  retryDownload: (downloadId: string) => ipcRenderer.invoke('retry-download', downloadId),
  deleteDownload: (downloadId: string) => ipcRenderer.invoke('delete-download', downloadId),
  getDownloads: () => ipcRenderer.invoke('get-downloads'),
  getDownload: (downloadId: string) => ipcRenderer.invoke('get-download', downloadId),
  openDownloadWithVLC: (downloadId: string) => ipcRenderer.invoke('open-download-with-vlc', downloadId),

  // ============================================================================
  // Auto-Download
  // ============================================================================
  setPlayingFile: (params: PlayingFileParams) => ipcRenderer.invoke('set-playing-file', params),
  getAutoDownloadQueue: () => ipcRenderer.invoke('get-auto-download-queue'),
  clearAutoDownloadQueue: () => ipcRenderer.invoke('clear-auto-download-queue'),

  // ============================================================================
  // Auto-Delete
  // ============================================================================
  runCleanup: () => ipcRenderer.invoke('run-cleanup'),
  getExpiredCount: () => ipcRenderer.invoke('get-expired-count'),

  // ============================================================================
  // Events from main process
  // ============================================================================
  onDeviceDiscovered: (callback: (device: DiscoveredDevice) => void) => {
    ipcRenderer.on('device-discovered', (_event, device) => callback(device));
  },
  onDeviceRemoved: (callback: (deviceId: string) => void) => {
    ipcRenderer.on('device-removed', (_event, deviceId) => callback(deviceId));
  },
  onDownloadProgress: (
    callback: (data: { id: string; progress: number; downloadedBytes: number; totalBytes: number }) => void
  ) => {
    ipcRenderer.on('download-progress', (_event, data) => callback(data));
  },
  onDownloadAdded: (callback: (download: Download) => void) => {
    ipcRenderer.on('download-added', (_event, download) => callback(download));
  },
  onDownloadStarted: (callback: (data: { id: string }) => void) => {
    ipcRenderer.on('download-started', (_event, data) => callback(data));
  },
  onDownloadCompleted: (callback: (download: Download) => void) => {
    ipcRenderer.on('download-completed', (_event, download) => callback(download));
  },
  onDownloadFailed: (callback: (data: { id: string; error: string }) => void) => {
    ipcRenderer.on('download-failed', (_event, data) => callback(data));
  },
  onDownloadPaused: (callback: (data: { id: string }) => void) => {
    ipcRenderer.on('download-paused', (_event, data) => callback(data));
  },
  onDownloadResumed: (callback: (data: { id: string }) => void) => {
    ipcRenderer.on('download-resumed', (_event, data) => callback(data));
  },
  onDownloadCancelled: (callback: (data: { id: string }) => void) => {
    ipcRenderer.on('download-cancelled', (_event, data) => callback(data));
  },
  onDownloadDeleted: (callback: (data: { id: string }) => void) => {
    ipcRenderer.on('download-deleted', (_event, data) => callback(data));
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
      // Downloads
      startDownload: (params: StartDownloadParams) => Promise<{ success: boolean; download?: Download; error?: string }>;
      pauseDownload: (downloadId: string) => Promise<{ success: boolean }>;
      resumeDownload: (downloadId: string) => Promise<{ success: boolean }>;
      cancelDownload: (downloadId: string) => Promise<{ success: boolean }>;
      retryDownload: (downloadId: string) => Promise<{ success: boolean }>;
      deleteDownload: (downloadId: string) => Promise<{ success: boolean }>;
      getDownloads: () => Promise<Download[]>;
      getDownload: (downloadId: string) => Promise<Download | null>;
      openDownloadWithVLC: (downloadId: string) => Promise<{ success: boolean; error?: string }>;
      // Auto-Download
      setPlayingFile: (params: PlayingFileParams) => Promise<{ success: boolean; error?: string }>;
      getAutoDownloadQueue: () => Promise<AutoDownloadItem[]>;
      clearAutoDownloadQueue: () => Promise<{ success: boolean }>;
      // Auto-Delete
      runCleanup: () => Promise<{ success: boolean; deletedCount: number }>;
      getExpiredCount: () => Promise<number>;
      // Events
      onDeviceDiscovered: (callback: (device: DiscoveredDevice) => void) => void;
      onDeviceRemoved: (callback: (deviceId: string) => void) => void;
      onDownloadProgress: (callback: (data: { id: string; progress: number; downloadedBytes: number; totalBytes: number }) => void) => void;
      onDownloadAdded: (callback: (download: Download) => void) => void;
      onDownloadStarted: (callback: (data: { id: string }) => void) => void;
      onDownloadCompleted: (callback: (download: Download) => void) => void;
      onDownloadFailed: (callback: (data: { id: string; error: string }) => void) => void;
      onDownloadPaused: (callback: (data: { id: string }) => void) => void;
      onDownloadResumed: (callback: (data: { id: string }) => void) => void;
      onDownloadCancelled: (callback: (data: { id: string }) => void) => void;
      onDownloadDeleted: (callback: (data: { id: string }) => void) => void;
    };
  }
}
