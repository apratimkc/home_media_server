/**
 * Zustand store for managing file browsing state
 */

import { create } from 'zustand';
import { MediaFile } from '../api/types';

interface FilesState {
  /** Current path being viewed */
  currentPath: string;
  /** Files at current path */
  files: MediaFile[];
  /** Navigation history (for back button) */
  history: string[];
  /** Whether files are loading */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Currently selected file */
  selectedFile: MediaFile | null;

  /** Set current files */
  setFiles: (files: MediaFile[], path: string) => void;
  /** Navigate to a folder */
  navigateTo: (path: string) => void;
  /** Go back in history */
  goBack: () => string | null;
  /** Set loading state */
  setLoading: (loading: boolean) => void;
  /** Set error */
  setError: (error: string | null) => void;
  /** Select a file */
  selectFile: (file: MediaFile | null) => void;
  /** Clear state */
  clear: () => void;
}

export const useFilesStore = create<FilesState>((set, get) => ({
  currentPath: '/',
  files: [],
  history: [],
  isLoading: false,
  error: null,
  selectedFile: null,

  setFiles: (files, path) =>
    set({
      files,
      currentPath: path,
      isLoading: false,
      error: null,
    }),

  navigateTo: (path) =>
    set((state) => ({
      history: [...state.history, state.currentPath],
      currentPath: path,
      files: [],
      isLoading: true,
      error: null,
    })),

  goBack: () => {
    const { history } = get();
    if (history.length === 0) return null;

    const previousPath = history[history.length - 1];
    set({
      history: history.slice(0, -1),
      currentPath: previousPath,
      files: [],
      isLoading: true,
    });
    return previousPath;
  },

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error, isLoading: false }),

  selectFile: (file) => set({ selectedFile: file }),

  clear: () =>
    set({
      currentPath: '/',
      files: [],
      history: [],
      isLoading: false,
      error: null,
      selectedFile: null,
    }),
}));
