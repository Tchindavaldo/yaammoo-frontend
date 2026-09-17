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

/** Abonnes prevenus au RETOUR du reseau (pas a chaque changement d'etat). */
const restoreListeners = new Set<() => void>();

/**
 * S'abonner au retour de la connexion.
 *
 * ⚠️ Sans cela, l'utilisateur reste bloque sur l'ecran d'erreur jusqu'a ce qu'il
 * tape lui-meme « Reessayer », alors que le reseau est revenu depuis longtemps.
 * Le socket, lui, se reconnecte seul (socket.io) et son `connect` declenche le
 * catch-up : seul le HTTP a besoin de ce signal.
 *
 * Retourne la fonction de desabonnement.
 */
export function onNetworkRestored(listener: () => void): () => void {
  restoreListeners.add(listener);
  return () => restoreListeners.delete(listener);
}

/** Demarre l'ecoute. Appele une seule fois au boot, depuis `setupHttp`. */
export function startNetworkWatch() {
  NetInfo.addEventListener((state) => {
    // `isInternetReachable` vaut `null` tant que la sonde n'a pas abouti : on ne
    // le traduit pas en « hors ligne », sinon on bloquerait les requetes pendant
    // la fenetre de determination.
    const next =
      state.isInternetReachable === null
        ? null
        : Boolean(state.isConnected && state.isInternetReachable);

    // Trace systematique : `isInternetReachable` s'est revele renvoyer `false`
    // alors que le reseau fonctionnait (sonde Android/iOS mise en defaut par un
    // DNS lent ou un reseau qui filtre la requete de test). Sans ce log on ne
    // peut pas distinguer une vraie coupure d'un faux negatif.
    console.log(
      `[net] type=${state.type} connected=${state.isConnected} reachable=${state.isInternetReachable} → ${next}`,
    );

    // On ne notifie QUE la transition hors-ligne → en ligne. NetInfo emet a
    // chaque changement d'interface (WiFi ↔ 4G, changement de reseau) ; relancer
    // les requetes a chacun d'eux les multiplierait sans raison.
    const restored = reachable === false && next === true;
    reachable = next;

    if (restored) {
      restoreListeners.forEach((listener) => {
        try {
          listener();
        } catch {
          // Un abonne qui echoue ne doit pas empecher les suivants d'etre
          // prevenus : c'est le seul signal qu'ils recevront.
        }
      });
    }
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
