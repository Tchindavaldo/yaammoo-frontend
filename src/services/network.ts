import NetInfo from "@react-native-community/netinfo";
import { Platform } from "react-native";

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

/**
 * Dernier type d'interface vu (`wifi`, `cellular`, `none`…).
 *
 * ⚠️ Sert a reperer une BASCULE d'interface : le verdict rendu sur le WiFi ne
 * vaut rien pour les donnees mobiles qui prennent le relais, et inversement.
 */
let lastType: string | null = null;


/** Abonnes prevenus au RETOUR du reseau (pas a chaque changement d'etat). */
const restoreListeners = new Set<() => void>();

/**
 * Requetes actuellement en vol, avec leur moyen d'annulation.
 *
 * ⚠️ Sans cela, une requete partie AVANT que la coupure soit connue restait
 * pendante pour toujours : aucun timeout axios (volontaire, cf. `setupHttp`) et
 * plus aucun paquet ne revient. Le premier fetch du catalogue etant celui qui
 * leve le splash, l'app restait figee dessus indefiniment au demarrage sans
 * connexion. Des que la coupure est constatee, on les avorte pour que leur
 * `catch`/`finally` s'execute enfin.
 */
const inFlight = new Set<AbortController>();

/** Enregistre une requete en vol. Retourne son signal d'annulation. */
export function trackInFlight(): {
  signal: AbortSignal;
  done: () => void;
} {
  const controller = new AbortController();
  inFlight.add(controller);
  return {
    signal: controller.signal,
    done: () => inFlight.delete(controller),
  };
}

/** Avorte tout ce qui est en vol : plus rien ne peut aboutir. */
function abortInFlight() {
  if (inFlight.size === 0) return;
  console.log(`[net] abandon de ${inFlight.size} requete(s) en vol`);
  inFlight.forEach((controller) => {
    try {
      controller.abort();
    } catch {
      // Un abort qui echoue ne doit pas empecher les suivants.
    }
  });
  inFlight.clear();
}

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
  // Hors ligne : rien de ce qui est parti ne peut aboutir. On l'avorte pour que
  // les loaders s'eteignent au lieu de tourner sans fin.
  if (!online) abortInFlight();
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
 * Cible des sondes : l'endpoint de detection de portail captif de Cloudflare.
 * Reponse 204, sans corps, servie par un CDN mondial.
 *
 * Mesure comparative depuis le reseau de dev (3 tirs chacun) : Cloudflare
 * 0,43-0,49 s · gstatic 0,53-0,55 s · captive.apple 1,0-1,1 s ·
 * apple.com/library/test 1,2-3,5 s. Cloudflare est le plus rapide ET le plus
 * regulier — la regularite compte autant que la vitesse, puisqu'un seuil fixe
 * tranche sur ce delai.
 *
 * ⚠️ On ne sonde PAS le backend yaammoo. Il est heberge sur Fly.io, qui endort
 * les machines : un demarrage a froid prend plusieurs secondes et la sonde
 * concluait « pas de reseau » alors que la connexion etait parfaite — elle
 * avortait alors toutes les requetes du boot. Et un backend en panne aurait
 * affiche « pas de connexion » a des utilisateurs parfaitement connectes.
 * La question posee ici est « Internet repond-il ? », pas « mon serveur
 * repond-il ? ».
 *
 * ⚠️ Il faut aussi une adresse EXPLICITE pour NetInfo : par defaut il sonde
 * l'origine de la page — en dev web, Metro lui-meme (`localhost:8081`). Chaque
 * sonde relancait alors un bundle, qui faisait echouer la suivante, d'ou un
 * rebundle infini et des reconnexions socket en rafale.
 */
const PROBE_URL = "https://cp.cloudflare.com/generate_204";

/**
 * ⚠️ WEB : `cp.cloudflare.com` n'envoie aucun en-tete CORS. Le navigateur
 * rejette donc la sonde (« CORS error ») alors que le reseau marche, et l'app
 * affichait « Pas de connexion Internet » a tort. Sur le web on sonde en
 * `no-cors` : reponse opaque (statut illisible), mais la promesse n'est
 * resolue QUE si le serveur a repondu — un vrai echec reseau la rejette.
 * La sonde interne de NetInfo (qui lit le statut) y est coupee.
 */
const IS_WEB = Platform.OS === "web";

