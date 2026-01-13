import { useEffect, useState, useCallback } from 'react';
import { formatFileSize } from '@home-media-server/shared';

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

function DownloadsPage() {
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [loading, setLoading] = useState(true);

  // Load downloads from backend
  const loadDownloads = useCallback(async () => {
    try {
      const data = await window.electronAPI.getDownloads();
      setDownloads(data);
    } catch (error) {
      console.error('Failed to load downloads:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Set up event listeners
  useEffect(() => {
    loadDownloads();

    // Listen for download events
    window.electronAPI.onDownloadAdded((download) => {
      setDownloads((prev) => [download, ...prev]);
    });

    window.electronAPI.onDownloadProgress((data) => {
      setDownloads((prev) =>
        prev.map((d) =>
          d.id === data.id
            ? { ...d, progress: data.progress, downloadedBytes: data.downloadedBytes, status: 'downloading' }
            : d
        )
      );
    });

    window.electronAPI.onDownloadCompleted((download) => {
      setDownloads((prev) =>
        prev.map((d) => (d.id === download.id ? download : d))
      );
    });

    window.electronAPI.onDownloadFailed((data) => {
      setDownloads((prev) =>
        prev.map((d) =>
          d.id === data.id ? { ...d, status: 'failed', error: data.error } : d
        )
      );
    });

    window.electronAPI.onDownloadPaused((data) => {
      setDownloads((prev) =>
        prev.map((d) => (d.id === data.id ? { ...d, status: 'paused' } : d))
      );
    });

    window.electronAPI.onDownloadResumed((data) => {
      setDownloads((prev) =>
        prev.map((d) => (d.id === data.id ? { ...d, status: 'queued' } : d))
      );
    });

    window.electronAPI.onDownloadCancelled((data) => {
      setDownloads((prev) => prev.filter((d) => d.id !== data.id));
    });

    window.electronAPI.onDownloadDeleted((data) => {
      setDownloads((prev) => prev.filter((d) => d.id !== data.id));
    });
  }, [loadDownloads]);

  const activeDownloads = downloads.filter(
    (d) => d.status === 'downloading' || d.status === 'queued' || d.status === 'paused'
  );
  const completedDownloads = downloads.filter((d) => d.status === 'completed');
  const failedDownloads = downloads.filter((d) => d.status === 'failed');

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'downloading':
        return 'Downloading';
      case 'queued':
        return 'Queued';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'paused':
        return 'Paused';
      default:
        return status;
    }
  };

  const formatExpiry = (expiresAt?: string): string => {
    if (!expiresAt) return '';
    const now = new Date();
    const expiry = new Date(expiresAt);
    const days = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 0) return 'Expires today';
    if (days === 1) return 'Expires tomorrow';
    return `Expires in ${days} days`;
  };

  const handlePause = async (downloadId: string) => {
    await window.electronAPI.pauseDownload(downloadId);
  };

  const handleResume = async (downloadId: string) => {
    await window.electronAPI.resumeDownload(downloadId);
  };

  const handleCancel = async (downloadId: string) => {
    await window.electronAPI.cancelDownload(downloadId);
  };

  const handleRetry = async (downloadId: string) => {
    await window.electronAPI.retryDownload(downloadId);
  };

  const handleDelete = async (downloadId: string) => {
    await window.electronAPI.deleteDownload(downloadId);
  };

  const handlePlay = async (downloadId: string) => {
    await window.electronAPI.openDownloadWithVLC(downloadId);
  };

  const handleClearCompleted = async () => {
    for (const download of completedDownloads) {
      await window.electronAPI.deleteDownload(download.id);
    }
  };

  const handleRunCleanup = async () => {
    const result = await window.electronAPI.runCleanup();
    if (result.deletedCount > 0) {
      loadDownloads();
    }
  };

  if (loading) {
    return (
      <div className="downloads-page">
        <div className="page-header">
          <h2>Downloads</h2>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="downloads-page">
      <div className="page-header">
        <h2>Downloads</h2>
        <p>Manage your downloaded files</p>
      </div>

      {/* Active Downloads */}
      {activeDownloads.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <h3 className="card-title">Active Downloads ({activeDownloads.length})</h3>
          </div>
          <div>
            {activeDownloads.map((download) => (
              <div key={download.id} className="download-item">
                <div className="header">
                  <div>
                    <div className="name">{download.fileName}</div>
                    <div className="source">From: {download.sourceDeviceName}</div>
                  </div>
                  <span className="status">{getStatusLabel(download.status)}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress" style={{ width: `${download.progress}%` }}></div>
                </div>
                <div className="footer">
                  <span>
                    {formatFileSize(download.downloadedBytes)} / {formatFileSize(download.totalBytes)}
                    {' '}({download.progress.toFixed(1)}%)
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {download.status === 'downloading' && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handlePause(download.id)}
                      >
                        Pause
                      </button>
                    )}
                    {(download.status === 'paused' || download.status === 'queued') && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleResume(download.id)}
                      >
                        {download.status === 'paused' ? 'Resume' : 'Start'}
                      </button>
                    )}
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleCancel(download.id)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Downloads */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3 className="card-title">Completed ({completedDownloads.length})</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            {completedDownloads.length > 0 && (
              <>
                <button className="btn btn-secondary btn-sm" onClick={handleRunCleanup}>
                  Clean Expired
                </button>
                <button className="btn btn-secondary btn-sm" onClick={handleClearCompleted}>
                  Clear All
                </button>
              </>
            )}
          </div>
        </div>
        {completedDownloads.length === 0 ? (
          <div className="empty-state" style={{ padding: 40 }}>
            <div className="icon">📥</div>
            <h3>No completed downloads</h3>
            <p>Your completed downloads will appear here</p>
          </div>
        ) : (
          <div>
            {completedDownloads.map((download) => (
              <div key={download.id} className="download-item">
                <div className="header">
                  <div>
                    <div className="name">{download.fileName}</div>
                    <div className="source">From: {download.sourceDeviceName}</div>
                  </div>
                  <span className="status completed">Completed</span>
                </div>
                <div className="footer">
                  <span>
                    {formatFileSize(download.totalBytes)}
                    {download.isAutoDownload && ' • Auto-downloaded'}
                    {download.expiresAt && ` • ${formatExpiry(download.expiresAt)}`}
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handlePlay(download.id)}
                    >
                      Play
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(download.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Failed Downloads */}
      {failedDownloads.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Failed ({failedDownloads.length})</h3>
          </div>
          <div>
            {failedDownloads.map((download) => (
              <div key={download.id} className="download-item">
                <div className="header">
                  <div>
                    <div className="name">{download.fileName}</div>
                    <div className="source" style={{ color: 'var(--error-color)' }}>
                      {download.error || 'Download failed'}
                    </div>
                  </div>
                  <span className="status failed">Failed</span>
                </div>
                <div className="footer">
                  <span>{formatFileSize(download.totalBytes)}</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleRetry(download.id)}
                    >
                      Retry
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(download.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {downloads.length === 0 && (
        <div className="empty-state">
          <div className="icon">📥</div>
          <h3>No downloads yet</h3>
          <p>Download files from other devices to see them here</p>
        </div>
      )}
    </div>
  );
}

export default DownloadsPage;
