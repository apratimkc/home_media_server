/**
 * SQLite Database initialization using sql.js (pure JavaScript, no native compilation needed)
 */

import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { app } from 'electron';
import os from 'os';

let db: SqlJsDatabase | null = null;
let dbPath: string = '';

/**
 * Get database path
 */
function getDatabasePath(): string {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'home-media-server.db');
}

/**
 * Save database to file
 */
function saveDatabase(): void {
  if (db && dbPath) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

/**
 * Initialize the database
 */
export async function initDatabase(): Promise<void> {
  if (db) return;

  dbPath = getDatabasePath();
  console.log(`Database path: ${dbPath}`);

  const SQL = await initSqlJs();

  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
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
  saveDatabase();

  console.log('Database initialized');
}

/**
 * Initialize default settings
 */
function initDefaultSettings(): void {
  const result = db!.exec('SELECT value FROM settings WHERE key = ?', ['deviceId']);

  if (result.length === 0 || result[0].values.length === 0) {
    const defaultSettings = {
      deviceId: crypto.randomUUID(),
      deviceName: os.hostname() || 'Windows PC',
      serverPort: 8765,
      shareEnabled: false,
      autoDownloadEnabled: true,
      autoDeleteDays: 10,
      downloadPath: path.join(app.getPath('downloads'), 'Home Media Server'),
    };

    for (const [key, value] of Object.entries(defaultSettings)) {
      db!.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, JSON.stringify(value)]);
    }
    console.log('Default settings initialized');
  }
}

/**
 * Get database instance
 */
export function getDatabase(): SqlJsDatabase {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
}

/**
 * Run a query and save
 */
export function runQuery(sql: string, params: unknown[] = []): void {
  if (!db) throw new Error('Database not initialized');
  db.run(sql, params);
  saveDatabase();
}

/**
 * Execute a query and get results
 */
export function execQuery(sql: string, params: unknown[] = []): unknown[][] {
  if (!db) throw new Error('Database not initialized');
  const result = db.exec(sql, params);
  if (result.length === 0) return [];
  return result[0].values;
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
    console.log('Database closed');
  }
}
