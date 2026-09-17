import axios, { AxiosError } from "axios";
import { APP_BUILD, APP_PLATFORM, APP_VERSION } from "./version";
import { isOnline, startNetworkWatch } from "@/src/services/network";

/**
 * Delai maximal d'une requete. Genereux : mesure reelle a 44 ko/s sur le reseau
 * de test, un upload d'image legitime doit avoir le temps d'aboutir.
 */
const HTTP_TIMEOUT_MS = 20000;

/** Code porte par l'erreur hors-ligne, pour que l'UI la distingue d'un 500. */
export const OFFLINE_CODE = "ERR_OFFLINE";
export const OFFLINE_MESSAGE = "Pas de connexion Internet";

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
  startNetworkWatch();

  // Filet de securite : sans `timeout`, axios attend INDEFINIMENT. Sur un lien
  // ouvert mais muet (portail captif, box sans ligne), la requete ne revient
  // jamais et le loader tourne sans fin. La coupure hors-ligne ci-dessous est
  // immediate ; ce delai ne couvre que le reseau qui repond trop lentement.
  axios.defaults.timeout = HTTP_TIMEOUT_MS;

  // Couche 1 : defaults globaux.
  axios.defaults.headers.common["x-app-version"] = APP_VERSION;
  axios.defaults.headers.common["x-platform"] = APP_PLATFORM;
  if (APP_BUILD) {
    axios.defaults.headers.common["x-app-build"] = APP_BUILD;
  }

  // Couche 2 : interceptor filet de sécurité.
  axios.interceptors.request.use((config) => {
    // Coupure IMMEDIATE quand l'appareil sait qu'aucune requete ne peut aboutir.
    // Sans elle, on paierait `HTTP_TIMEOUT_MS` d'attente pour un echec certain,
    // alors que NetInfo connait deja la reponse : l'erreur arrive instantanement
    // et l'ecran peut afficher « pas de connexion » au lieu d'un loader fige.
    if (!isOnline()) {
      return Promise.reject(new AxiosError(OFFLINE_MESSAGE, OFFLINE_CODE, config));
    }

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
