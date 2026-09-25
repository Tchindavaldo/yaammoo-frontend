import axios, { AxiosError } from "axios";
import { APP_BUILD, APP_PLATFORM, APP_VERSION } from "./version";
import {
  isOnline,
  reportNetworkFailure,
  startNetworkWatch,
  trackInFlight,
} from "@/src/services/network";

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

  // Couche 1 : defaults globaux.
  axios.defaults.headers.common["x-app-version"] = APP_VERSION;
  axios.defaults.headers.common["x-platform"] = APP_PLATFORM;
  if (APP_BUILD) {
    axios.defaults.headers.common["x-app-build"] = APP_BUILD;
  }

  // Couche 2 : interceptor filet de sécurité.
  axios.interceptors.request.use(async (config) => {
    // Coupure IMMEDIATE quand l'appareil sait qu'aucune requete ne peut aboutir.
    //
    // ⚠️ AUCUN `timeout` axios n'est pose, volontairement : un delai fixe coupe
    // aussi les requetes lentes mais legitimes. `POST /transaction` (paiement
    // MobileWallet, qui attend l'operateur) depassait 20 s et la commande
    // echouait en ECONNABORTED alors que le reseau fonctionnait. La detection
    // doit venir de l'etat reel du lien, jamais d'un chronometre.
    if (!isOnline()) {
      // Trace le rejet : c'est le seul moyen de distinguer une vraie coupure
      // d'un faux negatif de la sonde NetInfo, qui rejetterait alors des
      // requetes parfaitement valides.
      console.log(`[net] REJET hors-ligne → ${config.method} ${config.url}`);
      return Promise.reject(new AxiosError(OFFLINE_MESSAGE, OFFLINE_CODE, config));
    }

    // Rend la requete annulable : si la coupure est constatee pendant son vol,
    // `network.ts` l'avorte au lieu de la laisser pendante (aucun timeout axios
    // ne viendrait la terminer). Sans cela le splash pouvait rester fige.
    if (!config.signal) {
      const { signal, done } = trackInFlight();
      config.signal = signal;
      // Nettoyage dans les deux issues, via les interceptors de reponse.
      (config as any).__netDone = done;
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
    // Bearer Firebase sur toute requete backend : les routes `/order` (et
    // d'autres) l'exigent depuis la gestion des employes. Un appel qui pose
    // deja son propre header garde le sien. `getIdToken` sert le cache et ne
    // rafraichit qu'a l'expiration.
    // Imports paresseux : `firebase` importe `config`, un import statique ici
    // creait un cycle (Config indefini au chargement).
    const { Config } = require("./config");
    if (
      !config.headers["Authorization"] &&
      config.url?.startsWith(Config.apiUrl)
    ) {
      const { auth } = require("@/src/services/firebase");
      const token = await auth.currentUser?.getIdToken().catch(() => null);
      if (token) config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  });

  // Trace les echecs sans reponse serveur (coupure, DNS, abandon) : sans ce log
  // l'UI affiche « network error » sans qu'on sache d'ou il vient.
  axios.interceptors.response.use(
    (response) => {
      (response.config as any)?.__netDone?.();
      return response;
    },
    (error) => {
      (error.config as any)?.__netDone?.();
      if (!error.response && error.code !== OFFLINE_CODE) {
        console.log(
          `[net] ECHEC code=${error.code} msg=${error.message} url=${error.config?.url}`,
        );
        // Aucune reponse serveur = le lien ne porte pas. On bascule hors-ligne
        // immediatement, sans attendre la sonde periodique : les requetes
        // suivantes sont alors rejetees d'entree au lieu de rester pendantes.
        reportNetworkFailure();
      }
      return Promise.reject(error);
    },
  );

  if (__DEV__) {
    console.log(
      `[http] headers globaux configurés → x-app-version=${APP_VERSION} x-platform=${APP_PLATFORM}`
    );
  }
}
