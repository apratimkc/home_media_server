/**
 * Zustand store for app settings
 */

import { create } from 'zustand';
import { AppSettings, DEFAULT_SETTINGS, ShareConfig, SharedFolder } from '../api/types';

interface SettingsState {
  /** App settings */
  settings: AppSettings;
  /** Share configuration */
  shareConfig: ShareConfig;
  /** Whether settings have been loaded */
  isLoaded: boolean;

  /** Update settings */
  updateSettings: (partial: Partial<AppSettings>) => void;
  /** Load settings from storage */
  loadSettings: (settings: AppSettings) => void;
  /** Reset to defaults */
  resetSettings: () => void;

  /** Update share config */
  updateShareConfig: (partial: Partial<ShareConfig>) => void;
  /** Add a shared folder */
  addSharedFolder: (folder: SharedFolder) => void;
  /** Remove a shared folder */
  removeSharedFolder: (folderId: string) => void;
  /** Toggle folder enabled state */
  toggleFolderEnabled: (folderId: string) => void;
  /** Enable/disable sharing */
  setShareEnabled: (enabled: boolean) => void;
}

const DEFAULT_SHARE_CONFIG: ShareConfig = {
  isEnabled: false,
  sharedFolders: [],
  deviceName: DEFAULT_SETTINGS.deviceName,
  port: DEFAULT_SETTINGS.serverPort,
};

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: DEFAULT_SETTINGS,
  shareConfig: DEFAULT_SHARE_CONFIG,
  isLoaded: false,

  updateSettings: (partial) =>
    set((state) => ({
      settings: { ...state.settings, ...partial },
    })),

  loadSettings: (settings) =>
    set({
      settings,
      isLoaded: true,
    }),

  resetSettings: () =>
    set({
      settings: DEFAULT_SETTINGS,
      shareConfig: DEFAULT_SHARE_CONFIG,
    }),

  updateShareConfig: (partial) =>
    set((state) => ({
      shareConfig: { ...state.shareConfig, ...partial },
    })),

  addSharedFolder: (folder) =>
    set((state) => ({
      shareConfig: {
        ...state.shareConfig,
        sharedFolders: [...state.shareConfig.sharedFolders, folder],
      },
    })),

  removeSharedFolder: (folderId) =>
    set((state) => ({
      shareConfig: {
        ...state.shareConfig,
        sharedFolders: state.shareConfig.sharedFolders.filter((f) => f.id !== folderId),
      },
    })),

  toggleFolderEnabled: (folderId) =>
    set((state) => ({
      shareConfig: {
        ...state.shareConfig,
        sharedFolders: state.shareConfig.sharedFolders.map((f) =>
          f.id === folderId ? { ...f, enabled: !f.enabled } : f
        ),
      },
    })),

  setShareEnabled: (enabled) =>
    set((state) => ({
      shareConfig: { ...state.shareConfig, isEnabled: enabled },
    })),
}));
