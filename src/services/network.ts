import NetInfo from "@react-native-community/netinfo";
import { Config } from "../api/config";

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

/**
 * Passe a `true` des le PREMIER verdict rendu par NetInfo.
 *
 * ⚠️ Avant ce drapeau, `isOnline()` traduisait `null` en « en ligne » pour ne pas
 * bloquer pendant la fenetre de determination du boot. Mais sur un reseau actif
 * dont le trafic ne passe pas, NetInfo repasse `isInternetReachable` a `null`
 * entre deux sondes : on retombait alors dans « en ligne », les requetes
 * partaient, et sans timeout axios elles restaient pendantes — splash et
 * pull-to-refresh tournaient a l'infini. Une fois le premier verdict connu, un
 * retour a `null` ne doit plus etre lu comme un feu vert : on conserve le
 * dernier etat certain.
 */
let settled = false;

/** Abonnes prevenus au RETOUR du reseau (pas a chaque changement d'etat). */
const restoreListeners = new Set<() => void>();

/**
 * Abonnes prevenus a CHAQUE changement d'etat, dans les deux sens.
 *
 * ⚠️ Distinct de `restoreListeners`, qui ne sert qu'a relancer des requetes au
 * retour du reseau. Ceux-ci sont la pour l'affichage : un bandeau hors-ligne
 * doit apparaitre a la coupure ET disparaitre au retour.
 */
const stateListeners = new Set<(online: boolean) => void>();

/**
 * S'abonner a l'etat de connectivite pour l'AFFICHER.
 *
 * Appelle immediatement le listener avec l'etat courant, puis a chaque
 * changement — un ecran monte en cours de coupure doit savoir sans attendre la
 * transition suivante.
 *
 * Retourne la fonction de desabonnement.
 */
export function onNetworkStateChange(
  listener: (online: boolean) => void,
): () => void {
  stateListeners.add(listener);
  listener(reachable !== false);
  return () => stateListeners.delete(listener);
}

/** Diffuse l'etat courant aux abonnes d'affichage. */
function emitState() {
  const online = reachable !== false;
  stateListeners.forEach((listener) => {
    try {
      listener(online);
    } catch {
      // Un abonne qui echoue ne doit pas priver les suivants du signal.
    }
  });
}

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

/**
 * Adresse sondee pour trancher `isInternetReachable`.
 *
 * ⚠️ Sans cette configuration, NetInfo sonde l'origine de la page — en dev web,
 * c'est Metro lui-meme (`localhost:8081`). Chaque sonde traversait alors le
 * middleware de dev, qui relancait un bundle ; le bundle faisait echouer la
 * sonde suivante, NetInfo basculait `reachable` false → true, `onNetworkRestored`
 * relancait l'app, et le cycle repartait. D'ou le rebundle infini, les
 * rechargements de page en rafale et les `Socket connected` a repetition.
 *
 * On pointe donc la sonde vers le backend, qui n'a rien a voir avec le serveur
 * de dev. `/settings/app-version` est public (pas d'auth) et repond ~166 o.
 */
const REACHABILITY_URL = `${Config.apiUrl}/settings/app-version`;

