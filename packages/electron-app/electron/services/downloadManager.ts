/**
 * Download Manager Service
 * Handles downloading files from remote devices with progress tracking, pause/resume support
 */

import { BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import crypto from 'crypto';
import type { Download, DownloadStatus } from '@home-media-server/shared';
import { getSetting } from '../database/settings';
import * as downloadsDb from '../database/downloads';

// Maximum concurrent downloads
const MAX_CONCURRENT_DOWNLOADS = 3;

// Active download streams (for pause/cancel)
const activeStreams = new Map<string, { request: http.ClientRequest; writeStream: fs.WriteStream }>();

// Queue of pending downloads
let downloadQueue: string[] = [];

// Currently downloading count
let activeDownloads = 0;

// Main window reference for sending events
let mainWindow: BrowserWindow | null = null;

/**
 * Initialize the download manager
 */
export function initDownloadManager(window: BrowserWindow): void {
  mainWindow = window;

  // Resume any interrupted downloads on startup
  const activeDownloadsFromDb = downloadsDb.getActiveDownloads();
  for (const download of activeDownloadsFromDb) {
    if (download.status === 'downloading') {
      // Reset to queued so they get picked up again
      downloadsDb.updateDownloadStatus(download.id, 'queued');
    }
    downloadQueue.push(download.id);
  }

  // Start processing queue
  processQueue();
}

/**
 * Send download event to renderer
 */
function emitDownloadEvent(event: string, data: unknown): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(event, data);
  }
}

/**
 * Start a new download
 */
export async function startDownload(params: {
  fileId: string;
  fileName: string;
  sourceDeviceId: string;
  sourceDeviceName: string;
  sourceDeviceIp: string;
  sourceDevicePort: number;
  remotePath: string;
  totalBytes: number;
  isAutoDownload?: boolean;
}): Promise<Download> {
  // Check if already downloading this file
  const existing = downloadsDb.isFileDownloaded(params.fileId, params.sourceDeviceId);
  if (existing) {
    return existing;
  }

  // Create download record
  const downloadId = crypto.randomUUID();

  downloadsDb.createDownload({
    id: downloadId,
    fileId: params.fileId,
    fileName: params.fileName,
    sourceDeviceId: params.sourceDeviceId,
    sourceDeviceName: params.sourceDeviceName,
    remotePath: params.remotePath,
    totalBytes: params.totalBytes,
    isAutoDownload: params.isAutoDownload,
  });

  // Store device connection info in memory for this download
  downloadConnectionInfo.set(downloadId, {
    ip: params.sourceDeviceIp,
    port: params.sourceDevicePort,
  });

  // Add to queue
  downloadQueue.push(downloadId);

  // Get the created download
  const download = downloadsDb.getDownloadById(downloadId)!;

  // Emit event
  emitDownloadEvent('download-added', download);

  // Process queue
  processQueue();

  return download;
}

// Store connection info for downloads (ip/port not in DB)
const downloadConnectionInfo = new Map<string, { ip: string; port: number }>();

/**
 * Process the download queue
 */
function processQueue(): void {
  while (activeDownloads < MAX_CONCURRENT_DOWNLOADS && downloadQueue.length > 0) {
    const downloadId = downloadQueue.shift()!;
    const download = downloadsDb.getDownloadById(downloadId);

    if (!download || download.status === 'paused' || download.status === 'completed') {
      continue;
    }

    processDownload(downloadId);
  }
}

/**
 * Process a single download
 */
async function processDownload(downloadId: string): Promise<void> {
  const download = downloadsDb.getDownloadById(downloadId);
  if (!download) return;

  const connectionInfo = downloadConnectionInfo.get(downloadId);
  if (!connectionInfo) {
    downloadsDb.updateDownloadStatus(downloadId, 'failed', 'Connection info not found');
    emitDownloadEvent('download-failed', { id: downloadId, error: 'Connection info not found' });
    return;
  }

  activeDownloads++;
  downloadsDb.updateDownloadStatus(downloadId, 'downloading');
  emitDownloadEvent('download-started', { id: downloadId });

  try {
    // Get download path from settings
    const downloadPath = getSetting<string>('downloadPath') || path.join(process.env.USERPROFILE || '', 'Downloads', 'Home Media Server');

    // Ensure directory exists
    if (!fs.existsSync(downloadPath)) {
      fs.mkdirSync(downloadPath, { recursive: true });
    }

    // Create local file path
    const localPath = path.join(downloadPath, download.fileName);
    const tempPath = `${localPath}.download`;

    // Check if we have partial download
    let startByte = 0;
    if (fs.existsSync(tempPath)) {
      const stats = fs.statSync(tempPath);
      startByte = stats.size;
    }

    // Build download URL
    const url = `http://${connectionInfo.ip}:${connectionInfo.port}/api/v1/download/${download.fileId}`;

    await downloadFile(downloadId, url, tempPath, localPath, startByte, download.totalBytes);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    downloadsDb.updateDownloadStatus(downloadId, 'failed', errorMessage);
    emitDownloadEvent('download-failed', { id: downloadId, error: errorMessage });
  } finally {
    activeDownloads--;
    activeStreams.delete(downloadId);
    processQueue();
  }
}

/**
 * Download a file with progress tracking
 */
