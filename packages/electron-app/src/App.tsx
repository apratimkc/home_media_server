import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { useDevicesStore } from '@home-media-server/shared';
import DiscoverPage from './pages/Discover';
import SharePage from './pages/Share';
import DownloadsPage from './pages/Downloads';
import SettingsPage from './pages/Settings';
import './styles/App.css';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const addDevice = useDevicesStore((state) => state.addDevice);
  const removeDevice = useDevicesStore((state) => state.removeDevice);

  useEffect(() => {
    // Listen for device discovery events
    window.electronAPI.onDeviceDiscovered((device) => {
      addDevice(device as Parameters<typeof addDevice>[0]);
    });

    window.electronAPI.onDeviceRemoved((deviceId) => {
      removeDevice(deviceId);
    });

    // Load settings
    window.electronAPI.getSettings().then(() => {
      setIsLoading(false);
    });
  }, [addDevice, removeDevice]);

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="app">
        <nav className="sidebar">
          <div className="logo">
            <h1>Home Media Server</h1>
          </div>
          <ul className="nav-links">
            <li>
              <NavLink to="/" className={({ isActive }) => (isActive ? 'active' : '')}>
                <span className="icon">🔍</span>
                <span>Discover</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/share" className={({ isActive }) => (isActive ? 'active' : '')}>
                <span className="icon">📤</span>
                <span>Share</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/downloads" className={({ isActive }) => (isActive ? 'active' : '')}>
                <span className="icon">📥</span>
                <span>Downloads</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/settings" className={({ isActive }) => (isActive ? 'active' : '')}>
                <span className="icon">⚙️</span>
                <span>Settings</span>
              </NavLink>
            </li>
          </ul>
        </nav>
        <main className="content">
          <Routes>
            <Route path="/" element={<DiscoverPage />} />
            <Route path="/share" element={<SharePage />} />
            <Route path="/downloads" element={<DownloadsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
