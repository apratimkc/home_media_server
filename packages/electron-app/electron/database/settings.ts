/**
 * Settings database operations
 */

import { getDatabase } from './index';

interface Settings {
  deviceId: string;
  deviceName: string;
  serverPort: number;
  shareEnabled: boolean;
  autoDownloadEnabled: boolean;
  autoDeleteDays: number;
  downloadPath: string;
}

/**
 * Get all settings
 */
export function getSettings(): Settings {
  const db = getDatabase();
  const stmt = db.prepare('SELECT key, value FROM settings');
  const rows = stmt.all() as Array<{ key: string; value: string }>;

  const settings: Record<string, unknown> = {};
  for (const row of rows) {
    try {
      settings[row.key] = JSON.parse(row.value);
    } catch {
      settings[row.key] = row.value;
    }
  }

  return settings as Settings;
}

/**
 * Get a single setting
 */
export function getSetting<T>(key: string): T | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
  const row = stmt.get(key) as { value: string } | undefined;

  if (!row) return null;

  try {
    return JSON.parse(row.value) as T;
  } catch {
    return row.value as T;
  }
}

/**
 * Save settings
 */
export function saveSettings(settings: Record<string, unknown>): void {
  const db = getDatabase();
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

  const saveMany = db.transaction((s: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(s)) {
      stmt.run(key, JSON.stringify(value));
    }
  });

  saveMany(settings);
}

/**
 * Save a single setting
 */
export function saveSetting(key: string, value: unknown): void {
  const db = getDatabase();
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  stmt.run(key, JSON.stringify(value));
}
