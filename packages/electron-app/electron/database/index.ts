/**
 * SQLite Database initialization
 */

import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';

let db: Database.Database | null = null;

/**
 * Get database path
 */
function getDatabasePath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'home-media-server.db');
}

/**
 * Initialize the database
 */
export function initDatabase(): void {
  if (db) return;

  const dbPath = getDatabasePath();
  console.log(`Database path: ${dbPath}`);

  db = new Database(dbPath);

  // Create tables
  db.exec(`
    -- Settings table
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    -- Shared folders table
    CREATE TABLE IF NOT EXISTS shared_folders (
      id TEXT PRIMARY KEY,
      path TEXT NOT NULL UNIQUE,
      alias TEXT,
      enabled INTEGER DEFAULT 1,
      added_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Downloads table
    CREATE TABLE IF NOT EXISTS downloads (
      id TEXT PRIMARY KEY,
      file_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      source_device_id TEXT NOT NULL,
      source_device_name TEXT NOT NULL,
      remote_path TEXT NOT NULL,
      local_path TEXT,
      total_bytes INTEGER NOT NULL,
      downloaded_bytes INTEGER DEFAULT 0,
      status TEXT DEFAULT 'queued',
      started_at TEXT,
      completed_at TEXT,
      expires_at TEXT,
      is_auto_download INTEGER DEFAULT 0,
      error TEXT
    );

    -- File cache table
    CREATE TABLE IF NOT EXISTS file_cache (
      id TEXT PRIMARY KEY,
      path TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      size INTEGER,
      mime_type TEXT,
      parent_id TEXT,
      modified_at TEXT,
      scanned_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Initialize default settings if not exists
  initDefaultSettings();

  console.log('Database initialized');
}

/**
 * Initialize default settings
 */
function initDefaultSettings(): void {
  const stmt = db!.prepare('SELECT value FROM settings WHERE key = ?');
  const deviceId = stmt.get('deviceId') as { value: string } | undefined;

  if (!deviceId) {
    const defaultSettings = {
      deviceId: uuidv4(),
      deviceName: os.hostname() || 'Windows PC',
      serverPort: 8765,
      shareEnabled: false,
      autoDownloadEnabled: true,
      autoDeleteDays: 10,
      downloadPath: path.join(app.getPath('downloads'), 'Home Media Server'),
    };

    const insert = db!.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    const insertMany = db!.transaction((settings: Record<string, unknown>) => {
      for (const [key, value] of Object.entries(settings)) {
        insert.run(key, JSON.stringify(value));
      }
    });

    insertMany(defaultSettings);
    console.log('Default settings initialized');
  }
}

/**
 * Get database instance
 */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('Database closed');
  }
}
