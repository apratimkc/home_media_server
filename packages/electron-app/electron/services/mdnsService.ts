/**
 * mDNS Service for device discovery on local network
 * Uses Bonjour/Zeroconf protocol
 *
 * Note: Android has issues resolving mDNS TXT records and port.
 * As a workaround, we encode IP and port in the service name:
 * Format: {deviceName}_{port}_{ip-with-dashes}
 * Example: MyPC_8765_192-168-0-105
 */
import Bonjour, { Service, Browser } from 'bonjour';
import { BrowserWindow } from 'electron';
import crypto from 'crypto';
import os from 'os';

const SERVICE_TYPE = 'homemedia';
const MAX_DEVICE_NAME_LENGTH = 20; // Leave room for port and IP in service name

let bonjour: ReturnType<typeof Bonjour> | null = null;
let publishedService: Service | null = null;
let browser: Browser | null = null;
let ourLocalIp: string | null = null;

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
 * Get the local IPv4 address
 */
function getLocalIPv4(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const netInterface = interfaces[name];
    if (!netInterface) continue;

    for (const addr of netInterface) {
      // Skip internal/loopback and IPv6
      if (addr.internal || addr.family !== 'IPv4') continue;
      // Prefer 192.168.x.x addresses (common home network)
      if (addr.address.startsWith('192.168.') || addr.address.startsWith('10.') || addr.address.startsWith('172.')) {
        return addr.address;
      }
    }
  }
  return '0.0.0.0';
}

/**
 * Encode device info into service name for Android compatibility
 * Format: {deviceName}_{port}_{ip-with-dashes}
 */
function encodeServiceName(deviceName: string, port: number, ip: string): string {
  // Truncate device name if needed (service name limit is ~63 chars)
  const truncatedName = deviceName.substring(0, MAX_DEVICE_NAME_LENGTH);
  const encodedIp = ip.replace(/\./g, '-');
  return `${truncatedName}_${port}_${encodedIp}`;
}

/**
 * Decode service name to extract device info
 */
function decodeServiceName(serviceName: string): { name: string; port: number; ip: string } | null {
  const parts = serviceName.split('_');
  if (parts.length < 3) return null;

  const ip = parts[parts.length - 1].replace(/-/g, '.');
  const port = parseInt(parts[parts.length - 2], 10);
  const name = parts.slice(0, -2).join('_'); // In case name has underscores

  if (isNaN(port) || !ip.match(/^\d+\.\d+\.\d+\.\d+$/)) {
    return null;
  }

  return { name, port, ip };
}

/**
 * Start mDNS service - publish our service and discover others
 */
export function startMdnsService(deviceName: string, port: number): void {
  if (bonjour) {
    console.log('mDNS service already running');
    return;
  }

  bonjour = Bonjour({
  interface: '0.0.0.0'
  });
  const deviceId = crypto.randomUUID();
  const localIp = getLocalIPv4();

  // Store our IP for filtering
  ourLocalIp = localIp;

  // Encode device info in service name for Android compatibility
  // Android NSD has bugs that prevent proper resolution of port/TXT records
  const encodedName = encodeServiceName(deviceName, port, localIp);

  // Publish our service
  publishedService = bonjour.publish({
    name: encodedName,
    type: SERVICE_TYPE,
    port: port,
    protocol: 'tcp',
    txt: {
      deviceId: deviceId,
      platform: 'windows',
      version: '1.0.0',
      // Also include in TXT for clients that can read it
      ip: localIp,
      displayName: deviceName,
    },
  });

  console.log(`mDNS: Publishing service with encoded name: "${encodedName}"`);
  console.log(`mDNS: Device name: "${deviceName}", IP: ${localIp}, Port: ${port}`);
  console.log(`mDNS: Full service type: _${SERVICE_TYPE}._tcp`);

  publishedService.on('up', () => {
    console.log('mDNS: Service announced successfully!');
    console.log('mDNS: Service details:', JSON.stringify({
      name: publishedService?.name,
      type: publishedService?.type,
      port: publishedService?.port,
      host: publishedService?.host,
      fqdn: publishedService?.fqdn,
      txt: publishedService?.txt,
    }, null, 2));
  });

  publishedService.on('error', (err: Error) => {
    console.error('mDNS: Service publish error:', err);
  });

  // Start discovering other devices
  browser = bonjour.find({ type: SERVICE_TYPE });

  browser.on('up', (service) => {
    // Don't add ourselves - check by deviceId first
    if (service.txt?.deviceId === deviceId) {
      console.log('mDNS: Skipping our own service (matched by deviceId)');
      return;
    }

    // Skip temporary services (used by Android for IP discovery)
    if (service.name.startsWith('_temp_') || service.txt?.temp === 'true') {
      console.log('mDNS: Skipping temporary service:', service.name);
      return;
    }

    // Try to decode service name (for Android compatibility format)
    const decoded = decodeServiceName(service.name);

    let ip: string;
    let servicePort: number;
    let displayName: string;

    if (decoded) {
      // Service name is encoded with IP and port
      ip = decoded.ip;
      servicePort = decoded.port;
      displayName = service.txt?.displayName || decoded.name;
    } else {
      // Standard mDNS resolution
      const addresses = service.addresses || [];
      const ipv4 = addresses.find((addr: string) => !addr.includes(':'));
      ip = service.txt?.ip || ipv4 || addresses[0] || '';
      servicePort = service.port;
      displayName = service.txt?.displayName || service.name;
    }

    // Don't add ourselves - also check by IP address
    if (ip === ourLocalIp) {
      console.log(`mDNS: Skipping our own service (matched by IP: ${ip})`);
      return;
    }

    // Check if we already have a device with this IP (deduplication)
    // Prefer devices with proper display names over encoded service names
    for (const [existingId, existingDevice] of discoveredDevices.entries()) {
      if (existingDevice.ip === ip && existingDevice.port === servicePort) {
        // Same IP and port - this is the same device
        // Keep the one with the better display name (not starting with _ or containing encoded format)
        const existingIsBetter = !existingDevice.name.startsWith('_') &&
          !existingDevice.name.match(/_\d+_\d+-\d+-\d+-\d+$/);
        const newIsBetter = !displayName.startsWith('_') &&
          !displayName.match(/_\d+_\d+-\d+-\d+-\d+$/);

        if (existingIsBetter && !newIsBetter) {
          console.log(`mDNS: Skipping duplicate device "${displayName}" - already have "${existingDevice.name}" at ${ip}`);
          return;
        } else if (newIsBetter && !existingIsBetter) {
          // Remove the old entry with worse name
          console.log(`mDNS: Replacing "${existingDevice.name}" with better name "${displayName}" at ${ip}`);
          discoveredDevices.delete(existingId);
          notifyDeviceRemoved(existingId);
        } else {
          // Both are similar quality, keep existing
          console.log(`mDNS: Skipping duplicate device "${displayName}" at ${ip}`);
          return;
        }
      }
    }

    const device: DiscoveredDevice = {
      id: service.txt?.deviceId || service.name,
      name: displayName,
      ip: ip,
      port: servicePort,
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
    ourLocalIp = null;

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
