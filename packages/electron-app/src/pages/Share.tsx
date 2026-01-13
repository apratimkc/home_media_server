import { useState, useEffect } from 'react';

interface SharedFolder {
  id: string;
  path: string;
  alias: string | null;
  enabled: boolean;
}

function SharePage() {
  const [shareEnabled, setShareEnabled] = useState(false);
  const [folders, setFolders] = useState<SharedFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [serverPort, setServerPort] = useState(8765);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load settings
      const settings = await window.electronAPI.getSettings();
      setShareEnabled(settings.shareEnabled as boolean);
      setServerPort((settings.serverPort as number) || 8765);

      // Load shared folders from database
      const sharedFolders = await window.electronAPI.getSharedFolders();
      setFolders(sharedFolders);

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load data:', error);
      setIsLoading(false);
    }
  };

  const handleToggleShare = async () => {
    const newValue = !shareEnabled;
    setShareEnabled(newValue);
    await window.electronAPI.saveSettings({ shareEnabled: newValue });

    // Restart server if enabling
    if (newValue) {
      await window.electronAPI.restartServer(serverPort);
    }
  };

  const handleAddFolder = async () => {
    const folderPath = await window.electronAPI.selectFolder();
    if (folderPath) {
      // Add folder to database via IPC
      const result = await window.electronAPI.addSharedFolder(folderPath);
      if (result.success && result.folder) {
        setFolders([...folders, result.folder]);
      } else {
        console.error('Failed to add folder:', result.error);
      }
    }
  };

  const handleRemoveFolder = async (folderId: string) => {
    const result = await window.electronAPI.removeSharedFolder(folderId);
    if (result.success) {
      setFolders(folders.filter((f) => f.id !== folderId));
    }
  };

  const handleToggleFolder = async (folderId: string) => {
    const result = await window.electronAPI.toggleFolderEnabled(folderId);
    if (result.success) {
      setFolders(
        folders.map((f) => (f.id === folderId ? { ...f, enabled: !f.enabled } : f))
      );
    }
  };

  if (isLoading) {
    return (
      <div className="loading-screen" style={{ height: 200 }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="share-page">
      <div className="page-header">
        <h2>Share With Others</h2>
        <p>Choose folders to share with other devices on your network</p>
      </div>

      {/* Share Toggle */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ marginBottom: 4 }}>Enable Sharing</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              Allow other devices to browse your shared folders
            </p>
          </div>
          <div
            className={`toggle ${shareEnabled ? 'active' : ''}`}
            onClick={handleToggleShare}
          ></div>
        </div>
      </div>

      {/* Shared Folders */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Shared Folders</h3>
          <button className="btn btn-primary btn-sm" onClick={handleAddFolder}>
            + Add Folder
          </button>
        </div>

        {folders.length === 0 ? (
          <div className="empty-state" style={{ padding: 40 }}>
            <div className="icon">📂</div>
            <h3>No folders shared</h3>
            <p>Add folders to share them with other devices</p>
          </div>
        ) : (
          <div className="file-list">
            {folders.map((folder) => (
              <div key={folder.id} className="file-item">
                <div className="icon">📁</div>
                <div className="info">
                  <div className="name">{folder.alias || folder.path}</div>
                  <div className="meta">{folder.path}</div>
                </div>
                <div className="actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    className={`toggle ${folder.enabled ? 'active' : ''}`}
                    onClick={() => handleToggleFolder(folder.id)}
                    style={{ transform: 'scale(0.8)' }}
                  ></div>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleRemoveFolder(folder.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Server Info */}
      {shareEnabled && (
        <div className="card" style={{ marginTop: 24 }}>
          <h3 className="card-title" style={{ marginBottom: 16 }}>Server Info</h3>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Status:</span>{' '}
              <span style={{ color: 'var(--success-color)' }}>Running</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Port:</span> {serverPort}
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Shared Folders:</span> {folders.filter(f => f.enabled).length}
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                Other devices can discover this PC automatically via network
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SharePage;
