/**
 * mDNS Service for device discovery on local network
 * Uses Bonjour/Zeroconf protocol
 */

import Bonjour, { Service, Browser } from 'bonjour';
import { BrowserWindow } from 'electron';
import crypto from 'crypto';

const SERVICE_TYPE = 'homemedia';

let bonjour: ReturnType<typeof Bonjour> | null = null;
let publishedService: Service | null = null;
let browser: Browser | null = null;

interface DiscoveredDevice {
  id: string;
  name: string;
  ip: string;
  port: number;
  platform: 'windows' | 'android';
}

// Store discovered devices
const discoveredDevices: Map<string, DiscoveredDevice> = new Map();

/**
 * Start mDNS service - publish our service and discover others
 */
export function startMdnsService(deviceName: string, port: number): void {
  if (bonjour) {
    console.log('mDNS service already running');
    return;
  }

  bonjour = Bonjour();
  const deviceId = crypto.randomUUID();

  // Publish our service
  publishedService = bonjour.publish({
    name: deviceName,
    type: SERVICE_TYPE,
    port: port,
    txt: {
      deviceId: deviceId,
      platform: 'windows',
      version: '1.0.0',
    },
  });

  console.log(`mDNS: Publishing service "${deviceName}" on port ${port}`);

  // Start discovering other devices
  browser = bonjour.find({ type: SERVICE_TYPE });

  browser.on('up', (service) => {
    // Don't add ourselves
    if (service.txt?.deviceId === deviceId) {
      return;
    }

    // Prefer IPv4 address over IPv6 (IPv6 link-local addresses don't work well)
    const addresses = service.addresses || [];
    const ipv4 = addresses.find((addr: string) => !addr.includes(':'));
    const ip = ipv4 || addresses[0] || '';

    const device: DiscoveredDevice = {
      id: service.txt?.deviceId || service.name,
      name: service.name,
      ip: ip,
      port: service.port,
      platform: (service.txt?.platform as 'windows' | 'android') || 'windows',
    };

    discoveredDevices.set(device.id, device);
    console.log(`mDNS: Discovered device "${device.name}" at ${device.ip}:${device.port}`);

    // Notify renderer process
    notifyDeviceDiscovered(device);
  });

  browser.on('down', (service) => {
    const deviceId = service.txt?.deviceId || service.name;
    const device = discoveredDevices.get(deviceId);

    if (device) {
      discoveredDevices.delete(deviceId);
      console.log(`mDNS: Device "${device.name}" went offline`);

      // Notify renderer process
      notifyDeviceRemoved(deviceId);
    }
  });

  console.log('mDNS: Service started, discovering devices...');
}

/**
 * Stop mDNS service
 */
export function stopMdnsService(): void {
  try {
    if (browser) {
      browser.stop();
      browser = null;
    }

    if (publishedService) {
      publishedService.stop();
      publishedService = null;
    }

    // Delay destroy to allow pending operations to complete
    // This prevents EPIPE errors when the process is shutting down
    if (bonjour) {
      const bonjourInstance = bonjour;
      bonjour = null;
      setTimeout(() => {
        try {
          bonjourInstance.destroy();
        } catch {
          // Ignore errors during final cleanup
        }
      }, 100);
    }

    discoveredDevices.clear();
  } catch {
    // Ignore errors during shutdown
  }
}

/**
 * Get all discovered devices
 */
export function getDiscoveredDevices(): DiscoveredDevice[] {
  return Array.from(discoveredDevices.values());
}

/**
 * Notify renderer about discovered device
 */
function notifyDeviceDiscovered(device: DiscoveredDevice): void {
  const windows = BrowserWindow.getAllWindows();
  for (const window of windows) {
    window.webContents.send('device-discovered', device);
  }
}

/**
 * Notify renderer about removed device
 */
function notifyDeviceRemoved(deviceId: string): void {
  const windows = BrowserWindow.getAllWindows();
  for (const window of windows) {
    window.webContents.send('device-removed', deviceId);
  }
}

/**
 * Update published service name
 */
export function updateServiceName(newName: string, port: number): void {
  if (bonjour && publishedService) {
    publishedService.stop();
    const deviceId = publishedService.txt?.deviceId || crypto.randomUUID();

    publishedService = bonjour.publish({
      name: newName,
      type: SERVICE_TYPE,
      port: port,
      txt: {
        deviceId: deviceId,
        platform: 'windows',
        version: '1.0.0',
      },
    });

    console.log(`mDNS: Updated service name to "${newName}"`);
  }
}
