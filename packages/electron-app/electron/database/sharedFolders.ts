/**
 * Shared folders database operations
 */

import { getDatabase } from './index';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

interface SharedFolder {
  id: string;
  path: string;
  alias: string | null;
  enabled: boolean;
  addedAt: Date;
}

/**
 * Get all shared folders
 */
export function getSharedFolders(): SharedFolder[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM shared_folders ORDER BY alias, path');
  const rows = stmt.all() as Array<{
    id: string;
    path: string;
    alias: string | null;
    enabled: number;
    added_at: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    path: row.path,
    alias: row.alias,
    enabled: row.enabled === 1,
    addedAt: new Date(row.added_at),
  }));
}

/**
 * Get shared folder by ID
 */
export function getSharedFolderById(id: string): SharedFolder | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM shared_folders WHERE id = ?');
  const row = stmt.get(id) as {
    id: string;
    path: string;
    alias: string | null;
    enabled: number;
    added_at: string;
  } | undefined;

  if (!row) return null;

  return {
    id: row.id,
    path: row.path,
    alias: row.alias,
    enabled: row.enabled === 1,
    addedAt: new Date(row.added_at),
  };
}

/**
 * Add a shared folder
 */
export function addSharedFolder(folderPath: string, alias?: string): SharedFolder {
  const db = getDatabase();
  const id = uuidv4();
  const folderAlias = alias || path.basename(folderPath);

  const stmt = db.prepare(`
    INSERT INTO shared_folders (id, path, alias, enabled, added_at)
    VALUES (?, ?, ?, 1, datetime('now'))
  `);

  stmt.run(id, folderPath, folderAlias);

  return {
    id,
    path: folderPath,
    alias: folderAlias,
    enabled: true,
    addedAt: new Date(),
  };
}

/**
 * Remove a shared folder
 */
export function removeSharedFolder(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM shared_folders WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

/**
 * Update shared folder
 */
export function updateSharedFolder(
  id: string,
  updates: Partial<Pick<SharedFolder, 'alias' | 'enabled'>>
): boolean {
  const db = getDatabase();

  const setClauses: string[] = [];
  const values: unknown[] = [];

  if (updates.alias !== undefined) {
    setClauses.push('alias = ?');
    values.push(updates.alias);
  }

  if (updates.enabled !== undefined) {
    setClauses.push('enabled = ?');
    values.push(updates.enabled ? 1 : 0);
  }

  if (setClauses.length === 0) return false;

  values.push(id);
  const stmt = db.prepare(`UPDATE shared_folders SET ${setClauses.join(', ')} WHERE id = ?`);
  const result = stmt.run(...values);

  return result.changes > 0;
}

/**
 * Toggle folder enabled state
 */
export function toggleFolderEnabled(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare('UPDATE shared_folders SET enabled = NOT enabled WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

/**
 * Check if folder path already exists
 */
export function folderPathExists(folderPath: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare('SELECT id FROM shared_folders WHERE path = ?');
  const row = stmt.get(folderPath);
  return !!row;
}
