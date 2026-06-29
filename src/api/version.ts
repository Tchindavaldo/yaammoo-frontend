import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Métadonnées de version de l'app, source unique de vérité.
 *
 * La version vient de `app.json` → `expo.version` via expo-constants, donc elle
 * se met à jour automatiquement à chaque bump de version. On garde un fallback
 * en dur synchronisé avec app.json au cas où expo-constants renverrait undefined
 * (peut arriver dans certains contextes OTA / build mal configuré).
 *
 * ⚠️ FALLBACK_VERSION doit rester aligné sur `expo.version` de app.json.
 */
const FALLBACK_VERSION = "1.0.1";

/**
 * Version publique de l'app (CFBundleShortVersionString côté iOS).
 * Ex: "1.0.1". Toujours non-vide grâce au fallback.
 */
export const APP_VERSION: string =
  Constants.expoConfig?.version ?? FALLBACK_VERSION;

/**
 * Build number natif (iOS) / versionCode (Android). Optionnel.
 */
export const APP_BUILD: string | undefined =
  Constants.expoConfig?.ios?.buildNumber ??
  Constants.expoConfig?.android?.versionCode?.toString();

/**
 * Plateforme courante ("ios" | "android" | "web").
 */
export const APP_PLATFORM: string = Platform.OS;

// Garde-fou : si expo-constants n'a pas fourni la version, on le signale.
// Sentry (déjà installé) remontera ce warning en prod si jamais ça arrive.
if (!Constants.expoConfig?.version) {
  console.warn(
    "[version] expoConfig.version introuvable → fallback sur",
    FALLBACK_VERSION
  );
}
