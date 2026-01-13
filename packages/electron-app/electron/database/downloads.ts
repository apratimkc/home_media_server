/**
 * Downloads database operations
 */

import { runQuery, execQuery } from './index';
import type { Download, DownloadStatus } from '@home-media-server/shared';

export interface CreateDownloadParams {
  id: string;
  fileId: string;
  fileName: string;
  sourceDeviceId: string;
  sourceDeviceName: string;
  remotePath: string;
  totalBytes: number;
  isAutoDownload?: boolean;
}

/**
 * Create a new download record
 */
export function createDownload(params: CreateDownloadParams): void {
  runQuery(
    `INSERT INTO downloads (id, file_id, file_name, source_device_id, source_device_name, remote_path, total_bytes, is_auto_download, status, started_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'queued', datetime('now'))`,
    [
      params.id,
      params.fileId,
      params.fileName,
      params.sourceDeviceId,
      params.sourceDeviceName,
      params.remotePath,
      params.totalBytes,
      params.isAutoDownload ? 1 : 0,
    ]
  );
}

/**
 * Get a download by ID
 */
export function getDownloadById(id: string): Download | null {
  const rows = execQuery('SELECT * FROM downloads WHERE id = ?', [id]);
  if (rows.length === 0) return null;
  return rowToDownload(rows[0]);
}

/**
 * Get all downloads
 */
export function getAllDownloads(): Download[] {
  const rows = execQuery('SELECT * FROM downloads ORDER BY started_at DESC');
  return rows.map(rowToDownload);
}

/**
 * Get downloads by status
 */
export function getDownloadsByStatus(status: DownloadStatus): Download[] {
  const rows = execQuery('SELECT * FROM downloads WHERE status = ? ORDER BY started_at DESC', [status]);
  return rows.map(rowToDownload);
}

/**
 * Get active downloads (queued or downloading)
 */
export function getActiveDownloads(): Download[] {
  const rows = execQuery(
    "SELECT * FROM downloads WHERE status IN ('queued', 'downloading') ORDER BY started_at ASC"
  );
  return rows.map(rowToDownload);
}

/**
 * Update download progress
 */
export function updateDownloadProgress(id: string, downloadedBytes: number): void {
  runQuery('UPDATE downloads SET downloaded_bytes = ?, status = ? WHERE id = ?', [
    downloadedBytes,
    'downloading',
    id,
  ]);
}

/**
 * Update download status
 */
export function updateDownloadStatus(id: string, status: DownloadStatus, error?: string): void {
  if (error) {
    runQuery('UPDATE downloads SET status = ?, error = ? WHERE id = ?', [status, error, id]);
  } else {
    runQuery('UPDATE downloads SET status = ?, error = NULL WHERE id = ?', [status, id]);
  }
}

/**
 * Complete a download
 */
export function completeDownload(id: string, localPath: string, expiresAt: string): void {
  runQuery(
    `UPDATE downloads SET
      status = 'completed',
      local_path = ?,
      completed_at = datetime('now'),
      expires_at = ?,
      downloaded_bytes = total_bytes
     WHERE id = ?`,
    [localPath, expiresAt, id]
  );
}

/**
 * Pause a download
 */
export function pauseDownload(id: string): void {
  runQuery("UPDATE downloads SET status = 'paused' WHERE id = ?", [id]);
}

/**
 * Resume a download (set back to queued for processing)
 */
export function resumeDownload(id: string): void {
  runQuery("UPDATE downloads SET status = 'queued' WHERE id = ?", [id]);
}

/**
 * Delete a download record
 */
export function deleteDownload(id: string): void {
  runQuery('DELETE FROM downloads WHERE id = ?', [id]);
}

/**
 * Get expired downloads
 */
export function getExpiredDownloads(): Download[] {
  const rows = execQuery(
    "SELECT * FROM downloads WHERE status = 'completed' AND expires_at IS NOT NULL AND expires_at < datetime('now')"
  );
  return rows.map(rowToDownload);
}

/**
 * Clear all completed downloads
 */
export function clearCompletedDownloads(): void {
  runQuery("DELETE FROM downloads WHERE status = 'completed'");
}

/**
 * Check if a file is already being downloaded or completed
 */
export function isFileDownloaded(fileId: string, sourceDeviceId: string): Download | null {
  const rows = execQuery(
    "SELECT * FROM downloads WHERE file_id = ? AND source_device_id = ? AND status IN ('queued', 'downloading', 'completed')",
    [fileId, sourceDeviceId]
  );
  if (rows.length === 0) return null;
  return rowToDownload(rows[0]);
}

/**
 * Get download count by status
 */
export function getDownloadCounts(): Record<DownloadStatus, number> {
  const counts: Record<DownloadStatus, number> = {
    queued: 0,
    downloading: 0,
    paused: 0,
    completed: 0,
    failed: 0,
  };

  const rows = execQuery('SELECT status, COUNT(*) as count FROM downloads GROUP BY status');
  for (const row of rows) {
    const status = row[0] as DownloadStatus;
    const count = row[1] as number;
    counts[status] = count;
  }

  return counts;
}

/**
 * Convert database row to Download object
 */
function rowToDownload(row: unknown[]): Download {
  const totalBytes = row[7] as number;
  const downloadedBytes = row[8] as number;
  const progress = totalBytes > 0 ? (downloadedBytes / totalBytes) * 100 : 0;

  return {
    id: row[0] as string,
    fileId: row[1] as string,
    fileName: row[2] as string,
    sourceDeviceId: row[3] as string,
    sourceDeviceName: row[4] as string,
    remotePath: row[5] as string,
    localPath: (row[6] as string) || undefined,
    totalBytes,
    downloadedBytes,
    status: row[9] as DownloadStatus,
    progress,
    startedAt: (row[10] as string) || undefined,
    completedAt: (row[11] as string) || undefined,
    expiresAt: (row[12] as string) || undefined,
    isAutoDownload: (row[13] as number) === 1,
    error: (row[14] as string) || undefined,
  };
}