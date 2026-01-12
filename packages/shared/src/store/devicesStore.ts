/**
 * Zustand store for managing discovered devices
 */

import { create } from 'zustand';
import { Device } from '../api/types';

interface DevicesState {
  /** List of discovered devices */
  devices: Device[];
  /** Currently selected device */
  selectedDevice: Device | null;
  /** Whether we're scanning for devices */
  isScanning: boolean;

  /** Add or update a device */
  addDevice: (device: Device) => void;
  /** Remove a device */
  removeDevice: (deviceId: string) => void;
  /** Mark device as offline */
  markOffline: (deviceId: string) => void;
  /** Mark device as online */
  markOnline: (deviceId: string) => void;
  /** Set selected device */
  selectDevice: (device: Device | null) => void;
  /** Set scanning status */
  setScanning: (scanning: boolean) => void;
  /** Clear all devices */
  clearDevices: () => void;
  /** Get online devices only */
  getOnlineDevices: () => Device[];
}

export const useDevicesStore = create<DevicesState>((set, get) => ({
  devices: [],
  selectedDevice: null,
  isScanning: false,

  addDevice: (device) =>
    set((state) => {
      const existingIndex = state.devices.findIndex((d) => d.id === device.id);
      if (existingIndex >= 0) {
        // Update existing device
        const updated = [...state.devices];
        updated[existingIndex] = { ...device, isOnline: true, lastSeen: new Date() };
        return { devices: updated };
      } else {
        // Add new device
        return {
          devices: [...state.devices, { ...device, isOnline: true, lastSeen: new Date() }],
        };
      }
    }),

  removeDevice: (deviceId) =>
    set((state) => ({
      devices: state.devices.filter((d) => d.id !== deviceId),
      selectedDevice:
        state.selectedDevice?.id === deviceId ? null : state.selectedDevice,
    })),

  markOffline: (deviceId) =>
    set((state) => ({
      devices: state.devices.map((d) =>
        d.id === deviceId ? { ...d, isOnline: false } : d
      ),
    })),

  markOnline: (deviceId) =>
    set((state) => ({
      devices: state.devices.map((d) =>
        d.id === deviceId ? { ...d, isOnline: true, lastSeen: new Date() } : d
      ),
    })),

  selectDevice: (device) => set({ selectedDevice: device }),

  setScanning: (scanning) => set({ isScanning: scanning }),

  clearDevices: () => set({ devices: [], selectedDevice: null }),

  getOnlineDevices: () => get().devices.filter((d) => d.isOnline),
}));
