/**
 * Express HTTP Server for Home Media Server
 * Handles file listing, streaming, and downloads
 */

import express, { Request, Response } from 'express';
import { createServer, Server } from 'http';
import path from 'path';
import fs from 'fs';
import mime from 'mime-types';
import { getSharedFolders } from '../database/sharedFolders';
import { scanFolder, getFileById, getFileSiblings } from '../services/fileScanner';
import { getSettings } from '../database/settings';

let server: Server | null = null;
let app: express.Application | null = null;

/**
 * Start the HTTP server
 */
export async function startServer(port: number): Promise<void> {
  if (server) {
    console.log('Server already running');
    return;
  }

  app = express();

  // CORS for local network access
  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Range, Content-Type');
    res.header('Access-Control-Expose-Headers', 'Content-Range, Content-Length');
    next();
  });

  // API routes
  app.get('/api/v1/info', handleInfo);
  app.get('/api/v1/files', handleListFiles);
  app.get('/api/v1/files/:fileId/metadata', handleFileMetadata);
  app.get('/api/v1/files/:fileId/siblings', handleFileSiblings);
  app.get('/api/v1/stream/:fileId', handleStream);
  app.get('/api/v1/download/:fileId', handleDownload);

  server = createServer(app);

  return new Promise((resolve, reject) => {
    server!.listen(port, '0.0.0.0', () => {
      console.log(`Server running on port ${port}`);
      resolve();
    });

    server!.on('error', (error) => {
      console.error('Server error:', error);
      reject(error);
    });
  });
}

/**
 * Stop the HTTP server
 */
export async function stopServer(): Promise<void> {
  if (!server) return;

  return new Promise((resolve) => {
    server!.close(() => {
      server = null;
      app = null;
      console.log('Server stopped');
      resolve();
    });
  });
}

/**
 * GET /api/v1/info - Device information
 */
function handleInfo(_req: Request, res: Response) {
  const settings = getSettings();
  const sharedFolders = getSharedFolders();

  let totalFiles = 0;
  for (const folder of sharedFolders) {
    if (folder.enabled) {
      const files = scanFolder(folder.path);
      totalFiles += countFiles(files);
    }
  }

  res.json({
    deviceId: settings.deviceId,
    deviceName: settings.deviceName,
    platform: 'windows',
    version: '1.0.0',
    sharedFoldersCount: sharedFolders.filter((f) => f.enabled).length,
    totalFiles,
  });
}

/**
 * GET /api/v1/files - List files
 */
function handleListFiles(req: Request, res: Response) {
  const requestedPath = (req.query.path as string) || '/';
  const sharedFolders = getSharedFolders().filter((f) => f.enabled);

  if (requestedPath === '/') {
    // Root level - show shared folders as top-level directories
    const items = sharedFolders.map((folder) => ({
      id: folder.id,
      name: folder.alias || path.basename(folder.path),
      path: `/${folder.id}`,
      type: 'folder' as const,
      modifiedAt: folder.addedAt,
    }));

    res.json({
      path: '/',
      items,
      totalCount: items.length,
    });
    return;
  }

  // Parse path to get folder ID and subpath
  const pathParts = requestedPath.split('/').filter(Boolean);
  const folderId = pathParts[0];
  const subPath = pathParts.slice(1).join('/');

  const folder = sharedFolders.find((f) => f.id === folderId);
  if (!folder) {
    res.status(404).json({ error: 'Folder not found' });
    return;
  }

  const fullPath = subPath ? path.join(folder.path, subPath) : folder.path;

  if (!fs.existsSync(fullPath)) {
    res.status(404).json({ error: 'Path not found' });
    return;
  }

  const files = scanFolder(fullPath, folderId, subPath ? `/${folderId}/${subPath}` : `/${folderId}`);

  res.json({
    path: requestedPath,
    items: files,
    totalCount: files.length,
  });
}

/**
 * GET /api/v1/files/:fileId/metadata - File metadata
 */
function handleFileMetadata(req: Request, res: Response) {
  const { fileId } = req.params;
  const file = getFileById(fileId);

  if (!file) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  res.json(file);
}

/**
 * GET /api/v1/files/:fileId/siblings - Files in same folder
 */
function handleFileSiblings(req: Request, res: Response) {
  const { fileId } = req.params;
  const result = getFileSiblings(fileId);

  if (!result) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  res.json(result);
}

/**
 * GET /api/v1/stream/:fileId - Stream file with range support
 */
function handleStream(req: Request, res: Response) {
  const { fileId } = req.params;
  const file = getFileById(fileId);

  if (!file || !file.localPath) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  const filePath = file.localPath;
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const mimeType = mime.lookup(filePath) || 'application/octet-stream';

  const range = req.headers.range;

  if (range) {
    // Handle range request for video seeking
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': mimeType,
    });

    const stream = fs.createReadStream(filePath, { start, end });
    stream.pipe(res);
  } else {
    // Send full file
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes',
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  }
}

/**
 * GET /api/v1/download/:fileId - Download file
 */
function handleDownload(req: Request, res: Response) {
  const { fileId } = req.params;
  const file = getFileById(fileId);

  if (!file || !file.localPath) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  const filePath = file.localPath;
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const mimeType = mime.lookup(filePath) || 'application/octet-stream';

  // Handle range request for resumable downloads
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(file.name)}"`,
    });

    const stream = fs.createReadStream(filePath, { start, end });
    stream.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(file.name)}"`,
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  }
}

/**
 * Count total files recursively
 */
function countFiles(files: Array<{ type: string; children?: unknown[] }>): number {
  let count = 0;
  for (const file of files) {
    if (file.type === 'file') {
      count++;
    } else if (file.children) {
      count += countFiles(file.children as Array<{ type: string; children?: unknown[] }>);
    }
  }
  return count;
}
