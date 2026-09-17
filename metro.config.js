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
// ⚠️ Ancre sur __dirname : un motif large comme `/\/dist\/.*/` bloquerait aussi
// `node_modules/react-native-web/dist/`, et le bundle web echouerait aussitot.
const projectRoot = __dirname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Artefacts de build, scannes par Metro alors qu'aucun n'entre dans un bundle :
// `android/app/build` pese a lui seul 1,6 Go (Gradle), et `dist/` jusqu'a 89 Mo
// apres un `eas update`. Les tenir hors du crible est ce qui evite la
// saturation memoire de Node (« heap out of memory » a 2 Go) et les rebundles
// en rafale qui tuaient le serveur de dev.
config.resolver.blockList = [
  new RegExp(`^${projectRoot}/dist/.*`),
  new RegExp(`^${projectRoot}/android/(app/)?build/.*`),
  new RegExp(`^${projectRoot}/android/\\.gradle/.*`),
  new RegExp(`^${projectRoot}/ios/(build|Pods)/.*`),
];

module.exports = config;
