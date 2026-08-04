import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Métadonnées de version de l'app, source unique de vérité.
 *
 * `app.json` → `expo.version` est le SEUL endroit où la version se bumpe : elle
 * arrive ici via expo-constants. Aucune valeur en dur à maintenir en parallèle.
 */

/**
 * Version publique de l'app (CFBundleShortVersionString côté iOS), ex. "1.0.3".
 *
 * Vide si expo-constants n'a rien fourni (cas anormal, signalé plus bas). Le
 * backend traite alors le client comme une version inconnue — comportement par
 * défaut, jamais de skip de paiement accordé par erreur.
 */
export const APP_VERSION: string = Constants.expoConfig?.version ?? "";

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
    "[version] expoConfig.version introuvable → x-app-version sera vide"
  );
}
