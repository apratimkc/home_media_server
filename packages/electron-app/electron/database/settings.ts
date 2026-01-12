/**
 * Settings database operations
 */

import { getDatabase, runQuery } from './index';

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
  const result = db.exec('SELECT key, value FROM settings');

  const settings: Record<string, unknown> = {};

  if (result.length > 0) {
    for (const row of result[0].values) {
      const key = row[0] as string;
      const value = row[1] as string;
      try {
        settings[key] = JSON.parse(value);
      } catch {
        settings[key] = value;
      }
    }
  }

  return settings as Settings;
}

/**
 * Get a single setting
 */
export function getSetting<T>(key: string): T | null {
  const db = getDatabase();
  const result = db.exec('SELECT value FROM settings WHERE key = ?', [key]);

  if (result.length === 0 || result[0].values.length === 0) return null;

  const value = result[0].values[0][0] as string;
  try {
    return JSON.parse(value) as T;
  } catch {
    return value as T;
  }
}

/**
 * Save settings
 */
export function saveSettings(settings: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(settings)) {
    runQuery('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, JSON.stringify(value)]);
  }
}

/**
 * Save a single setting
 */
export function saveSetting(key: string, value: unknown): void {
  runQuery('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, JSON.stringify(value)]);
}
