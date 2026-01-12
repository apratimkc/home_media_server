/**
 * Download Manager for React Native
 * Handles background downloads with progress tracking
 */

import RNBackgroundDownloader, { DownloadTask } from '@kesha-antonov/react-native-background-downloader';
import RNFS from 'react-native-fs';
import { useDownloadsStore, Download } from '@home-media-server/shared';

// Active download tasks
const activeTasks: Map<string, DownloadTask> = new Map();

// Download directory
const DOWNLOAD_DIR = `${RNFS.DocumentDirectoryPath}/downloads`;

/**
 * Initialize download directory
 */
export async function initDownloadDirectory(): Promise<void> {
  const exists = await RNFS.exists(DOWNLOAD_DIR);
  if (!exists) {
    await RNFS.mkdir(DOWNLOAD_DIR);
  }
}

/**
 * Start a new download
 */
export function startDownload(download: Download, url: string): void {
  const { updateProgress, updateStatus, completeDownload } = useDownloadsStore.getState();

  const destination = `${DOWNLOAD_DIR}/${download.id}_${download.fileName}`;

  const task = RNBackgroundDownloader.download({
    id: download.id,
    url: url,
    destination: destination,
  });

  task
    .begin((expectedBytes: number) => {
      console.log(`Download started: ${download.fileName}, size: ${expectedBytes}`);
      updateStatus(download.id, 'downloading');
    })
    .progress((percent: number, bytesWritten: number) => {
      const progress = Math.round(percent * 100);
      updateProgress(download.id, bytesWritten, progress);
    })
    .done(() => {
      console.log(`Download completed: ${download.fileName}`);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 10); // 10 days
      completeDownload(download.id, destination, expiresAt);
      activeTasks.delete(download.id);
    })
    .error((error: Error) => {
      console.error(`Download failed: ${download.fileName}`, error);
      updateStatus(download.id, 'failed', error.message);
      activeTasks.delete(download.id);
    });

  activeTasks.set(download.id, task);
}

/**
 * Pause a download
 */
export function pauseDownload(downloadId: string): void {
  const task = activeTasks.get(downloadId);
  if (task) {
    task.pause();
    useDownloadsStore.getState().pauseDownload(downloadId);
  }
}

/**
 * Resume a download
 */
export function resumeDownload(downloadId: string): void {
  const task = activeTasks.get(downloadId);
  if (task) {
    task.resume();
    useDownloadsStore.getState().resumeDownload(downloadId);
  }
}

/**
 * Cancel a download
 */
export function cancelDownload(downloadId: string): void {
  const task = activeTasks.get(downloadId);
  if (task) {
    task.stop();
    activeTasks.delete(downloadId);
  }
  useDownloadsStore.getState().removeDownload(downloadId);
}

/**
 * Delete a downloaded file
 */
export async function deleteDownloadedFile(localPath: string): Promise<void> {
  try {
    const exists = await RNFS.exists(localPath);
    if (exists) {
      await RNFS.unlink(localPath);
    }
  } catch (error) {
    console.error('Failed to delete file:', error);
  }
}

/**
 * Clean up expired downloads
 */
export async function cleanupExpiredDownloads(): Promise<void> {
  const { downloads, removeDownload } = useDownloadsStore.getState();
  const now = new Date();

  for (const download of downloads) {
    if (download.expiresAt && new Date(download.expiresAt) < now) {
      if (download.localPath) {
        await deleteDownloadedFile(download.localPath);
      }
      removeDownload(download.id);
    }
  }
}

/**
 * Get download directory path
 */
export function getDownloadDirectory(): string {
  return DOWNLOAD_DIR;
}

/**
 * Check available storage
 */
export async function getAvailableStorage(): Promise<{ free: number; total: number }> {
  const info = await RNFS.getFSInfo();
  return {
    free: info.freeSpace,
    total: info.totalSpace,
  };
}
