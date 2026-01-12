/**
 * Zustand store for managing downloads
 */

import { create } from 'zustand';
import { Download, DownloadStatus } from '../api/types';

interface DownloadsState {
  /** List of all downloads */
  downloads: Download[];
  /** Currently active downloads */
  activeDownloads: Download[];

  /** Add a new download */
  addDownload: (download: Download) => void;
  /** Update download progress */
  updateProgress: (downloadId: string, downloadedBytes: number, progress: number) => void;
  /** Update download status */
  updateStatus: (downloadId: string, status: DownloadStatus, error?: string) => void;
  /** Mark download as completed */
  completeDownload: (downloadId: string, localPath: string, expiresAt: Date) => void;
  /** Remove a download */
  removeDownload: (downloadId: string) => void;
  /** Pause a download */
  pauseDownload: (downloadId: string) => void;
  /** Resume a download */
  resumeDownload: (downloadId: string) => void;
  /** Get download by ID */
  getDownload: (downloadId: string) => Download | undefined;
  /** Get downloads by status */
  getDownloadsByStatus: (status: DownloadStatus) => Download[];
  /** Clear completed downloads */
  clearCompleted: () => void;
  /** Clear expired downloads */
  clearExpired: () => void;
}

export const useDownloadsStore = create<DownloadsState>((set, get) => ({
  downloads: [],
  activeDownloads: [],

  addDownload: (download) =>
    set((state) => {
      // Check if already exists
      if (state.downloads.some((d) => d.id === download.id)) {
        return state;
      }
      const newDownloads = [...state.downloads, download];
      return {
        downloads: newDownloads,
        activeDownloads: newDownloads.filter(
          (d) => d.status === 'downloading' || d.status === 'queued'
        ),
      };
    }),

  updateProgress: (downloadId, downloadedBytes, progress) =>
    set((state) => ({
      downloads: state.downloads.map((d) =>
        d.id === downloadId ? { ...d, downloadedBytes, progress } : d
      ),
    })),

  updateStatus: (downloadId, status, error) =>
    set((state) => {
      const updated = state.downloads.map((d) =>
        d.id === downloadId
          ? {
              ...d,
              status,
              error: error ?? d.error,
              startedAt: status === 'downloading' && !d.startedAt ? new Date() : d.startedAt,
            }
          : d
      );
      return {
        downloads: updated,
        activeDownloads: updated.filter(
          (d) => d.status === 'downloading' || d.status === 'queued'
        ),
      };
    }),

  completeDownload: (downloadId, localPath, expiresAt) =>
    set((state) => {
      const updated = state.downloads.map((d) =>
        d.id === downloadId
          ? {
              ...d,
              status: 'completed' as DownloadStatus,
              localPath,
              completedAt: new Date(),
              expiresAt,
              progress: 100,
              downloadedBytes: d.totalBytes,
            }
          : d
      );
      return {
        downloads: updated,
        activeDownloads: updated.filter(
          (d) => d.status === 'downloading' || d.status === 'queued'
        ),
      };
    }),

  removeDownload: (downloadId) =>
    set((state) => {
      const updated = state.downloads.filter((d) => d.id !== downloadId);
      return {
        downloads: updated,
        activeDownloads: updated.filter(
          (d) => d.status === 'downloading' || d.status === 'queued'
        ),
      };
    }),

  pauseDownload: (downloadId) =>
    set((state) => ({
      downloads: state.downloads.map((d) =>
        d.id === downloadId && d.status === 'downloading'
          ? { ...d, status: 'paused' as DownloadStatus }
          : d
      ),
      activeDownloads: state.activeDownloads.filter((d) => d.id !== downloadId),
    })),

  resumeDownload: (downloadId) =>
    set((state) => {
      const updated = state.downloads.map((d) =>
        d.id === downloadId && d.status === 'paused'
          ? { ...d, status: 'queued' as DownloadStatus }
          : d
      );
      return {
        downloads: updated,
        activeDownloads: updated.filter(
          (d) => d.status === 'downloading' || d.status === 'queued'
        ),
      };
    }),

  getDownload: (downloadId) => get().downloads.find((d) => d.id === downloadId),

  getDownloadsByStatus: (status) => get().downloads.filter((d) => d.status === status),

  clearCompleted: () =>
    set((state) => ({
      downloads: state.downloads.filter((d) => d.status !== 'completed'),
    })),

  clearExpired: () =>
    set((state) => ({
      downloads: state.downloads.filter((d) => {
        if (!d.expiresAt) return true;
        return new Date(d.expiresAt) > new Date();
      }),
    })),
}));
