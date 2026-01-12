# Home Media Server - Project Plan

## Project Overview

A cross-platform local network file sharing application for Windows (Electron + React) and Android (React Native) that enables media streaming and downloading between devices on the same network.

**Both apps have identical functionality** - creating a smart ecosystem among devices on a local network.

---

## Technology Stack

| Component | Technology | Reason |
|-----------|------------|--------|
| Windows App | Electron + React + Vite | Beginner-friendly, large community, good docs |
| Android App | React Native | Shares JS/TS knowledge with Electron |
| State Management | Zustand | Simpler than Redux, works on both platforms |
| HTTP Server | Express.js | Most popular, well-documented |
| Database | SQLite (better-sqlite3 / expo-sqlite) | Simple, no server needed |
| Device Discovery | mDNS (bonjour / react-native-zeroconf) | Zero-config networking |
| Media Playback | External player (VLC) | Open files with VLC instead of built-in player |

---

## Architecture

```
┌─────────────────┐     mDNS Discovery      ┌─────────────────┐
│  Windows PC     │<─────────────────────>  │  Android Phone  │
│  (Electron)     │                         │  (React Native) │
│                 │                         │                 │
│  Express Server │ <─── REST API ────────> │  HTTP Server    │
│  Port 8765      │     /api/v1/...         │  Port 8765      │
│                 │                         │                 │
│  SQLite DB      │                         │  SQLite DB      │
│  - Shared paths │                         │  - Shared paths │
│  - File cache   │                         │  - Downloads    │
└─────────────────┘                         └─────────────────┘

Both platforms have IDENTICAL features:
- Act as server (share files)
- Act as client (browse/download from others)
- Download files for offline use
- Auto-download next episodes
- Open media with VLC
```

---

## Project Structure (Monorepo)

```
home-media-server/
├── packages/
│   ├── shared/              # Shared types, hooks, utilities (70% code reuse)
│   │   ├── src/
│   │   │   ├── api/         # Types and API client
│   │   │   ├── services/    # Business logic (episodeDetector, etc.)
│   │   │   ├── hooks/       # Shared React hooks
│   │   │   └── store/       # Zustand stores
│   │
│   ├── electron-app/        # Windows Desktop
│   │   ├── electron/        # Main process (server, mDNS, file scanner)
│   │   └── src/             # React UI
│   │
│   └── mobile-app/          # Android
│       ├── android/         # Native config
│       └── src/             # React Native UI
│
└── docs/
    ├── PROJECT_PLAN.md      # This file
    └── PROGRESS.md          # Progress tracking
```

---

## Core Features

### 1. Three Main Sections
- **Discover**: Browse files shared by other devices on the network
- **Share With Others**: Select folders to share from your device
- **Downloads**: View and manage downloaded files

### 2. Device Discovery (mDNS)
- Service type: `_homemedia._tcp.local`
- Devices automatically find each other on LAN
- No manual IP entry required

### 3. REST API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/info` | Device information |
| `GET /api/v1/files` | List files/folders |
| `GET /api/v1/stream/:id` | Stream media (with range support) |
| `GET /api/v1/download/:id` | Download file |
| `GET /api/v1/files/:id/siblings` | Get files in same folder |

### 4. Auto-Download Feature

When user starts playing a media file (e.g., TV episode):
1. **Download the currently playing file first** (so user has it locally)
2. Parse filename for episode pattern (S01E01, 1x01, etc.)
3. If pattern found → queue next 2 episodes
4. If no pattern → queue next 2 files alphabetically
5. Downloads happen in background

**Total: Current file + next 2 = 3 files downloaded**

### 5. Auto-Delete
- Downloaded files expire after 10 days
- Background task checks hourly and removes expired files
- Only applies to auto-downloaded files (user can configure)

---

## Implementation Phases

### Phase 1: Project Setup ✅
- Initialize Yarn workspaces monorepo
- Set up Electron + React + Vite for Windows
- Set up React Native for Android
- Create shared package with TypeScript types
- Configure ESLint and Prettier

### Phase 2: HTTP Server & File Browsing
- Implement Express server in Electron
- Create file scanning service
- Build `/api/v1/files` endpoint
- Create file browser UI components
- Set up SQLite database

### Phase 3: mDNS Device Discovery
- Implement bonjour service (Electron)
- Implement react-native-zeroconf (Android)
- Create device list UI
- Handle online/offline status

### Phase 4: Media Streaming & VLC Integration
- Implement `/api/v1/stream/:id` with HTTP range requests
- Add "Open with VLC" button that launches VLC with stream URL
- On Windows: Use `shell.openExternal()` with VLC protocol
- On Android: Use intent to open VLC app with stream URL

### Phase 5: Download System
- Implement download endpoint
- Set up download managers for both platforms
- Build download queue and progress UI
- Handle pause/resume/cancel

### Phase 6: Auto-Download
- Implement episode pattern detector
- Create siblings API endpoint
- Hook into playback events
- Build auto-download queue logic

### Phase 7: Auto-Delete & Cleanup
- Implement background task scheduler
- Create cleanup service
- Add expiry date tracking

### Phase 8: Share Configuration UI
- Build folder picker
- Create sharing toggle
- Display server info

### Phase 9: Polish & Testing
- Error handling and loading states
- Performance optimization
- App icons and splash screens

---

## Key Libraries

### Electron App (Windows)
- `electron` - Desktop framework
- `express` - HTTP server
- `better-sqlite3` - Database
- `bonjour` - mDNS (pure JS)
- `chokidar` - File watching
- `axios` - HTTP client for downloading from other devices
- `electron-dl` - Download manager for Electron

### React Native App (Android)
- `react-native-zeroconf` - mDNS discovery
- `react-native-background-downloader` - Downloads
- `react-native-fs` - File system
- `react-native-sqlite-storage` - Database
- HTTP server library (TBD - may need native module)

---

## Database Schema

### Downloads Table (Both Platforms)

```sql
CREATE TABLE downloads (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  source_device_id TEXT NOT NULL,
  local_path TEXT,
  total_bytes INTEGER,
  downloaded_bytes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'queued',
  expires_at TEXT,
  is_auto_download INTEGER DEFAULT 0
);
```

### Shared Folders Table

```sql
CREATE TABLE shared_folders (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,
  alias TEXT,
  enabled INTEGER DEFAULT 1,
  added_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### Settings Table

```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

---

## Design Decisions (Confirmed)

- **Symmetric Apps**: Windows and Android have IDENTICAL functionality
- **Android Sharing**: Yes, Android can also share files
- **Windows Downloads**: Yes, Windows can also download from other devices
- **Media Playback**: Open with VLC (no built-in player)
- **Auto-Download**: Download current file + next 2 files
- **Interrupted Downloads**: Pause and auto-resume when device comes back online
- **File Size Limits**: No limits, user manages their own storage
- **Extra Features**: Keep it simple for v1, add more later

---

## Testing Checklist

1. Start Windows app → verify Express server runs on port 8765
2. Start Android app → verify it discovers Windows device via mDNS
3. Browse shared folders from Android
4. Stream a video file and verify seeking works
5. Download a file and verify it saves locally
6. Play an episode → verify next 2 episodes auto-queue
7. Wait 10 days (or modify expiry) → verify auto-delete works
