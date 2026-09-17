// Metro config Expo + wrapper Sentry pour générer les source maps au bundle.
const { getDefaultConfig } = require("expo/metro-config");
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

// getSentryExpoConfig applique d'abord la config Expo par défaut, puis ajoute
// la collecte des source maps nécessaire à l'upload Sentry.
const config = getSentryExpoConfig(__dirname, getDefaultConfig(__dirname));

// ⚠️ Metro ne lit PAS `.gitignore` : il surveille tout le dossier du projet.
// `dist/` (89 Mo de bundles exportes par `eas update`) et `android/app/build`
// (1,6 Go de Gradle) sont donc scannes a la resolution alors qu'aucun n'entre
// dans un bundle. Les exclure allege le crible et la memoire de Node.
//
// ⚠️ Ce `blockList` ne corrige PAS le rebundle en boucle : il filtre la
// RESOLUTION de modules, pas la surveillance de fichiers — un fichier bloque ici
// reste watche. La boucle « rebundle toutes les 3 a 6 s sans qu'aucun fichier ne
// change » venait d'ailleurs : la sonde de connectivite de NetInfo tapait
// l'origine de la page, donc Metro lui-meme, et chaque ping relancait un bundle.
// Corrige en pointant la sonde vers le backend (voir src/services/network.ts).
// ⚠️ Ancre sur __dirname : un motif large comme `/\/dist\/.*/` bloquerait aussi
// `node_modules/react-native-web/dist/`, et le bundle web echouerait aussitot.
const projectRoot = __dirname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Artefacts de build, scannes a la resolution alors qu'aucun n'entre dans un
// bundle : `android/app/build` pese a lui seul 1,6 Go (Gradle), et `dist/`
// jusqu'a 89 Mo apres un `eas update`. Les tenir hors du crible reduit la
// pression memoire de Node (« heap out of memory » a 2 Go).
config.resolver.blockList = [
  new RegExp(`^${projectRoot}/dist/.*`),
  new RegExp(`^${projectRoot}/android/(app/)?build/.*`),
  new RegExp(`^${projectRoot}/android/\\.gradle/.*`),
  new RegExp(`^${projectRoot}/ios/(build|Pods)/.*`),
];

module.exports = config;