/** Demarre l'ecoute. Appele une seule fois au boot, depuis `setupHttp`. */
export function startNetworkWatch() {
  NetInfo.configure({
    reachabilityUrl: REACHABILITY_URL,
    // La sonde ne lit pas le corps : le code HTTP suffit a trancher.
    reachabilityTest: async (response) => response.status === 200,
    // Intervalles volontairement larges : la sonde est un filet de securite,
    // les vrais changements d'interface arrivent par evenement systeme.
    reachabilityLongTimeout: 60 * 1000,
    reachabilityShortTimeout: 5 * 1000,
    reachabilityRequestTimeout: 15 * 1000,
  });

  NetInfo.addEventListener((state) => {
    // `isConnected === false` est un fait materiel (aucune interface active) :
    // il tranche sans attendre la sonde.
    let next: boolean | null;
    if (state.isConnected === false) {
      next = false;
    } else if (state.isInternetReachable === null) {
      // Sonde non aboutie : on garde le dernier etat certain plutot que de
      // repasser en « indetermine », qui vaudrait feu vert.
      next = settled ? reachable : null;
    } else {
      next = Boolean(state.isConnected && state.isInternetReachable);
    }

    if (next !== null) settled = true;

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
    const changed = reachable !== next;
    reachable = next;

    if (changed) emitState();

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

  // Sonde forcee au boot. L'abonnement seul ne rend son premier verdict qu'au
  // premier evenement systeme : sur un reseau actif mais mort, il n'en arrive
  // aucun, et le splash restait sans reponse. `fetch` tranche tout de suite.
  probe();
  // Cadence serree au boot : le socket n'est pas encore connecte, la sonde est
  // le seul capteur disponible.
  startProbeLoop(PROBE_FAST_MS);
}

/**
 * Sonde autonome, independante du trafic de l'app.
 *
 * ⚠️ Sans elle, l'etat n'etait rafraichi qu'a l'occasion d'une requete
 * applicative : une coupure survenue pendant que l'utilisateur lit un ecran
 * restait invisible jusqu'a sa prochaine action. L'etat doit etre connu A TOUT
 * INSTANT pour qu'un bandeau puisse s'afficher de lui-meme.
 */
function probe() {
  void NetInfo.refresh()
    .then((state) => {
      // `refresh()` force une vraie requete sortante et attend son verdict :
      // c'est ce qui distingue « interface active » de « trafic qui passe ».
      const next =
        state.isConnected === false
          ? false
          : state.isInternetReachable === null
            ? settled
              ? reachable
              : null
            : Boolean(state.isConnected && state.isInternetReachable);

      console.log(
        `[net] sonde type=${state.type} connected=${state.isConnected} reachable=${state.isInternetReachable} → ${next} (etat=${reachable}, cadence=${probeMs}ms)`,
      );

      if (next === null || next === reachable) return;

      const restored = reachable === false && next === true;
      reachable = next;
      settled = true;
      emitState();

      if (restored) {
        restoreListeners.forEach((listener) => {
          try {
            listener();
          } catch {
            // Un abonne qui echoue ne doit pas priver les suivants du signal.
          }
        });
      }
    })
    .catch(() => {
      // Un echec de sonde EST l'information : le reseau ne passe pas.
      if (reachable === false) return;
      reachable = false;
      settled = true;
      emitState();
    });
}

/** Handle de la boucle, pour ne jamais en demarrer deux. */
let probeTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Cadence serree, quand la sonde est le SEUL capteur : avant la premiere
 * connexion socket, et apres une coupure.
 */
const PROBE_FAST_MS = 2 * 1000;

/**
 * Cadence de filet, socket connecte.
 *
 * ⚠️ La boucle ne s'arrete jamais completement : le socket detecte les coupures
 * franches (WiFi coupe, mode avion) en quelques millisecondes, mais PAS le cas
 * ou l'interface reste active sans que le trafic passe — donnees epuisees, box
 * debranchee. La TCP attend alors, et socket.io ne conclut qu'a son
 * `pingTimeout`, ~25 s plus tard. Cette sonde comble exactement ce trou.
 */
const PROBE_IDLE_MS = 5 * 1000;

/** Cadence courante, pour ne pas reprogrammer un interval identique. */
let probeMs = 0;

function startProbeLoop(ms: number) {
  if (probeTimer && probeMs === ms) return;
  if (probeTimer) clearInterval(probeTimer);
  probeMs = ms;
  probeTimer = setInterval(probe, ms);
}

/**
 * Le socket est connecte : il prend le relais comme capteur principal.
 *
 * ⚠️ La boucle passe en cadence de filet au lieu de s'arreter : le socket ne
 * couvre que les coupures franches, pas le lien actif dont le trafic ne passe
 * plus (donnees epuisees). Voir `PROBE_IDLE_MS`.
 */
export function reportSocketConnected() {
  startProbeLoop(PROBE_IDLE_MS);
  if (reachable === true) return;

  const restored = reachable === false;
  reachable = true;
  settled = true;
  emitState();

  if (restored) {
    restoreListeners.forEach((listener) => {
      try {
        listener();
      } catch {
        // Un abonne qui echoue ne doit pas priver les suivants du signal.
      }
    });
  }
}

/**
 * Le socket est tombe : on ne sait plus si c'est le reseau ou le backend.
 *
 * ⚠️ On ne bascule PAS hors-ligne sur ce seul signal : un backend en panne
 * couperait le socket alors qu'Internet fonctionne, et afficherait un bandeau
 * mensonger. On sonde immediatement pour trancher, puis on relance la boucle
 * qui verifiera toutes les 2 s si le lien revient.
 */
export function reportSocketDisconnected() {
  probe();
  startProbeLoop(PROBE_FAST_MS);
}

/**
 * Bascule l'etat hors-ligne depuis un ECHEC REEL de requete applicative.
 *
 * ⚠️ C'est la detection la plus rapide dont on dispose, et elle vaut pour le
 * WiFi comme pour les donnees mobiles : quand la pile reseau rend la main sans
 * reponse (connexion refusee, reset de l'operateur sur data epuisee, DNS qui ne
 * resout pas), le lien est mort A CET INSTANT. Attendre que la sonde
 * periodique de NetInfo le confirme faisait perdre plusieurs secondes pendant
 * lesquelles l'app continuait a lancer des requetes vouees a l'echec.
 *
 * NetInfo reste la source qui annonce le RETOUR du reseau ; cette fonction ne
 * fait que constater la coupure plus tot.
 */
export function reportNetworkFailure() {
  if (reachable === false) return;
  console.log("[net] coupure detectee par echec de requete");
  reachable = false;
  settled = true;
  emitState();
  // On redemande un verdict : si c'etait un faux positif (serveur momentanement
  // injoignable alors que le lien est bon), la sonde remet `reachable` a true et
  // declenche `onNetworkRestored`.
  void NetInfo.refresh().catch(() => {});
}

/** `true` si une requete reseau a une chance d'aboutir. */
export function isOnline(): boolean {
  return reachable !== false;
}

/** Etat brut, pour l'affichage d'un bandeau hors-ligne. */
export function getReachability(): boolean | null {
  return reachable;
}
