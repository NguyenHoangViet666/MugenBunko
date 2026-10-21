const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);
// Pure TypeScript election contracts are shared with the web app outside the Expo root.
config.watchFolders = [
  ...config.watchFolders,
  path.resolve(__dirname, "../shared"),
];
module.exports = config;