/** Demarre l'ecoute. Appele une seule fois au boot, depuis `setupHttp`. */
export function startNetworkWatch() {
  NetInfo.configure({
    reachabilityUrl: PROBE_URL,
    // La sonde ne lit pas le corps : le code HTTP suffit a trancher.
    // `generate_204` repond 204, pas 200.
    reachabilityTest: async (response) => response.status === 204,
    // Web : statut illisible (CORS), cette sonde conclurait toujours « hors ligne ».
    reachabilityShouldRun: () => !IS_WEB,
    // Intervalles volontairement larges : la sonde est un filet de securite,
    // les vrais changements d'interface arrivent par evenement systeme.
    reachabilityLongTimeout: 60 * 1000,
    reachabilityShortTimeout: 5 * 1000,
    reachabilityRequestTimeout: 15 * 1000,
  });

  NetInfo.addEventListener((state) => {
    // ⚠️ Un CHANGEMENT d'interface invalide le verdict precedent : passer du
    // WiFi (qui marchait) aux donnees mobiles (sans forfait) heritait de l'etat
    // « en ligne » et ne detectait jamais la coupure. L'ancienne interface ne
    // dit rien de la nouvelle, il faut re-sonder.
    const switched = state.type !== lastType;
    lastType = state.type;

    // `isConnected === false` est un fait materiel (aucune interface active) :
    // il tranche sans attendre la sonde.
    let next: boolean | null;
    if (state.isConnected === false) {
      next = false;
    } else if (state.isInternetReachable === null) {
      // Sonde non aboutie. Sur un changement d'interface on ne conserve PAS
      // l'ancien verdict : il portait sur un autre lien.
      next = switched ? null : settled ? reachable : null;
      if (switched) {
        settled = false;
        // Cadence serree jusqu'a ce que la nouvelle interface soit tranchee.
        startProbeLoop(PROBE_FAST_MS);
        probe();
      }
    } else {
      next = Boolean(state.isConnected && state.isInternetReachable);
    }

    if (next !== null) settled = true;

    // On ne notifie QUE la transition hors-ligne → en ligne. NetInfo emet a
    // chaque changement d'interface (WiFi ↔ 4G, changement de reseau) ; relancer
    // les requetes a chacun d'eux les multiplierait sans raison.
    const restored = reachable === false && next === true;
    const changed = reachable !== next;

    // Seuls les CHANGEMENTS sont traces : l'etat est reevalue en continu, le
    // logger a chaque fois noyait les lignes utiles.
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
/** Une seule sonde a la fois : a 2 s d'intervalle elles se chevaucheraient. */
let probing = false;

/** Echecs de sonde consecutifs, remis a zero des qu'une reussit. */
let failures = 0;

/** Nombre d'echecs consecutifs exiges avant de declarer la coupure. */
const FAILURES_BEFORE_OFFLINE = 2;

function probe() {
  if (probing) return;
  probing = true;

  // ⚠️ On ne passe PAS par `NetInfo.refresh()` : sa sonde rendait
  // `isInternetReachable: null` indefiniment (constate en boucle dans les logs),
  // donc aucun verdict n'etait jamais rendu et `isOnline()` laissait partir des
  // requetes qui restaient pendantes — splash fige alors que le reseau marchait.
  // Une requete faite ici est tranchee par nous, dans un delai que l'on maitrise.
  const controller = new AbortController();
  const killer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);

  void fetch(PROBE_URL, {
    method: "GET",
    signal: controller.signal,
    // Le cache masquerait une coupure en rejouant une reponse deja recue.
    cache: "no-store",
    // Web : reponse opaque, resolue seulement si le serveur a repondu.
    ...(IS_WEB && { mode: "no-cors" as const }),
  })
    .then((response) => settle(IS_WEB ? true : response.ok))
    .catch(() => settle(false))
    .finally(() => {
      clearTimeout(killer);
      probing = false;
    });
}

/**
 * Applique un verdict FERME rendu par la sonde.
 *
 * Separe de `probe()` pour que l'echec (`catch`) et le succes suivent exactement
 * le meme chemin d'etat.
 */
function settle(next: boolean) {
  // ⚠️ Une bascule hors-ligne exige DEUX echecs consecutifs. Sur un seul, une
  // sonde malchanceuse (DNS lent, reveil de radio, requete perdue) suffisait a
  // declarer la coupure et a avorter toutes les requetes du boot, alors que la
  // connexion etait parfaite. Le retour en ligne, lui, est applique tout de
  // suite : rien a perdre a croire une bonne nouvelle verifiee.
  if (!next && reachable !== false) {
    failures += 1;
    if (failures < FAILURES_BEFORE_OFFLINE) {
      settled = true;
      return;
    }
  } else {
    failures = 0;
  }


  // Verdict ferme. La cadence serree ne sert qu'a LEVER un doute : une fois
  // qu'on sait qu'on est en ligne, la sonde redevient un filet, que le socket
  // soit connecte ou non.
  //
  // ⚠️ Conditionner ce relachement au seul socket laissait la sonde a 2 s
  // indefiniment quand le backend etait injoignable (socket en `connect_error`
  // en boucle) alors que le reseau, lui, repondait parfaitement.
  settled = true;
  if (next) startProbeLoop(PROBE_IDLE_MS);

  if (next === reachable) return;

  const restored = reachable === false && next === true;
  reachable = next;
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

/** Handle de la boucle, pour ne jamais en demarrer deux. */
let probeTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Cadence serree, quand la sonde est le SEUL capteur : avant la premiere
 * connexion socket, et apres une coupure.
 */
const PROBE_FAST_MS = 2 * 1000;

/**
 * Delai au-dela duquel la sonde conclut « ca ne passe pas ».
 *
 * ⚠️ Ce n'est PAS un timeout applicatif : il ne coupe aucune requete de l'app
 * (aucune n'en porte, cf. `setupHttp`). Il ne borne que la sonde elle-meme, qui
 * doit bien trancher a un moment — sans quoi elle reste sans verdict, ce qui
 * etait exactement le bug precedent.
 *
 * 3 s = ~6x le temps de reponse mesure de la cible (~0,5 s). Large pour absorber
 * un reveil de radio ou un DNS lent, court pour que le verdict tombe vite.
 */
const PROBE_TIMEOUT_MS = 3 * 1000;

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
