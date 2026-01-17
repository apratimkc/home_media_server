# Home Media Server - Progress Tracker

> Last Updated: January 17, 2026

---

## Overall Progress

| Phase | Status | Progress |
|-------|--------|----------|
| Phase 1: Project Setup | ✅ Complete | 100% |
| Phase 2: HTTP Server & File Browsing | ✅ Complete | 100% |
| Phase 3: mDNS Device Discovery | ✅ Complete | 100% |
| Phase 4: Media Streaming & VLC | ✅ Complete | 100% |
| Phase 5: Download System | ✅ Complete | 100% |
| Phase 6: Auto-Download | ✅ Complete | 100% |
| Phase 7: Auto-Delete & Cleanup | ✅ Complete | 100% |
| Phase 8: Share Configuration UI | 🔄 In Progress | 70% |
| Phase 9: Polish & Testing | 🔲 Not Started | 0% |

**Overall: ~90% Complete**

---

## To-Do List

### Immediate Tasks (Next Up)
- [ ] Test manual device connection on Android
- [ ] Test VLC playback on Android
- [ ] Test file browsing end-to-end (Android to Windows)
- [ ] Implement folder picker for Android (SAF)

### Phase 2: HTTP Server & File Browsing ✅ COMPLETE
- [x] Test Express server starts on port 8765
- [x] Verify file scanning works for shared folders
- [x] Test `/api/v1/files` endpoint returns correct data
- [x] Test `/api/v1/stream/:id` endpoint streams files
- [x] Verify file browser UI displays files correctly
- [x] Test folder navigation (enter/back)
- [x] Add loading states and error handling

### Phase 3: mDNS Device Discovery ✅ COMPLETE
- [x] Test bonjour service publishes on Windows
- [x] Test bonjour discovers other devices
- [x] Implement react-native-zeroconf on Android
- [x] Test Android discovers Windows device
- [x] Handle device online/offline transitions
- [x] Add manual device entry fallback
- [x] Fix self-discovery issue (phone discovering itself twice)

### Phase 4: Media Streaming & VLC ✅ COMPLETE
- [x] Test streaming with range requests (seeking)
- [x] Implement VLC launch on Windows
- [ ] Implement VLC intent on Android
- [x] Test playback works end-to-end
- [x] Handle VLC not installed scenario (fallback to shell.openPath)

### Phase 5: Download System ✅ COMPLETE
- [x] Implement download manager for Windows (custom HTTP streaming)
- [ ] Test background downloads on Android
- [x] Build download queue UI
- [x] Add progress tracking (real-time IPC events)
- [x] Implement pause/resume/cancel
- [x] Test resumable downloads (range requests)

### Phase 6: Auto-Download ✅ COMPLETE
- [x] Test episode pattern detection (S01E01, 1x01, etc.)
- [x] Test alphabetical fallback
- [x] Hook auto-download to playback start
- [x] Queue current + next 2 files
- [x] Avoid duplicate downloads
- [x] Add auto-download toggle in settings

### Phase 7: Auto-Delete & Cleanup ✅ COMPLETE
- [x] Implement expiry date tracking
- [x] Create background cleanup task (hourly scheduler)
- [x] Delete files older than autoDeleteDays setting
- [x] Update database when files deleted
- [x] Show expiry info in Downloads UI

### Phase 8: Share Configuration UI
- [x] Implement folder picker (Windows)
- [ ] Implement folder picker (Android - SAF)
- [x] Save shared folders to database
- [x] Show/hide folders from sharing
- [x] Display server status info

### Phase 9: Polish & Testing
- [ ] Add app icons (Windows + Android)
- [ ] Add splash screen (Android)
- [ ] Improve error messages
- [ ] Add loading skeletons
- [ ] Test on multiple devices
- [ ] Performance optimization
- [ ] Build release versions

### Future Enhancements (Post v1)
- [ ] Search functionality
- [ ] Favorites/history
- [ ] iOS support
- [ ] Subtitles support
- [ ] Thumbnail generation
- [ ] File transfer progress in notification

---

## Completed Tasks

### Session 3 (Part 2): Phase 2 Complete - Streaming & VLC Integration ✅

