import { useState } from 'react';
import { useDevicesStore, useFilesStore, Device, MediaFile } from '@home-media-server/shared';
import { DeviceApiClient } from '@home-media-server/shared';
import { formatFileSize } from '@home-media-server/shared';

function DiscoverPage() {
  const devices = useDevicesStore((state) => state.devices);
  const selectedDevice = useDevicesStore((state) => state.selectedDevice);
  const selectDevice = useDevicesStore((state) => state.selectDevice);

  const files = useFilesStore((state) => state.files);
  const currentPath = useFilesStore((state) => state.currentPath);
  const isLoading = useFilesStore((state) => state.isLoading);
  const setFiles = useFilesStore((state) => state.setFiles);
  const navigateTo = useFilesStore((state) => state.navigateTo);
  const goBack = useFilesStore((state) => state.goBack);
  const setLoading = useFilesStore((state) => state.setLoading);
  const clear = useFilesStore((state) => state.clear);

  const [apiClient, setApiClient] = useState<DeviceApiClient | null>(null);

  const handleDeviceClick = async (device: Device) => {
    clear();
    selectDevice(device);
    const client = new DeviceApiClient(device.ip, device.port);
    setApiClient(client);

    setLoading(true);
    try {
      const response = await client.listFiles('/');
      setFiles(response.items as MediaFile[], '/');
    } catch (error) {
      console.error('Failed to load files:', error);
      setLoading(false);
    }
  };

  const handleFolderClick = async (folder: MediaFile) => {
    if (!apiClient) return;
    navigateTo(folder.path);

    try {
      const response = await apiClient.listFiles(folder.path);
      setFiles(response.items as MediaFile[], folder.path);
    } catch (error) {
      console.error('Failed to load folder:', error);
      setLoading(false);
    }
  };

  const handleBackClick = async () => {
    if (!apiClient) return;
    const previousPath = goBack();

    if (previousPath) {
      try {
        const response = await apiClient.listFiles(previousPath);
        setFiles(response.items as MediaFile[], previousPath);
      } catch (error) {
        console.error('Failed to load folder:', error);
        setLoading(false);
      }
    }
  };

  const handleFileClick = async (file: MediaFile) => {
    if (!apiClient || !selectedDevice) return;

    // Get stream URL and open with VLC
    const streamUrl = apiClient.getStreamUrl(file.id);
    const result = await window.electronAPI.openWithVLC(streamUrl);

    if (!result.success) {
      console.error('Failed to open with VLC:', result.error);
      // Fallback: just open the URL
      window.open(streamUrl, '_blank');
    }
  };

  const handleDownload = async (file: MediaFile) => {
    if (!apiClient || !selectedDevice) return;

    const downloadUrl = apiClient.getDownloadUrl(file.id);
    // Open download in browser/download manager
    window.open(downloadUrl, '_blank');
  };

  const getFileIcon = (file: MediaFile): string => {
    if (file.type === 'folder') return '📁';
    switch (file.mediaType) {
      case 'video':
        return '🎬';
      case 'audio':
        return '🎵';
      case 'image':
        return '🖼️';
      case 'document':
        return '📄';
      default:
        return '📎';
    }
  };

  return (
    <div className="discover-page">
      <div className="page-header">
        <h2>Discover</h2>
        <p>Browse files from devices on your network</p>
      </div>

      {!selectedDevice ? (
        // Device List
        <div>
          {devices.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📡</div>
              <h3>No devices found</h3>
              <p>Make sure other devices are running Home Media Server on your network</p>
            </div>
          ) : (
            <div className="grid grid-3">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className="device-card"
                  onClick={() => handleDeviceClick(device)}
                >
                  <div className="device-icon">{device.platform === 'windows' ? '💻' : '📱'}</div>
                  <div className="device-info">
                    <div className="device-name">{device.name}</div>
                    <div className="device-status">
                      <span className={`status-dot ${device.isOnline ? '' : 'offline'}`}></span>
                      {device.isOnline ? 'Online' : 'Offline'}
                      {device.sharedFilesCount !== undefined && ` • ${device.sharedFilesCount} files`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // File Browser
        <div>
          <div className="browser-header" style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                clear();
                selectDevice(null);
                setApiClient(null);
              }}
            >
              ← Devices
            </button>
            {currentPath !== '/' && (
              <button className="btn btn-secondary btn-sm" onClick={handleBackClick}>
                ← Back
              </button>
            )}
            <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              {selectedDevice.name} • {currentPath}
            </span>
          </div>

          {isLoading ? (
            <div className="loading-screen" style={{ height: 200 }}>
              <div className="loading-spinner"></div>
            </div>
          ) : files.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📂</div>
              <h3>This folder is empty</h3>
            </div>
          ) : (
            <div className="file-list">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="file-item"
                  onClick={() =>
                    file.type === 'folder' ? handleFolderClick(file) : handleFileClick(file)
                  }
                >
                  <div className="icon">{getFileIcon(file)}</div>
                  <div className="info">
                    <div className="name">{file.name}</div>
                    <div className="meta">
                      {file.type === 'file' && file.size !== undefined && formatFileSize(file.size)}
                    </div>
                  </div>
                  {file.type === 'file' && (
                    <div className="actions">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFileClick(file);
                        }}
                      >
                        Play
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(file);
                        }}
                      >
                        Download
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DiscoverPage;
