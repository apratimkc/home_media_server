/**
 * Core types for Home Media Server
 * These types are shared between Windows (Electron) and Android (React Native) apps
 */

// ============================================================================
// Device Types
// ============================================================================

/** A device discovered on the local network */
export interface Device {
  /** Unique identifier for the device */
  id: string;
  /** Display name (e.g., "John's PC", "My Android Phone") */
  name: string;
  /** IP address on the local network */
  ip: string;
  /** HTTP server port (default: 8765) */
  port: number;
  /** Platform type */
  platform: 'windows' | 'android';
  /** Last time the device was seen online */
  lastSeen: Date;
  /** Whether the device is currently online */
  isOnline: boolean;
  /** Number of shared files (if known) */
  sharedFilesCount?: number;
}

// ============================================================================
// File Types
// ============================================================================

/** Supported media types */
export type MediaType = 'video' | 'audio' | 'image' | 'document' | 'other';

/** A file or folder in a shared directory */
export interface MediaFile {
  /** Unique identifier (hash of full path) */
  id: string;
  /** File or folder name */
  name: string;
  /** Relative path from share root */
  path: string;
  /** Whether this is a file or folder */
  type: 'file' | 'folder';
  /** File size in bytes (undefined for folders) */
  size?: number;
  /** MIME type (e.g., "video/mp4") */
  mimeType?: string;
  /** Detected media type */
  mediaType?: MediaType;
  /** Last modified date */
  modifiedAt: Date;
  /** Child items (for folders only) */
  children?: MediaFile[];
  /** Parent folder ID */
  parentId?: string;
}

/** Episode information parsed from filename */
export interface EpisodeInfo {
  /** Show/series name */
  showName: string;
  /** Season number */
  season: number;
  /** Episode number */
  episode: number;
  /** The original matched pattern */
  matchedPattern: string;
}

// ============================================================================
// Download Types
// ============================================================================

/** Download status */
export type DownloadStatus = 'queued' | 'downloading' | 'paused' | 'completed' | 'failed';

/** A download record */
export interface Download {
  /** Unique download ID */
  id: string;
  /** ID of the file being downloaded */
  fileId: string;
  /** File name */
  fileName: string;
  /** Device the file is being downloaded from */
  sourceDeviceId: string;
  /** Name of source device (cached for offline display) */
  sourceDeviceName: string;
  /** Remote path on the source device */
  remotePath: string;
  /** Local path where file is saved */
  localPath?: string;
  /** Total file size in bytes */
  totalBytes: number;
  /** Bytes downloaded so far */
  downloadedBytes: number;
  /** Current status */
  status: DownloadStatus;
  /** When the download was started */
  startedAt?: Date;
  /** When the download completed */
  completedAt?: Date;
  /** When this download will be auto-deleted */
  expiresAt?: Date;
  /** Error message if failed */
  error?: string;
  /** Whether this was triggered by auto-download */
  isAutoDownload: boolean;
  /** Download progress (0-100) */
  progress: number;
}

/** Auto-download queue item */
export interface AutoDownloadItem {
  /** Queue item ID */
  id: string;
  /** The file currently being played */
  playingFileId: string;
  /** Device the file is from */
  deviceId: string;
  /** Files queued for auto-download (current + next 2) */
  queuedFileIds: string[];
  /** How files were detected */
  detectionMethod: 'episode' | 'alphabetical';
  /** When this was created */
  createdAt: Date;
}

// ============================================================================
// Share Configuration Types
// ============================================================================

/** Folder sharing configuration */
export interface SharedFolder {
  /** Unique ID */
  id: string;
  /** Full local path */
  path: string;
  /** Display alias (e.g., "Movies" instead of full path) */
  alias: string;
  /** Whether this folder is currently being shared */
  enabled: boolean;
  /** When this folder was added */
  addedAt: Date;
}

/** App sharing settings */
export interface ShareConfig {
  /** Whether sharing is enabled */
  isEnabled: boolean;
  /** List of shared folders */
  sharedFolders: SharedFolder[];
  /** Device display name */
  deviceName: string;
  /** HTTP server port */
  port: number;
}

// ============================================================================
// API Response Types
// ============================================================================

/** Device info response */
export interface DeviceInfoResponse {
  deviceId: string;
  deviceName: string;
  platform: 'windows' | 'android';
  version: string;
  sharedFoldersCount: number;
  totalFiles: number;
}

/** File listing response */
export interface FileListResponse {
  path: string;
  items: MediaFile[];
  totalCount: number;
}

/** File siblings response (for auto-download) */
export interface FileSiblingsResponse {
  currentFile: MediaFile;
  siblings: MediaFile[];
  folderPath: string;
}

// ============================================================================
// App Settings Types
// ============================================================================

/** User-configurable settings */
export interface AppSettings {
  /** Device name shown to others */
  deviceName: string;
  /** Auto-download enabled */
  autoDownloadEnabled: boolean;
  /** Days before auto-deleting downloads */
  autoDeleteDays: number;
  /** Default download location */
  downloadPath: string;
  /** Server port */
  serverPort: number;
}

/** Default settings */
export const DEFAULT_SETTINGS: AppSettings = {
  deviceName: 'My Device',
  autoDownloadEnabled: true,
  autoDeleteDays: 10,
  downloadPath: '',
  serverPort: 8765,
};

// ============================================================================
// Constants
// ============================================================================

/** mDNS service type */
export const MDNS_SERVICE_TYPE = '_homemedia._tcp';

/** Default server port */
export const DEFAULT_PORT = 8765;

/** API version */
export const API_VERSION = 'v1';

/** Supported video extensions */
export const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v'];

/** Supported audio extensions */
export const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a'];

/** Supported image extensions */
export const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
