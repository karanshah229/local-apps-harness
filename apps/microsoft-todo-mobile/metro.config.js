const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const fs = require('fs');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch monorepo root
config.watchFolders = [monorepoRoot];

// 2. Resolve modules from mobile and root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. Ensure single canonical copy of React, React DOM, and React Native
const reactDir = fs.realpathSync(path.resolve(projectRoot, 'node_modules/react'));
const reactDomDir = fs.realpathSync(path.resolve(projectRoot, 'node_modules/react-dom'));
const reactNativeDir = fs.realpathSync(path.resolve(projectRoot, 'node_modules/react-native'));

config.resolver.extraNodeModules = {
  react: reactDir,
  'react-dom': reactDomDir,
  'react-native': reactNativeDir,
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react') {
    return {
      filePath: path.join(reactDir, 'index.js'),
      type: 'sourceFile',
    };
  }
  if (moduleName === 'react/jsx-runtime') {
    return {
      filePath: path.join(reactDir, 'jsx-runtime.js'),
      type: 'sourceFile',
    };
  }
  if (moduleName === 'react/jsx-dev-runtime') {
    return {
      filePath: path.join(reactDir, 'jsx-dev-runtime.js'),
      type: 'sourceFile',
    };
  }
  if (moduleName === 'react/compiler-runtime') {
    return {
      filePath: path.join(reactDir, 'compiler-runtime.js'),
      type: 'sourceFile',
    };
  }
  if (moduleName === 'react-dom') {
    return {
      filePath: path.join(reactDomDir, 'index.js'),
      type: 'sourceFile',
    };
  }
  if (moduleName === 'react-native') {
    return {
      filePath: path.join(reactNativeDir, 'index.js'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

// 4. Block Metro from reading other apps
config.resolver.blockList = [
  new RegExp(path.resolve(monorepoRoot, 'apps/microsoft-todo-client') + '/.*'),
  new RegExp(path.resolve(monorepoRoot, 'apps/microsoft-todo-server') + '/.*'),
];

module.exports = withNativeWind(config, { input: './global.css' });
