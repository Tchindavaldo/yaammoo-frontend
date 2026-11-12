import * as Sentry from "@sentry/react-native";

import { sinceBoot } from "@/src/utils/bootClock";

/**
 * Telemetrie RESEAU temporaire (diagnostic du home bloque en squelette sur
 * connexion lente) : chargement du catalogue et bascules en ligne / hors ligne.
 *
 * Filtrer dans Sentry par le tag `diag:net`. A retirer une fois la cause trouvee.
 */

/** Etat reseau courant, joint a chaque evenement de chargement. */
let lastOnline: boolean | null = null;
let lastAborted = 0;

function send(message: string, data: Record<string, unknown>) {
  Sentry.withScope((scope) => {
    scope.setLevel("info");
    scope.setTag("diag", "net");
    scope.setContext("net", { ...data, at: Number(sinceBoot()) });
    Sentry.captureMessage(message);
  });
}

/** Fin d'un chargement `/fastFood/all` (premiere page ou suivante). */
export function trackHomeFetch(p: {
  firstPage: boolean;
  ms: number;
  ok: boolean;
  count?: number;
  error?: { code?: string; message?: string; status?: number };
}) {
  send(p.ok ? "home.fetch ok" : "home.fetch echec", {
    ...p,
    seconds: Number((p.ms / 1000).toFixed(2)),
    online: lastOnline,
    abortedBefore: lastAborted,
  });
}

/** Bascule de l'etat reseau (source : sonde, NetInfo, socket, echec requete). */
export function trackNetState(online: boolean, source: string, aborted = 0) {
  lastOnline = online;
  if (aborted) lastAborted += aborted;
  send(online ? "net en ligne" : "net hors ligne", { online, source, aborted });
}
