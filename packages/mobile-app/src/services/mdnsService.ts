/**
 * mDNS Service for discovering devices on local network
 * Uses react-native-zeroconf
 */

import Zeroconf from 'react-native-zeroconf';
import { useDevicesStore, Device } from '@home-media-server/shared';

// Use single zeroconf instance
const zeroconf = new Zeroconf();
let isRunning = false;
let isPublishing = false;
let publishedServiceName: string | null = null;
let ourDeviceId: string | null = null; // Track our own device ID to filter from discovery
let ourEncodedServiceName: string | null = null; // Track our published service name to filter from discovery

// Constants
const SERVICE_TYPE = 'homemedia';
const SERVICE_PROTOCOL = 'tcp';
const SERVICE_DOMAIN = 'local.';
const MAX_DEVICE_NAME_LENGTH = 20;
const DEFAULT_PORT = 8765; // Mobile app server port

interface ZeroconfService {
  name: string;
  host: string;
  port: number;
  txt?: Record<string, string>;
  addresses?: string[];
}

/**
 * Decode service name to extract device info
 * Format: {deviceName}_{port}_{ip-with-dashes}
 * Example: MyPC_8765_192-168-0-105
 */
function decodeServiceName(serviceName: string): { name: string; port: number; ip: string } | null {
  const parts = serviceName.split('_');
  if (parts.length < 3) return null;

  const ip = parts[parts.length - 1].replace(/-/g, '.');
  const port = parseInt(parts[parts.length - 2], 10);
  const name = parts.slice(0, -2).join('_'); // In case name has underscores

  // Validate IP format and port
  if (isNaN(port) || port <= 0 || !ip.match(/^\d+\.\d+\.\d+\.\d+$/)) {
    return null;
  }

  return { name, port, ip };
}

/**
 * Helper to process resolved service and add to store
 * Handles both standard mDNS resolution and encoded service names
 */
function handleResolvedService(
  service: ZeroconfService,
  addDevice: (device: Device) => void
): void {
  // Skip our own device by deviceId
  if (ourDeviceId && service.txt?.deviceId === ourDeviceId) {
    console.log('mDNS: Skipping our own device (by deviceId)');
    return;
  }

  // Skip our own device by service name (handles case when txt is empty)
  if (ourEncodedServiceName && service.name === ourEncodedServiceName) {
    console.log('mDNS: Skipping our own device (by service name)');
    return;
  }

  // Skip temp services
  if (service.name.startsWith('_temp_')) {
    console.log('mDNS: Skipping temp service');
    return;
  }

  // Try to decode service name (Android workaround format)
  const decoded = decodeServiceName(service.name);

  let deviceName: string;
  let deviceIp: string;
  let devicePort: number;

  if (decoded) {
    // Service name contains encoded IP and port - use it!
    console.log('mDNS: Using decoded service name:', decoded);
    deviceName = service.txt?.displayName || decoded.name;
    deviceIp = decoded.ip;
    devicePort = decoded.port;
  } else if (service.port && service.port > 0 && service.addresses?.length) {
    // Standard mDNS resolution worked
    deviceName = service.txt?.displayName || service.name;
    deviceIp = service.addresses[0];
    devicePort = service.port;
  } else {
    // Neither worked - can't add device
    console.log('mDNS: Cannot resolve device - no encoded name and no standard resolution');
    return;
  }

  const device: Device = {
    id: service.txt?.deviceId || service.name,
    name: deviceName,
    ip: deviceIp,
    port: devicePort,
    platform: (service.txt?.platform as 'windows' | 'android') || 'windows',
    lastSeen: new Date(),
    isOnline: true,
  };

  console.log('mDNS: Adding device to store:', device.name, device.ip, device.port);
  addDevice(device);
  console.log('mDNS: Device added, current devices:', useDevicesStore.getState().devices.length);
}

/**
 * Start discovering devices on the network
 */
