/**
 * Auto-Delete Service
 * Automatically deletes expired downloads based on the autoDeleteDays setting
 */

import * as fs from 'fs';
import * as downloadsDb from '../database/downloads';

// Scheduler interval (check every hour)
const CHECK_INTERVAL_MS = 60 * 60 * 1000;

// Scheduler timer
let schedulerTimer: NodeJS.Timeout | null = null;

/**
 * Start the auto-delete scheduler
 */
export function startScheduler(): void {
  // Run initial cleanup
  runCleanup();

  // Schedule periodic cleanup
  schedulerTimer = setInterval(() => {
    runCleanup();
  }, CHECK_INTERVAL_MS);

  console.log('Auto-delete scheduler started');
}

/**
 * Stop the auto-delete scheduler
 */
export function stopScheduler(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    console.log('Auto-delete scheduler stopped');
  }
}

/**
 * Run cleanup - delete expired downloads
 */
export async function runCleanup(): Promise<number> {
  try {
    const expiredDownloads = downloadsDb.getExpiredDownloads();

    if (expiredDownloads.length === 0) {
      return 0;
    }

    console.log(`Found ${expiredDownloads.length} expired downloads to clean up`);

    let deletedCount = 0;

    for (const download of expiredDownloads) {
      try {
        // Delete local file if exists
        if (download.localPath && fs.existsSync(download.localPath)) {
          fs.unlinkSync(download.localPath);
          console.log(`Deleted expired file: ${download.localPath}`);
        }

        // Remove from database
        downloadsDb.deleteDownload(download.id);
        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete expired download ${download.id}:`, error);
      }
    }

    console.log(`Cleaned up ${deletedCount} expired downloads`);
    return deletedCount;
  } catch (error) {
    console.error('Cleanup error:', error);
    return 0;
  }
}

/**
 * Get count of expired downloads
 */
export function getExpiredCount(): number {
  return downloadsDb.getExpiredDownloads().length;
}

/**
 * Clean up downloads older than specified days (manual override)
 */
export async function cleanupOlderThan(days: number): Promise<number> {
  try {
    const allDownloads = downloadsDb.getDownloadsByStatus('completed');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    let deletedCount = 0;

    for (const download of allDownloads) {
      if (download.completedAt && new Date(download.completedAt) < cutoffDate) {
        try {
          if (download.localPath && fs.existsSync(download.localPath)) {
            fs.unlinkSync(download.localPath);
          }
          downloadsDb.deleteDownload(download.id);
          deletedCount++;
        } catch (error) {
          console.error(`Failed to delete download ${download.id}:`, error);
        }
      }
    }

    return deletedCount;
  } catch (error) {
    console.error('Manual cleanup error:', error);
    return 0;
  }
}
