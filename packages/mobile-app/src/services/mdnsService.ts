/**
 * mDNS Service for discovering devices on local network
 * Uses react-native-zeroconf
 */

import Zeroconf from 'react-native-zeroconf';
import { useDevicesStore, Device } from '@home-media-server/shared';

const zeroconf = new Zeroconf();
let isRunning = false;

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

  // Listen for resolved services
  zeroconf.on('resolved', (service: {
    name: string;
    host: string;
    port: number;
    txt?: { deviceId?: string; platform?: string };
    addresses?: string[];
  }) => {
    console.log('mDNS: Discovered device:', service.name);

    const device: Device = {
      id: service.txt?.deviceId || service.name,
      name: service.name,
      ip: service.addresses?.[0] || service.host,
      port: service.port,
      platform: (service.txt?.platform as 'windows' | 'android') || 'windows',
      lastSeen: new Date(),
      isOnline: true,
    };

    addDevice(device);
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

  // Start scanning for homemedia services
  zeroconf.scan('homemedia', 'tcp', 'local.');
  isRunning = true;

  console.log('mDNS: Discovery started');
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
