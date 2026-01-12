import { useDownloadsStore, formatFileSize } from '@home-media-server/shared';

function DownloadsPage() {
  const downloads = useDownloadsStore((state) => state.downloads);
  const removeDownload = useDownloadsStore((state) => state.removeDownload);
  const pauseDownload = useDownloadsStore((state) => state.pauseDownload);
  const resumeDownload = useDownloadsStore((state) => state.resumeDownload);
  const clearCompleted = useDownloadsStore((state) => state.clearCompleted);

  const activeDownloads = downloads.filter(
    (d) => d.status === 'downloading' || d.status === 'queued'
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

  const formatExpiry = (expiresAt?: Date): string => {
    if (!expiresAt) return '';
    const now = new Date();
    const expiry = new Date(expiresAt);
    const days = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 0) return 'Expires today';
    if (days === 1) return 'Expires tomorrow';
    return `Expires in ${days} days`;
  };

  const openFile = (localPath?: string) => {
    if (localPath) {
      // Open file with VLC
      window.electronAPI.openWithVLC(localPath);
    }
  };

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
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {download.status === 'downloading' && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => pauseDownload(download.id)}
                      >
                        Pause
                      </button>
                    )}
                    {download.status === 'paused' && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => resumeDownload(download.id)}
                      >
                        Resume
                      </button>
                    )}
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => removeDownload(download.id)}
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
          {completedDownloads.length > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={clearCompleted}>
              Clear All
            </button>
          )}
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
                      onClick={() => openFile(download.localPath)}
                    >
                      Play
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => removeDownload(download.id)}
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
                      onClick={() => resumeDownload(download.id)}
                    >
                      Retry
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => removeDownload(download.id)}
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