function downloadFile(
  downloadId: string,
  url: string,
  tempPath: string,
  finalPath: string,
  startByte: number,
  totalBytes: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const httpModule = urlObj.protocol === 'https:' ? https : http;

    const options: http.RequestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'GET',
      headers: startByte > 0 ? { Range: `bytes=${startByte}-` } : {},
    };

    const writeStream = fs.createWriteStream(tempPath, {
      flags: startByte > 0 ? 'a' : 'w',
    });

    const request = httpModule.request(options, (response) => {
      if (response.statusCode !== 200 && response.statusCode !== 206) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }

      let downloadedBytes = startByte;
      let lastEmitTime = Date.now();

      response.on('data', (chunk: Buffer) => {
        downloadedBytes += chunk.length;

        // Throttle progress updates to every 100ms
        const now = Date.now();
        if (now - lastEmitTime >= 100) {
          const progress = (downloadedBytes / totalBytes) * 100;
          downloadsDb.updateDownloadProgress(downloadId, downloadedBytes);
          emitDownloadEvent('download-progress', {
            id: downloadId,
            progress,
            downloadedBytes,
            totalBytes,
          });
          lastEmitTime = now;
        }
      });

      response.pipe(writeStream);

      writeStream.on('finish', () => {
        // Rename temp file to final path
        try {
          if (fs.existsSync(finalPath)) {
            fs.unlinkSync(finalPath);
          }
          fs.renameSync(tempPath, finalPath);

          // Calculate expiration date
          const autoDeleteDays = getSetting<number>('autoDeleteDays') || 10;
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + autoDeleteDays);

          // Mark as completed
          downloadsDb.completeDownload(downloadId, finalPath, expiresAt.toISOString());

          const completedDownload = downloadsDb.getDownloadById(downloadId);
          emitDownloadEvent('download-completed', completedDownload);

          resolve();
        } catch (error) {
          reject(error);
        }
      });

      writeStream.on('error', (error) => {
        reject(error);
      });
    });

    request.on('error', (error) => {
      writeStream.close();
      reject(error);
    });

    // Store for pause/cancel
    activeStreams.set(downloadId, { request, writeStream });

    request.end();
  });
}

/**
 * Pause a download
 */
export function pauseDownload(downloadId: string): boolean {
  const stream = activeStreams.get(downloadId);
  if (stream) {
    stream.request.destroy();
    stream.writeStream.close();
    activeStreams.delete(downloadId);
    activeDownloads--;
  }

  // Remove from queue if queued
  downloadQueue = downloadQueue.filter(id => id !== downloadId);

  downloadsDb.pauseDownload(downloadId);
  emitDownloadEvent('download-paused', { id: downloadId });

  return true;
}

/**
 * Resume a paused download
 */
export function resumeDownload(downloadId: string): boolean {
  const download = downloadsDb.getDownloadById(downloadId);
  if (!download || download.status !== 'paused') {
    return false;
  }

  downloadsDb.resumeDownload(downloadId);
  downloadQueue.push(downloadId);
  emitDownloadEvent('download-resumed', { id: downloadId });

  processQueue();

  return true;
}

/**
 * Cancel a download
 */
export function cancelDownload(downloadId: string): boolean {
  // Stop if active
  const stream = activeStreams.get(downloadId);
  if (stream) {
    stream.request.destroy();
    stream.writeStream.close();
    activeStreams.delete(downloadId);
    activeDownloads--;
  }

  // Remove from queue
  downloadQueue = downloadQueue.filter(id => id !== downloadId);

  // Get download to find temp file
  const download = downloadsDb.getDownloadById(downloadId);
  if (download) {
    // Delete temp file if exists
    const downloadPath = getSetting<string>('downloadPath') || path.join(process.env.USERPROFILE || '', 'Downloads', 'Home Media Server');
    const tempPath = path.join(downloadPath, `${download.fileName}.download`);
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }

  // Remove from database
  downloadsDb.deleteDownload(downloadId);
  downloadConnectionInfo.delete(downloadId);

  emitDownloadEvent('download-cancelled', { id: downloadId });

  processQueue();

  return true;
}

/**
 * Retry a failed download
 */
export function retryDownload(downloadId: string): boolean {
  const download = downloadsDb.getDownloadById(downloadId);
  if (!download || download.status !== 'failed') {
    return false;
  }

  // Reset status
  downloadsDb.updateDownloadStatus(downloadId, 'queued');
  downloadQueue.push(downloadId);

  emitDownloadEvent('download-retrying', { id: downloadId });

  processQueue();

  return true;
}

/**
 * Delete a completed download (file and record)
 */
export function deleteDownload(downloadId: string): boolean {
  const download = downloadsDb.getDownloadById(downloadId);
  if (!download) {
    return false;
  }

  // Delete local file if exists
  if (download.localPath && fs.existsSync(download.localPath)) {
    fs.unlinkSync(download.localPath);
  }

  // Remove from database
  downloadsDb.deleteDownload(downloadId);
  downloadConnectionInfo.delete(downloadId);

  emitDownloadEvent('download-deleted', { id: downloadId });

  return true;
}

/**
 * Get all downloads
 */
export function getAllDownloads(): Download[] {
  return downloadsDb.getAllDownloads();
}

/**
 * Get download by ID
 */
export function getDownload(downloadId: string): Download | null {
  return downloadsDb.getDownloadById(downloadId);
}

/**
 * Open downloaded file with VLC
 */
export function openDownloadWithVLC(downloadId: string): boolean {
  const download = downloadsDb.getDownloadById(downloadId);
  if (!download || !download.localPath || !fs.existsSync(download.localPath)) {
    return false;
  }

  // This will be handled by the existing VLC launcher
  return true;
}

/**
 * Cleanup - called on app exit
 */
export function cleanup(): void {
  // Cancel all active downloads
  for (const [downloadId, stream] of activeStreams) {
    stream.request.destroy();
    stream.writeStream.close();
    downloadsDb.pauseDownload(downloadId);
  }
  activeStreams.clear();
  downloadQueue = [];
  activeDownloads = 0;
}