export function startMdnsDiscovery(): void {
  if (isRunning) {
    console.log('mDNS discovery already running');
    return;
  }

  const addDevice = useDevicesStore.getState().addDevice;
  const markOffline = useDevicesStore.getState().markOffline;

  // Listen for when scan starts
  zeroconf.on('start', () => {
    console.log('mDNS: Scan started event received');
  });



  // Set to track services we've already processed
  const processedServices = new Set<string>();

  // Listen for found services (before resolution)
  zeroconf.on('found', (name: string) => {
    console.log('mDNS: Found service:', name);

    // Try to decode the service name immediately (Android workaround)
    const decoded = decodeServiceName(name);
    if (decoded && !processedServices.has(name)) {
      console.log('mDNS: Decoded service name immediately:', decoded);
      processedServices.add(name);

      // Create a minimal service object with decoded info
      const service: ZeroconfService = {
        name: name,
        host: decoded.ip,
        port: decoded.port,
        addresses: [decoded.ip],
        txt: {},
      };
      handleResolvedService(service, addDevice);
      return; // No need to poll - we got what we need from the name!
    }

    // If name isn't encoded, fall back to polling for resolution
    console.log('mDNS: Service name not encoded, waiting for resolution...');
    let attempts = 0;
    const maxAttempts = 15; // Reduced since encoded names work immediately
    const pollInterval = setInterval(() => {
      attempts++;
      const services = zeroconf.getServices();
      const service = services[name];

      if (attempts % 5 === 1) {
        console.log(`mDNS: Poll attempt ${attempts} for ${name}:`, JSON.stringify(service));
      }

      if (service && service.host && !processedServices.has(name)) {
        console.log('mDNS: Service resolved from polling:', name);
        processedServices.add(name);
        handleResolvedService(service, addDevice);
        clearInterval(pollInterval);
      } else if (attempts >= maxAttempts) {
        console.log('mDNS: Max poll attempts reached for:', name);
        clearInterval(pollInterval);
      }
    }, 1000);
  });

  // Listen for resolved services
  zeroconf.on('resolved', (service: ZeroconfService) => {
    console.log('mDNS: Resolved device via event:', service.name);
    console.log('mDNS: Service details:', JSON.stringify(service, null, 2));
    handleResolvedService(service, addDevice);
  });

  // Listen for removed services
  zeroconf.on('removed', (service: { name: string; txt?: { deviceId?: string } }) => {
    console.log('mDNS: Device removed:', service.name);
    const deviceId = service.txt?.deviceId || service.name;
    markOffline(deviceId);
  });

  // Listen for errors
  zeroconf.on('error', (error: Error) => {
    console.error('mDNS error:', error);
  });

  // Listen for update events
  zeroconf.on('update', () => {
    console.log('mDNS: Update event received');
  });

  // Start scanning - NSD finds services quickly and we decode IP/port from service name
  console.log('mDNS: Starting scan for _homemedia._tcp');

  try {
    zeroconf.scan('homemedia', 'tcp', 'local.');
    isRunning = true;
    console.log('mDNS: Discovery started - using encoded service names for Android compatibility');
  } catch (e) {
    console.error('mDNS: Error starting scan:', e);
  }
}

/**
 * Stop mDNS discovery
 */
export function stopMdnsDiscovery(): void {
  if (!isRunning) return;

  zeroconf.stop();
  zeroconf.removeAllListeners();
  isRunning = false;

  console.log('mDNS: Discovery stopped');
}

/**
 * Restart discovery (useful after network changes)
 */
export function restartMdnsDiscovery(): void {
  stopMdnsDiscovery();
  startMdnsDiscovery();
}

/**
 * Get the Zeroconf instance for publishing (if needed)
 */
export function getZeroconf(): typeof zeroconf {
  return zeroconf;
}

/**
 * Encode device info into service name for cross-platform compatibility
 * Format: {deviceName}_{port}_{ip-with-dashes}
 */
function encodeServiceName(deviceName: string, port: number, ip: string): string {
  const truncatedName = deviceName.substring(0, MAX_DEVICE_NAME_LENGTH);
  const encodedIp = ip.replace(/\./g, '-');
  return `${truncatedName}_${port}_${encodedIp}`;
}

