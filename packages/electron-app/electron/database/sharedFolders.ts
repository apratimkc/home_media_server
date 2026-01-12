/**
 * Shared folders database operations
 */

import { getDatabase, runQuery } from './index';
import crypto from 'crypto';
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
  const result = db.exec('SELECT * FROM shared_folders ORDER BY alias, path');

  if (result.length === 0) return [];

  const columns = result[0].columns;
  const idIdx = columns.indexOf('id');
  const pathIdx = columns.indexOf('path');
  const aliasIdx = columns.indexOf('alias');
  const enabledIdx = columns.indexOf('enabled');
  const addedAtIdx = columns.indexOf('added_at');

  return result[0].values.map((row) => ({
    id: row[idIdx] as string,
    path: row[pathIdx] as string,
    alias: row[aliasIdx] as string | null,
    enabled: row[enabledIdx] === 1,
    addedAt: new Date(row[addedAtIdx] as string),
  }));
}

/**
 * Get shared folder by ID
 */
export function getSharedFolderById(id: string): SharedFolder | null {
  const db = getDatabase();
  const result = db.exec('SELECT * FROM shared_folders WHERE id = ?', [id]);

  if (result.length === 0 || result[0].values.length === 0) return null;

  const columns = result[0].columns;
  const row = result[0].values[0];
  const idIdx = columns.indexOf('id');
  const pathIdx = columns.indexOf('path');
  const aliasIdx = columns.indexOf('alias');
  const enabledIdx = columns.indexOf('enabled');
  const addedAtIdx = columns.indexOf('added_at');

  return {
    id: row[idIdx] as string,
    path: row[pathIdx] as string,
    alias: row[aliasIdx] as string | null,
    enabled: row[enabledIdx] === 1,
    addedAt: new Date(row[addedAtIdx] as string),
  };
}

/**
 * Add a shared folder
 */
export function addSharedFolder(folderPath: string, alias?: string): SharedFolder {
  const id = crypto.randomUUID();
  const folderAlias = alias || path.basename(folderPath);
  const now = new Date().toISOString();

  runQuery(
    'INSERT INTO shared_folders (id, path, alias, enabled, added_at) VALUES (?, ?, ?, 1, ?)',
    [id, folderPath, folderAlias, now]
  );

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
  const before = db.exec('SELECT COUNT(*) FROM shared_folders WHERE id = ?', [id]);
  const countBefore = before.length > 0 ? (before[0].values[0][0] as number) : 0;

  runQuery('DELETE FROM shared_folders WHERE id = ?', [id]);

  return countBefore > 0;
}

/**
 * Update shared folder
 */
export function updateSharedFolder(
  id: string,
  updates: Partial<Pick<SharedFolder, 'alias' | 'enabled'>>
): boolean {
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
  runQuery(`UPDATE shared_folders SET ${setClauses.join(', ')} WHERE id = ?`, values);

  return true;
}

/**
 * Toggle folder enabled state
 */
export function toggleFolderEnabled(id: string): boolean {
  runQuery('UPDATE shared_folders SET enabled = NOT enabled WHERE id = ?', [id]);
  return true;
}

/**
 * Check if folder path already exists
 */
export function folderPathExists(folderPath: string): boolean {
  const db = getDatabase();
  const result = db.exec('SELECT id FROM shared_folders WHERE path = ?', [folderPath]);
  return result.length > 0 && result[0].values.length > 0;
}
