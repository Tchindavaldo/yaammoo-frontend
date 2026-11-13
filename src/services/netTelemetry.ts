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
/** Ecran courant : `splash` jusqu'a son masquage, puis `app`. */
let phase: "splash" | "app" = "splash";

function send(message: string, data: Record<string, unknown>) {
  Sentry.withScope((scope) => {
    scope.setLevel("info");
    scope.setTag("diag", "net");
    scope.setTag("phase", phase);
    scope.setContext("net", { ...data, phase, online: data.online ?? lastOnline, at: Number(sinceBoot()) });
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

/** Splash masque : duree totale et etat reseau a cet instant. */
export function trackSplashHidden() {
  send("splash masque", { seconds: Number(sinceBoot()), online: lastOnline, abortedBefore: lastAborted });
  phase = "app";
}

/** La verification de version n'a pas repondu a temps : splash libere de force. */
export function trackSplashReleased(waitMs: number) {
  send("splash libere sans app-version", { waitSeconds: waitMs / 1000, online: lastOnline });
}

/** Etape du demarrage (auth Firebase, cache profil, montage du home). */
export function trackBoot(step: string, data: Record<string, unknown> = {}) {
  send(`boot ${step}`, { ...data, online: lastOnline });
}

/** Fin de `/settings/app-version` (requete qui bloque le splash). */
export function trackAppVersion(ms: number, ok: boolean, error?: { code?: string; message?: string }) {
  send(ok ? "app-version ok" : "app-version echec", { seconds: Number((ms / 1000).toFixed(2)), ok, error });
}
