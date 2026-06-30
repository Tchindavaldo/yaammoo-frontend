// Metro config Expo + wrapper Sentry pour générer les source maps au bundle.
const { getDefaultConfig } = require("expo/metro-config");
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

// getSentryExpoConfig applique d'abord la config Expo par défaut, puis ajoute
// la collecte des source maps nécessaire à l'upload Sentry.
const config = getSentryExpoConfig(__dirname, getDefaultConfig(__dirname));

module.exports = config;
