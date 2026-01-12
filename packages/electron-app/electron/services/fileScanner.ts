/**
 * File Scanner Service
 * Scans shared folders and builds file metadata
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import mime from 'mime-types';

interface ScannedFile {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  size?: number;
  mimeType?: string;
  mediaType?: 'video' | 'audio' | 'image' | 'document' | 'other';
  modifiedAt: Date;
  localPath?: string;
  children?: ScannedFile[];
  parentId?: string;
}

// Cache for file lookups by ID
const fileCache: Map<string, ScannedFile & { localPath: string }> = new Map();

// Video extensions
const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v'];
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];

/**
 * Generate a unique ID for a file path
 */
function generateFileId(filePath: string): string {
  return crypto.createHash('md5').update(filePath).digest('hex').substring(0, 16);
}

/**
 * Get media type from extension
 */
function getMediaType(filename: string): 'video' | 'audio' | 'image' | 'document' | 'other' {
  const ext = path.extname(filename).toLowerCase();
  if (VIDEO_EXTENSIONS.includes(ext)) return 'video';
  if (AUDIO_EXTENSIONS.includes(ext)) return 'audio';
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
  if (['.pdf', '.doc', '.docx', '.txt'].includes(ext)) return 'document';
  return 'other';
}

/**
 * Scan a folder and return file metadata
 */
export function scanFolder(
  folderPath: string,
  rootFolderId?: string,
  basePath: string = ''
): ScannedFile[] {
  const files: ScannedFile[] = [];

  try {
    const entries = fs.readdirSync(folderPath, { withFileTypes: true });

    for (const entry of entries) {
      // Skip hidden files and system files
      if (entry.name.startsWith('.') || entry.name.startsWith('$')) {
        continue;
      }

      const fullPath = path.join(folderPath, entry.name);
      const relativePath = basePath ? `${basePath}/${entry.name}` : `/${entry.name}`;
      const fileId = generateFileId(fullPath);

      try {
        const stats = fs.statSync(fullPath);

        if (entry.isDirectory()) {
          files.push({
            id: fileId,
            name: entry.name,
            path: relativePath,
            type: 'folder',
            modifiedAt: stats.mtime,
            parentId: rootFolderId,
          });
        } else {
          const mimeType = mime.lookup(fullPath) || 'application/octet-stream';
          const mediaType = getMediaType(entry.name);

          const file: ScannedFile & { localPath: string } = {
            id: fileId,
            name: entry.name,
            path: relativePath,
            type: 'file',
            size: stats.size,
            mimeType,
            mediaType,
            modifiedAt: stats.mtime,
            localPath: fullPath,
            parentId: rootFolderId,
          };

          files.push(file);

          // Cache for quick lookup
          fileCache.set(fileId, file);
        }
      } catch (err) {
        console.error(`Error reading ${fullPath}:`, err);
      }
    }

    // Sort: folders first, then alphabetically
    files.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });
  } catch (err) {
    console.error(`Error scanning folder ${folderPath}:`, err);
  }

  return files;
}

/**
 * Get file by ID from cache
 */
export function getFileById(fileId: string): (ScannedFile & { localPath: string }) | null {
  return fileCache.get(fileId) || null;
}

/**
 * Get siblings of a file (files in the same folder)
 */
export function getFileSiblings(
  fileId: string
): { currentFile: ScannedFile; siblings: ScannedFile[]; folderPath: string } | null {
  const file = fileCache.get(fileId);
  if (!file || !file.localPath) {
    return null;
  }

  const folderPath = path.dirname(file.localPath);
  const siblings = scanFolder(folderPath);

  return {
    currentFile: file,
    siblings: siblings.filter((f) => f.type === 'file'),
    folderPath,
  };
}

/**
 * Clear file cache
 */
export function clearFileCache(): void {
  fileCache.clear();
}

/**
 * Refresh file cache for a specific folder
 */
export function refreshFolder(folderPath: string): void {
  // Remove cached files for this folder
  for (const [id, file] of fileCache.entries()) {
    if (file.localPath?.startsWith(folderPath)) {
      fileCache.delete(id);
    }
  }

  // Re-scan the folder
  scanFolder(folderPath);
}
