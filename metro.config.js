// Sentry's Metro wrapper around Expo's default config: assigns stable Debug IDs to
// every generated bundle + source map pair so the EAS-build source-map upload can
// match them server-side. It WRAPS @expo/metro-config's getDefaultConfig, so the
// Expo Router / React Compiler / server-output transforms all survive — verified by
// `npx expo config --type public` (plugins + experiments intact) and `expo export -p
// web` in this unit's gates.
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname);

module.exports = config;
