# Home Media Server - Progress Tracker

> Last Updated: January 12, 2026

---

## Overall Progress

| Phase | Status | Progress |
|-------|--------|----------|
| Phase 1: Project Setup | ✅ Complete | 100% |
| Phase 2: HTTP Server & File Browsing | 🔲 Not Started | 0% |
| Phase 3: mDNS Device Discovery | 🔲 Not Started | 0% |
| Phase 4: Media Streaming & VLC | 🔲 Not Started | 0% |
| Phase 5: Download System | 🔲 Not Started | 0% |
| Phase 6: Auto-Download | 🔲 Not Started | 0% |
| Phase 7: Auto-Delete & Cleanup | 🔲 Not Started | 0% |
| Phase 8: Share Configuration UI | 🔲 Not Started | 0% |
| Phase 9: Polish & Testing | 🔲 Not Started | 0% |

**Overall: ~15% Complete**

---

## To-Do List

### Immediate Tasks (Next Up)
- [ ] Test HTTP server endpoints
- [ ] Test file browser UI functionality
- [ ] Set up Android app build environment

### Phase 2: HTTP Server & File Browsing
- [ ] Test Express server starts on port 8765
- [ ] Verify file scanning works for shared folders
- [ ] Test `/api/v1/files` endpoint returns correct data
- [ ] Test `/api/v1/stream/:id` endpoint streams files
- [ ] Verify file browser UI displays files correctly
- [ ] Test folder navigation (enter/back)
- [ ] Add loading states and error handling

### Phase 3: mDNS Device Discovery
- [ ] Test bonjour service publishes on Windows
- [ ] Test bonjour discovers other devices
- [ ] Implement react-native-zeroconf on Android
- [ ] Test Android discovers Windows device
- [ ] Handle device online/offline transitions
- [ ] Add manual device entry fallback

### Phase 4: Media Streaming & VLC
- [ ] Test streaming with range requests (seeking)
- [ ] Implement VLC launch on Windows
- [ ] Implement VLC intent on Android
- [ ] Test playback works end-to-end
- [ ] Handle VLC not installed scenario

### Phase 5: Download System
- [ ] Implement download manager for Windows (electron-dl)
- [ ] Test background downloads on Android
- [ ] Build download queue UI
- [ ] Add progress tracking
- [ ] Implement pause/resume/cancel
- [ ] Test resumable downloads (range requests)

### Phase 6: Auto-Download
- [ ] Test episode pattern detection (S01E01, 1x01, etc.)
- [ ] Test alphabetical fallback
- [ ] Hook auto-download to playback start
- [ ] Queue current + next 2 files
- [ ] Avoid duplicate downloads
- [ ] Add auto-download toggle in settings

### Phase 7: Auto-Delete & Cleanup
- [ ] Implement expiry date tracking
- [ ] Create background cleanup task
- [ ] Delete files older than 10 days
- [ ] Update database when files deleted
- [ ] Show expiry info in Downloads UI

### Phase 8: Share Configuration UI
- [ ] Implement folder picker (Windows)
- [ ] Implement folder picker (Android - SAF)
- [ ] Save shared folders to database
- [ ] Show/hide folders from sharing
- [ ] Display server status info

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
| ELECTRON_RUN_AS_NODE env var | Workaround | Must unset before running electron directly |
| Network service crash on exit | Minor | Electron shows error on window close, doesn't affect functionality |

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
