/**
 * Auto-Download Manager Service
 * Automatically queues downloads for next episodes when a file starts playing
 */

import crypto from 'crypto';
import type { MediaFile, AutoDownloadItem } from '@home-media-server/shared';
import { findFilesToAutoDownload } from '@home-media-server/shared';
import { getSetting } from '../database/settings';
import * as downloadManager from './downloadManager';
import * as downloadsDb from '../database/downloads';

// Current auto-download queue
let autoDownloadQueue: AutoDownloadItem[] = [];

// Currently playing file info
let currentlyPlaying: {
  fileId: string;
  fileName: string;
  deviceId: string;
  deviceIp: string;
  devicePort: number;
  deviceName: string;
} | null = null;

/**
 * Set the currently playing file and trigger auto-download
 */
export async function setPlayingFile(params: {
  fileId: string;
  fileName: string;
  deviceId: string;
  deviceIp: string;
  devicePort: number;
  deviceName: string;
}): Promise<void> {
  // Check if auto-download is enabled
  const autoDownloadEnabled = getSetting<boolean>('autoDownloadEnabled');
  if (!autoDownloadEnabled) {
    return;
  }

  // If same file is already playing, don't re-trigger
  if (currentlyPlaying?.fileId === params.fileId) {
    return;
  }

  currentlyPlaying = params;

  // Fetch siblings from the device
  try {
    const siblings = await fetchFileSiblings(params.deviceIp, params.devicePort, params.fileId);
    if (!siblings || siblings.length === 0) {
      return;
    }

    // Find current file
    const currentFile = siblings.find(f => f.id === params.fileId);
    if (!currentFile) {
      return;
    }

    // Find files to auto-download (current + next 2)
    const { files: filesToDownload, method } = findFilesToAutoDownload(currentFile, siblings);

    if (filesToDownload.length === 0) {
      return;
    }

    // Create auto-download queue item
    const queueItem: AutoDownloadItem = {
      id: crypto.randomUUID(),
      playingFileId: params.fileId,
      deviceId: params.deviceId,
      queuedFileIds: filesToDownload.map(f => f.id),
      detectionMethod: method,
      createdAt: new Date(),
    };

    // Add to queue
    autoDownloadQueue.push(queueItem);

    // Start downloads for each file
    for (const file of filesToDownload) {
      // Check if already downloaded
      const existing = downloadsDb.isFileDownloaded(file.id, params.deviceId);
      if (existing) {
        continue;
      }

      // Start download
      await downloadManager.startDownload({
        fileId: file.id,
        fileName: file.name,
        sourceDeviceId: params.deviceId,
        sourceDeviceName: params.deviceName,
        sourceDeviceIp: params.deviceIp,
        sourceDevicePort: params.devicePort,
        remotePath: file.path,
        totalBytes: file.size || 0,
        isAutoDownload: true,
      });
    }
  } catch (error) {
    console.error('Auto-download error:', error);
  }
}

/**
 * Fetch file siblings from a device
 */
async function fetchFileSiblings(ip: string, port: number, fileId: string): Promise<MediaFile[]> {
  try {
    const response = await fetch(`http://${ip}:${port}/api/v1/siblings/${fileId}`);
    if (!response.ok) {
      // Try alternative: fetch all files and find siblings manually
      const filesResponse = await fetch(`http://${ip}:${port}/api/v1/files`);
      if (!filesResponse.ok) {
        return [];
      }
      const data = await filesResponse.json();
      return data.items || [];
    }
    const data = await response.json();
    return data.siblings || [];
  } catch {
    return [];
  }
}

/**
 * Get the current auto-download queue
 */
export function getQueue(): AutoDownloadItem[] {
  return autoDownloadQueue;
}

/**
 * Clear the auto-download queue
 */
export function clearQueue(): void {
  autoDownloadQueue = [];
  currentlyPlaying = null;
}

/**
 * Remove a specific item from the queue
 */
export function removeFromQueue(itemId: string): boolean {
  const index = autoDownloadQueue.findIndex(item => item.id === itemId);
  if (index !== -1) {
    autoDownloadQueue.splice(index, 1);
    return true;
  }
  return false;
}

/**
 * Get currently playing file info
 */
export function getCurrentlyPlaying(): typeof currentlyPlaying {
  return currentlyPlaying;
}
