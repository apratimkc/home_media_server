/**
 * HTTP client for communicating with Home Media Server devices
 */

import axios, { AxiosInstance, AxiosProgressEvent } from 'axios';
import {
  API_VERSION,
  DeviceInfoResponse,
  FileListResponse,
  FileSiblingsResponse,
  MediaFile,
} from './types';

/** Create API client for a specific device */
export function createApiClient(baseUrl: string): AxiosInstance {
  return axios.create({
    baseURL: `${baseUrl}/api/${API_VERSION}`,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/** API client for interacting with a remote device */
export class DeviceApiClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(ip: string, port: number) {
    this.baseUrl = `http://${ip}:${port}`;
    this.client = createApiClient(this.baseUrl);
  }

  /** Get device information */
  async getDeviceInfo(): Promise<DeviceInfoResponse> {
    const response = await this.client.get<DeviceInfoResponse>('/info');
    return response.data;
  }

  /** List files in a directory */
  async listFiles(path: string = '/'): Promise<FileListResponse> {
    const response = await this.client.get<FileListResponse>('/files', {
      params: { path },
    });
    return response.data;
  }

  /** Get file metadata */
  async getFileMetadata(fileId: string): Promise<MediaFile> {
    const response = await this.client.get<MediaFile>(`/files/${fileId}/metadata`);
    return response.data;
  }

  /** Get files in the same folder (for auto-download) */
  async getFileSiblings(fileId: string): Promise<FileSiblingsResponse> {
    const response = await this.client.get<FileSiblingsResponse>(`/files/${fileId}/siblings`);
    return response.data;
  }

  /** Get stream URL for a file */
  getStreamUrl(fileId: string): string {
    return `${this.baseUrl}/api/${API_VERSION}/stream/${fileId}`;
  }

  /** Get download URL for a file */
  getDownloadUrl(fileId: string): string {
    return `${this.baseUrl}/api/${API_VERSION}/download/${fileId}`;
  }

  /** Download a file with progress tracking */
  async downloadFile(
    fileId: string,
    onProgress?: (progress: number, downloaded: number, total: number) => void
  ): Promise<ArrayBuffer> {
    const response = await this.client.get(`/download/${fileId}`, {
      responseType: 'arraybuffer',
      onDownloadProgress: (event: AxiosProgressEvent) => {
        if (event.total && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress, event.loaded, event.total);
        }
      },
    });
    return response.data;
  }

  /** Check if device is reachable */
  async ping(): Promise<boolean> {
    try {
      await this.client.get('/info', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}
