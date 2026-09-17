// Metro config Expo + wrapper Sentry pour générer les source maps au bundle.
const { getDefaultConfig } = require("expo/metro-config");
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

// getSentryExpoConfig applique d'abord la config Expo par défaut, puis ajoute
// la collecte des source maps nécessaire à l'upload Sentry.
const config = getSentryExpoConfig(__dirname, getDefaultConfig(__dirname));

// ⚠️ Metro ne lit PAS `.gitignore` : il surveille tout le dossier du projet.
// `dist/` (89 Mo de bundles exportes par `eas update`) etait donc scanne, et le
// moindre changement dedans relancait un bundle. En dev web, Metro rebundlait
// ainsi toutes les 3 a 6 secondes sans qu'aucun fichier source ne change, jusqu'a
// saturer la memoire de Node (« JavaScript heap out of memory » a 2 Go) et tuer
// le serveur. Chaque rebundle coupait aussi le socket, d'ou les `connect_error`
// en rafale.
config.resolver.blockList = [/\/dist\/.*/];

module.exports = config;
