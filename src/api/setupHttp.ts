import axios from "axios";
import { APP_BUILD, APP_PLATFORM, APP_VERSION } from "./version";

/**
 * Configure les headers globaux envoyés à CHAQUE requête backend.
 *
 * Tout le code utilise l'instance axios par défaut (`axios.get/post/...`), donc
 * agir ici couvre les ~41 appels existants ET tous les futurs, sans toucher un
 * seul call site.
 *
 * Défense en profondeur (2 couches) :
 *  1. axios.defaults.headers.common → header présent dès le boot, sur toute requête.
 *  2. interceptor request → filet de sécurité qui ré-injecte le header même si
 *     une requête fournit ses propres headers (axios fusionne, mais on garantit
 *     ici qu'il n'est jamais perdu).
 *
 * Le backend lit `x-app-version` pour servir le bon format de réponse selon la
 * version du client (ex. deliveryHours ancien format vs nouveau format).
 */
export function setupHttp() {
  // Couche 1 : defaults globaux.
  axios.defaults.headers.common["x-app-version"] = APP_VERSION;
  axios.defaults.headers.common["x-platform"] = APP_PLATFORM;
  if (APP_BUILD) {
    axios.defaults.headers.common["x-app-build"] = APP_BUILD;
  }

  // Couche 2 : interceptor filet de sécurité.
  axios.interceptors.request.use((config) => {
    config.headers = config.headers ?? {};
    if (!config.headers["x-app-version"]) {
      config.headers["x-app-version"] = APP_VERSION;
    }
    if (!config.headers["x-platform"]) {
      config.headers["x-platform"] = APP_PLATFORM;
    }
    if (APP_BUILD && !config.headers["x-app-build"]) {
      config.headers["x-app-build"] = APP_BUILD;
    }
    return config;
  });

  if (__DEV__) {
    console.log(
      `[http] headers globaux configurés → x-app-version=${APP_VERSION} x-platform=${APP_PLATFORM}`
    );
  }
}
