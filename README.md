# Home Media Server

A cross-platform local network file sharing application for Windows and Android that enables media streaming and downloading between devices on the same network.

## Features

- **Discover**: Browse files shared by other devices on your local network
- **Share With Others**: Select folders to share with other devices
- **Downloads**: View and manage downloaded files
- **Auto-Download**: Automatically download current + next 2 episodes when playing
- **Auto-Delete**: Downloaded files expire after 10 days
- **VLC Integration**: Open media files with VLC player

## Project Structure

```
home-media-server/
├── packages/
│   ├── shared/          # Shared types, utilities, and state management
│   ├── electron-app/    # Windows Desktop App (Electron + React)
│   └── mobile-app/      # Android App (React Native)
```

## Prerequisites

- Node.js 18+
- Yarn 1.22+
- For Windows app: Windows 10+
- For Android app: Android Studio, Android SDK
- VLC Media Player (recommended for playback)

## Setup

### 1. Install Dependencies

```bash
# Install root dependencies and link workspaces
yarn install
```

### 2. Build Shared Package

```bash
cd packages/shared
yarn build
```

### 3. Run Windows App (Electron)

```bash
cd packages/electron-app
yarn dev
```

### 4. Run Android App (React Native)

```bash
cd packages/mobile-app

# Start Metro bundler
yarn start

# In another terminal, run on Android
yarn android
```

## Technology Stack

| Component | Technology |
|-----------|------------|
| Windows App | Electron + React + Vite |
| Android App | React Native |
| State Management | Zustand |
| HTTP Server | Express.js |
| Database | SQLite |
| Device Discovery | mDNS (Bonjour / Zeroconf) |

## How It Works

1. **Device Discovery**: When the app starts, it broadcasts itself on the local network using mDNS (service type: `_homemedia._tcp`) and listens for other devices.

2. **File Sharing**: When you enable sharing, the app starts an HTTP server (default port: 8765) that serves your shared folders via REST API.

3. **Streaming**: Media files can be streamed directly using HTTP range requests, allowing seeking without downloading the entire file.

4. **Auto-Download**: When you play a media file, the app detects if it's part of a series (using filename patterns like S01E01) and automatically queues the current file + next 2 episodes for download.

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/info` | Device information |
| `GET /api/v1/files` | List files in a folder |
| `GET /api/v1/stream/:id` | Stream a media file |
| `GET /api/v1/download/:id` | Download a file |
| `GET /api/v1/files/:id/siblings` | Get files in same folder |

## Configuration

Settings are stored in SQLite database and include:
- Device name (shown to other devices)
- Server port (default: 8765)
- Auto-download enabled/disabled
- Auto-delete days (default: 10)
- Download location

## License

MIT