- [x] Improve VLC integration to find and launch VLC executable on Windows
- [x] Test HTTP server endpoints (/api/v1/info, /api/v1/files)
- [x] Test streaming endpoint with range requests (HTTP 206 Partial Content)
- [x] Verify download endpoint with proper Content-Disposition headers
- [x] Confirm CORS headers work for cross-origin requests
- [x] Mark Phase 2 (HTTP Server & File Browsing) as complete

### Session 3 (Part 1): Share UI, File Browser & mDNS Improvements ✅

- [x] Fix Content Security Policy for local network connections
- [x] Implement shared folders IPC handlers (add, remove, update, toggle)
- [x] Connect Share page to database (persist shared folders)
- [x] Add "This Device" entry to Discover page for self-browsing
- [x] Fix mDNS to prefer IPv4 addresses over IPv6
- [x] Fix HashRouter for Electron file:// protocol compatibility
- [x] Add getDiscoveredDevices IPC to load devices on startup
- [x] Improve mDNS shutdown to prevent EPIPE errors
- [x] Add cross-env for reliable ELECTRON_RUN_AS_NODE handling
- [x] Add npm start scripts for easier development

### Session 2: Dependency Fixes & Electron Startup ✅

- [x] Install project dependencies (npm install)
- [x] Build shared package
- [x] Fix `react-native-background-downloader` → `@kesha-antonov/react-native-background-downloader`
- [x] Fix `better-sqlite3` native compilation issue → replaced with `sql.js`
- [x] Update database code for sql.js async API
- [x] Fix TypeScript error in shared package (tsconfig types)
- [x] Fix `electron-squirrel-startup` module not found error
- [x] Diagnose and fix `ELECTRON_RUN_AS_NODE` environment issue
- [x] Replace `uuid` library with Node.js `crypto.randomUUID()`
- [x] Configure vite-plugin-electron with external dependencies
- [x] Test Windows app starts successfully (database, mDNS working)

### Phase 1: Project Setup ✅

- [x] Initialize Yarn workspaces monorepo
- [x] Create root package.json with workspaces
- [x] Create shared TypeScript config (tsconfig.base.json)
- [x] Configure ESLint
- [x] Configure Prettier
- [x] Create .gitignore
- [x] Create shared package structure
- [x] Define TypeScript types (Device, MediaFile, Download, etc.)
- [x] Create API client
- [x] Implement episode detector service
- [x] Create Zustand stores (devices, downloads, files, settings)
- [x] Create file utility functions
- [x] Set up Electron app structure
- [x] Create Electron main process
- [x] Create Electron preload script
- [x] Implement Express HTTP server
- [x] Implement mDNS service (bonjour)
- [x] Implement file scanner service
- [x] Create SQLite database setup
- [x] Create database operations (settings, shared folders)
- [x] Create React UI pages (Discover, Share, Downloads, Settings)
- [x] Create CSS styles
- [x] Set up Vite config for Electron
- [x] Set up React Native app structure
- [x] Create React Native screens
- [x] Implement mDNS service for React Native
- [x] Implement download manager for React Native
- [x] Create README.md
- [x] Create PROJECT_PLAN.md
- [x] Create PROGRESS.md (this file)

---

## Known Issues

| Issue | Status | Notes |
|-------|--------|-------|
| ELECTRON_RUN_AS_NODE env var | Fixed | Now handled via cross-env in package.json scripts |
| Network service crash on exit | Fixed | Improved mDNS shutdown sequence prevents EPIPE errors |

---

## Development Notes

### How to Run

**Windows App:**
```bash
cd packages/electron-app
yarn dev
```

**Android App:**
```bash
cd packages/mobile-app
yarn start        # Start Metro bundler
yarn android      # Run on Android device/emulator
```

### File Locations

| Purpose | Path |
|---------|------|
| Shared types | `packages/shared/src/api/types.ts` |
| Episode detector | `packages/shared/src/services/episodeDetector.ts` |
| Express server | `packages/electron-app/electron/server/index.ts` |
| mDNS (Windows) | `packages/electron-app/electron/services/mdnsService.ts` |
| mDNS (Android) | `packages/mobile-app/src/services/mdnsService.ts` |
| Database | `packages/electron-app/electron/database/` |
| Download Manager | `packages/electron-app/electron/services/downloadManager.ts` |
| Auto-Download Manager | `packages/electron-app/electron/services/autoDownloadManager.ts` |
| Auto-Delete Service | `packages/electron-app/electron/services/autoDeleteService.ts` |
| Downloads DB Operations | `packages/electron-app/electron/database/downloads.ts` |

