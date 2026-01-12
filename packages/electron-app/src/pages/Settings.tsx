import { useState, useEffect } from 'react';

interface Settings {
  deviceName: string;
  serverPort: number;
  autoDownloadEnabled: boolean;
  autoDeleteDays: number;
  downloadPath: string;
}

function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    deviceName: '',
    serverPort: 8765,
    autoDownloadEnabled: true,
    autoDeleteDays: 10,
    downloadPath: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const loadedSettings = await window.electronAPI.getSettings();
      setSettings({
        deviceName: (loadedSettings.deviceName as string) || '',
        serverPort: (loadedSettings.serverPort as number) || 8765,
        autoDownloadEnabled: loadedSettings.autoDownloadEnabled as boolean,
        autoDeleteDays: (loadedSettings.autoDeleteDays as number) || 10,
        downloadPath: (loadedSettings.downloadPath as string) || '',
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await window.electronAPI.saveSettings(settings);
      setSavedMessage('Settings saved!');
      setTimeout(() => setSavedMessage(''), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSavedMessage('Failed to save');
    }
    setIsSaving(false);
  };

  const handleSelectDownloadPath = async () => {
    const path = await window.electronAPI.selectFolder();
    if (path) {
      setSettings({ ...settings, downloadPath: path });
    }
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <h2>Settings</h2>
        <p>Configure your Home Media Server</p>
      </div>

      {/* Device Settings */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 className="card-title" style={{ marginBottom: 20 }}>Device</h3>

        <div className="form-group">
          <label className="form-label">Device Name</label>
          <input
            type="text"
            className="form-input"
            value={settings.deviceName}
            onChange={(e) => setSettings({ ...settings, deviceName: e.target.value })}
            placeholder="My Windows PC"
          />
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
            This name will be shown to other devices on the network
          </p>
        </div>

        <div className="form-group">
          <label className="form-label">Server Port</label>
          <input
            type="number"
            className="form-input"
            value={settings.serverPort}
            onChange={(e) => setSettings({ ...settings, serverPort: parseInt(e.target.value) || 8765 })}
            min={1024}
            max={65535}
          />
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
            Port used for file sharing (default: 8765)
          </p>
        </div>
      </div>

      {/* Auto-Download Settings */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 className="card-title" style={{ marginBottom: 20 }}>Auto-Download</h3>

        <div className="form-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <label className="form-label" style={{ marginBottom: 0 }}>Enable Auto-Download</label>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              Automatically download current + next 2 episodes when playing
            </p>
          </div>
          <div
            className={`toggle ${settings.autoDownloadEnabled ? 'active' : ''}`}
            onClick={() => setSettings({ ...settings, autoDownloadEnabled: !settings.autoDownloadEnabled })}
          ></div>
        </div>

        <div className="form-group">
          <label className="form-label">Auto-Delete After (Days)</label>
          <input
            type="number"
            className="form-input"
            value={settings.autoDeleteDays}
            onChange={(e) => setSettings({ ...settings, autoDeleteDays: parseInt(e.target.value) || 10 })}
            min={1}
            max={365}
          />
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
            Auto-downloaded files will be deleted after this many days
          </p>
        </div>
      </div>

      {/* Storage Settings */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 className="card-title" style={{ marginBottom: 20 }}>Storage</h3>

        <div className="form-group">
          <label className="form-label">Download Location</label>
          <div style={{ display: 'flex', gap: 12 }}>
            <input
              type="text"
              className="form-input"
              value={settings.downloadPath}
              readOnly
              placeholder="Select download folder..."
              style={{ flex: 1 }}
            />
            <button className="btn btn-secondary" onClick={handleSelectDownloadPath}>
              Browse
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
        {savedMessage && (
          <span style={{ color: 'var(--success-color)' }}>{savedMessage}</span>
        )}
      </div>

      {/* About */}
      <div className="card" style={{ marginTop: 24 }}>
        <h3 className="card-title" style={{ marginBottom: 12 }}>About</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Home Media Server v1.0.0
        </p>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
          Share and stream media files across your local network
        </p>
      </div>
    </div>
  );
}

export default SettingsPage;
