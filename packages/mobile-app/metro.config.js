const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 */
const config = {
  watchFolders: [workspaceRoot],
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
    // Allow importing from shared package
    extraNodeModules: {
      '@home-media-server/shared': path.resolve(workspaceRoot, 'packages/shared'),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
