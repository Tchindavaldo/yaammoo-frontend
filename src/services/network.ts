import NetInfo from "@react-native-community/netinfo";

/**
 * Etat reel de la connectivite.
 *
 * ⚠️ « WiFi active » ne veut PAS dire « Internet accessible » : hotspot sans
 * credit, portail captif, box sans ligne. L'app partait du principe inverse et
 * lancait des requetes qui restaient pendantes, laissant tourner un loader sans
 * fin. NetInfo distingue les deux via `isInternetReachable`, verifie par une
 * vraie requete sortante — la reponse est immediate, sans tatonner ni attendre
 * l'expiration d'un timeout.
 */

/**
 * Dernier etat connu, tenu a jour par l'abonnement.
 *
 * ⚠️ Volontairement synchrone : les interceptors axios et les handlers socket
 * doivent trancher AVANT de partir en reseau, sans pouvoir attendre une
 * promesse. `null` = pas encore determine (tout debut du boot), on laisse alors
 * passer plutot que de bloquer a tort.
 */
let reachable: boolean | null = null;

/** Demarre l'ecoute. Appele une seule fois au boot, depuis `setupHttp`. */
export function startNetworkWatch() {
  NetInfo.addEventListener((state) => {
    // `isInternetReachable` vaut `null` tant que la sonde n'a pas abouti : on ne
    // le traduit pas en « hors ligne », sinon on bloquerait les requetes pendant
    // la fenetre de determination.
    reachable =
      state.isInternetReachable === null
        ? null
        : Boolean(state.isConnected && state.isInternetReachable);
  });
}

/** `true` si une requete reseau a une chance d'aboutir. */
export function isOnline(): boolean {
  return reachable !== false;
}

/** Etat brut, pour l'affichage d'un bandeau hors-ligne. */
export function getReachability(): boolean | null {
  return reachable;
}