### Testing Commands

```bash
# Lint code
yarn lint

# Format code
yarn format

# Build shared package
cd packages/shared && yarn build
```

---

## Changelog

### 2026-01-17 (Session 5): mDNS Self-Discovery Fix
- **Phase 3: mDNS Device Discovery** (Final Fix)
  - Fixed mobile app discovering itself twice in device list
  - Added `ourEncodedServiceName` tracking variable to filter self-discovery
  - Enhanced `handleResolvedService` to check both deviceId and service name
  - Now properly filters self-discovery from both 'found' and 'resolved' event handlers
  - Prevents duplicate device entries when phone publishes and discovers own service

- **Files Modified:**
  - `packages/mobile-app/src/services/mdnsService.ts`

### 2026-01-13 (Session 4): Download System & Auto-Download Complete
- **Phase 5: Download System**
  - Created `downloads.ts` database operations (CRUD for downloads table)
  - Built `downloadManager.ts` service with HTTP streaming, progress tracking, and queue management
  - Implemented pause/resume/cancel with range request support for resumable downloads
  - Added IPC handlers for all download operations
  - Updated `preload.ts` with complete download API bindings
  - Rewrote Downloads page to use IPC calls and listen for real-time events
  - Updated Discover page to use IPC-based downloads with progress tracking

- **Phase 6: Auto-Download**
  - Created `autoDownloadManager.ts` service
  - Integrated with episode detector (S01E01, 1x01 patterns)
  - Falls back to alphabetical ordering when no episode pattern detected
  - Triggers auto-download when playing a file (current + next 2 episodes)
  - Prevents duplicate downloads by checking existing records

- **Phase 7: Auto-Delete & Cleanup**
  - Created `autoDeleteService.ts` with hourly scheduler
  - Automatically deletes expired downloads based on `autoDeleteDays` setting
  - Added "Clean Expired" button to Downloads UI
  - Shows expiry countdown on completed downloads

- **New Files Created:**
  - `packages/electron-app/electron/database/downloads.ts`
  - `packages/electron-app/electron/services/downloadManager.ts`
  - `packages/electron-app/electron/services/autoDownloadManager.ts`
  - `packages/electron-app/electron/services/autoDeleteService.ts`

### 2026-01-13 (Session 3 - Part 2)
- Improved VLC integration with direct executable launching on Windows
- Tested and verified streaming endpoint with range request support (HTTP 206)
- Tested download endpoint with proper attachment headers
- Verified CORS headers for cross-origin API access
- Completed Phase 2: HTTP Server & File Browsing (100%)

### 2026-01-13 (Session 3 - Part 1)
- Implemented Share page database integration (add/remove/toggle shared folders)
- Added "This Device" to Discover page for browsing own files
- Fixed Content Security Policy to allow local network API calls
- Fixed mDNS to prefer IPv4 addresses (IPv6 link-local addresses caused issues)
- Switched to HashRouter for Electron file:// protocol compatibility
- Fixed mDNS shutdown to prevent EPIPE errors on app exit
- Added cross-env package for reliable environment variable handling
- Added npm start scripts for easier development workflow

### 2026-01-12 (Session 2)
- Fixed dependency issues (react-native-background-downloader, better-sqlite3)
- Replaced better-sqlite3 with sql.js for cross-platform compatibility
- Fixed Electron startup issues (ELECTRON_RUN_AS_NODE environment variable)
- Replaced uuid library with native crypto.randomUUID()
- Configured vite-plugin-electron with proper externals
- Windows app now starts successfully with database and mDNS working

### 2026-01-12 (Session 1)
- Created project structure
- Set up monorepo with Yarn workspaces
- Created shared package with types and utilities
- Created Windows app (Electron + React)
- Created Android app (React Native)
- Added project documentation
- Created /packup skill for git workflow
- Initialized git repository and connected to GitHub