/**
 * Generate a unique device ID for this session
 */
function generateDeviceId(): string {
  return 'android-' + Math.random().toString(36).substring(2, 10);
}

/**
 * Publish this device as a service on the network
 * Uses a two-phase approach to discover our own IP:
 * 1. Publish a temporary service
 * 2. Discover our own service to get our IP
 * 3. Republish with encoded service name containing IP
 */
export function publishMdnsService(deviceName: string, port: number = DEFAULT_PORT): void {
  if (isPublishing) {
    console.log('mDNS: Already publishing');
    return;
  }

  ourDeviceId = generateDeviceId();
  const tempServiceName = `_temp_${ourDeviceId}`;

  console.log('mDNS: Starting publish process for:', deviceName);
  console.log('mDNS: Using temp service name:', tempServiceName);

  // Listen for the published event to get our IP
  const onPublished = (name: string) => {
    console.log('mDNS: Service published event:', name);

    // Check services to find our own and get our IP
    setTimeout(() => {
      const services = zeroconf.getServices();
      console.log('mDNS: Current services after publish:', Object.keys(services));

      // Look for our temp service
      const ourService = services[tempServiceName];
      if (ourService && ourService.addresses && ourService.addresses.length > 0) {
        // Found our IP!
        const ourIp = ourService.addresses.find((addr: string) => !addr.includes(':')) || ourService.addresses[0];
        console.log('mDNS: Discovered our IP:', ourIp);

        // Unpublish temp service
        zeroconf.unpublishService(tempServiceName);

        // Now publish with encoded name
        publishWithEncodedName(deviceName, port, ourIp);
      } else {
        console.log('mDNS: Could not find our own service, trying alternate method');
        // Fallback: just publish without encoded IP (other devices may still resolve it)
        publishWithEncodedName(deviceName, port, '0-0-0-0');
      }

      zeroconf.removeListener('published', onPublished);
    }, 1000);
  };

  zeroconf.on('published', onPublished);

  // Publish temporary service to discover our IP
  try {
    zeroconf.publishService(
      SERVICE_TYPE,
      SERVICE_PROTOCOL,
      SERVICE_DOMAIN,
      tempServiceName,
      port,
      { deviceId: ourDeviceId, platform: 'android', temp: 'true' }
    );
    console.log('mDNS: Temp service publish initiated');
  } catch (e) {
    console.error('mDNS: Error publishing temp service:', e);
    zeroconf.removeListener('published', onPublished);
    // Fallback: publish without IP discovery
    publishWithEncodedName(deviceName, port, '0-0-0-0');
  }
}

/**
 * Publish the final service with encoded name containing IP
 */
function publishWithEncodedName(deviceName: string, port: number, ip: string): void {
  const encodedName = encodeServiceName(deviceName, port, ip);
  publishedServiceName = encodedName;
  ourEncodedServiceName = encodedName; // Track for self-filtering during discovery

  console.log('mDNS: Publishing with encoded name:', encodedName);

  try {
    zeroconf.publishService(
      SERVICE_TYPE,
      SERVICE_PROTOCOL,
      SERVICE_DOMAIN,
      encodedName,
      port,
      {
        deviceId: ourDeviceId || generateDeviceId(),
        platform: 'android',
        version: '1.0.0',
        displayName: deviceName,
        ip: ip,
      }
    );
    isPublishing = true;
    console.log('mDNS: Service published successfully');
  } catch (e) {
    console.error('mDNS: Error publishing service:', e);
    isPublishing = false;
  }
}

/**
 * Stop publishing the service
 */
export function unpublishMdnsService(): void {
  if (!isPublishing || !publishedServiceName) {
    console.log('mDNS: No service to unpublish');
    return;
  }

  try {
    zeroconf.unpublishService(publishedServiceName);
    isPublishing = false;
    publishedServiceName = null;
    ourDeviceId = null;
    ourEncodedServiceName = null;
    console.log('mDNS: Service unpublished');
  } catch (e) {
    console.error('mDNS: Error unpublishing service:', e);
  }
}
