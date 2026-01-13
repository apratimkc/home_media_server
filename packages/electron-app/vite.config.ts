import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        entry: 'electron/main.ts',
        onstart(args) {
          // Clear ELECTRON_RUN_AS_NODE to prevent running as Node.js
          delete process.env.ELECTRON_RUN_AS_NODE;
          args.startup();
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            minify: false,
            rollupOptions: {
              // Keep these as external (not bundled)
              external: [
                'electron',
                'sql.js',
                'express',
                'bonjour',
                'chokidar',
              ],
            },
          },
        },
      },
      preload: {
        input: 'electron/preload.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
          },
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
