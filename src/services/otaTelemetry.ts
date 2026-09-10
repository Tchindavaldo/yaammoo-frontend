import * as Updates from "expo-updates";

import { Sentry } from "@/src/services/sentry";

/**
 * Telemetrie des mises a jour OTA, envoyee a Sentry.
 *
 * Repond a deux questions qu'aucune commande EAS ne sait traiter :
 *   - quel appareil tourne sur quelle update (`eas update:list` ne montre que
 *     ce qui est publie, jamais qui l'a recu) ;
 *   - un telechargement a-t-il abouti, et en combien de temps.
 *
 * ⚠️ `expo-updates` n'expose AUCUNE progression : `fetchUpdateAsync` est
 * atomique et ne rend la main qu'une fois tout recupere. Il n'existe donc ni
 * pourcentage ni "Mo restants" a afficher — on mesure la duree, seul indicateur
 * disponible cote client.
 */

/** Update actuellement executee, posee comme tags Sentry sur TOUS les evenements. */
export function tagCurrentUpdate() {
  Sentry.setTag("ota.updateId", Updates.updateId ?? "embedded");
  Sentry.setTag("ota.channel", Updates.channel ?? "none");
  Sentry.setTag("ota.runtimeVersion", Updates.runtimeVersion ?? "unknown");
  // `isEmbeddedLaunch` vrai = bundle du store, aucune OTA appliquee.
  Sentry.setTag("ota.embedded", String(Updates.isEmbeddedLaunch));

  // Un evenement par lancement : c'est LUI qui repond a « cet appareil a-t-il
  // recu ma derniere update ? ». Sans lui, un appareil reste invisible tant
  // qu'aucune mise a jour n'est disponible — exactement le cas qu'on veut
  // observer. Groupe par updateId, donc une issue par version livree.
  const kind = Updates.isEmbeddedLaunch ? "embedded" : "updated";
  captureOtaEvent(`OTA boot ${kind}`, ["ota", "boot", kind], {
    tags: { "ota.event": "boot" },
    extra: {
      updateId: Updates.updateId ?? "embedded",
      channel: Updates.channel ?? "none",
      runtimeVersion: Updates.runtimeVersion ?? "unknown",
      createdAt: Updates.createdAt?.toISOString() ?? "unknown",
    },
  });
}

/**
 * Envoie un evenement OTA en imposant son titre dans la liste des issues.
 *
 * ⚠️ Sans `fingerprint`, Sentry regroupe par stack trace et titre l'issue avec
 * le nom de la fonction emettrice (`tagCurrentUpdate`, `trackUpdateFetch`) :
 * illisible dans le feed. Le fingerprint force le regroupement sur nos propres
 * cles, et le message devient le titre.
 */
function captureOtaEvent(
  message: string,
  fingerprint: string[],
  options: { tags: Record<string, string>; extra: Record<string, unknown> },
) {
  Sentry.withScope((scope) => {
    scope.setLevel("info");
    scope.setFingerprint(fingerprint);
    Object.entries(options.tags).forEach(([k, v]) => scope.setTag(k, v));
    Object.entries(options.extra).forEach(([k, v]) => scope.setExtra(k, v));
    Sentry.captureMessage(message);
  });
}

/** Periode du heartbeat pendant le telechargement. */
const HEARTBEAT_MS = 5 * 1000;

/**
 * Signale, pendant toute la duree du fetch, qu'un telechargement est en cours.
 *
 * ⚠️ C'est le SEUL suivi possible : `fetchUpdateAsync` n'expose ni octets
 * transferes ni callback, donc « X Mo sur Y » n'existe pas. On remonte le temps
 * ecoule — ce qui suffit a repondre a la vraie question : le telechargement
 * avance-t-il, et jusqu'ou est-il alle avant que l'utilisateur quitte l'app
 * (auquel cas le dernier heartbeat reste le point le plus loin atteint).
 *
 * Retourne la fonction d'arret, a appeler dans un `finally`.
 */
export function startFetchHeartbeat(): () => void {
  const startedAt = Date.now();

  const timer = setInterval(() => {
    const elapsed = Math.round((Date.now() - startedAt) / 1000);
    // Fingerprint SANS le temps ecoule : sinon chaque battement creerait une
    // issue distincte. Tous les battements se regroupent, le detail de chaque
    // evenement porte la seconde exacte.
    captureOtaEvent("OTA telechargement en cours", ["ota", "downloading"], {
      tags: { "ota.event": "downloading" },
      extra: {
        elapsedSeconds: elapsed,
        channel: Updates.channel ?? "none",
        runtimeVersion: Updates.runtimeVersion ?? "unknown",
      },
    });
  }, HEARTBEAT_MS);

  return () => clearInterval(timer);
}

type FetchOutcome = "applied" | "deferred" | "failed";

/**
 * Trace un cycle de mise a jour. `durationMs` couvre check + fetch.
 * `outcome` : `applied` (rechargee sous le splash), `deferred` (telechargee,
 * appliquee au prochain lancement), `failed` (reseau ou canal absent).
 */
export function trackUpdateFetch(
  outcome: FetchOutcome,
  durationMs: number,
  error?: unknown,
) {
  const seconds = Math.round(durationMs) / 1000;

  Sentry.addBreadcrumb({
    category: "ota",
    level: outcome === "failed" ? "warning" : "info",
    message: `OTA ${outcome} en ${Math.round(durationMs)} ms`,
    data: { outcome, durationMs: Math.round(durationMs) },
  });

  if (outcome === "failed" && error) {
    Sentry.captureException(error, { tags: { "ota.outcome": outcome } });
    return;
  }

  // Evenement explicite : les tags et breadcrumbs seuls ne creent AUCUNE entree
  // dans Sentry (ils se contentent d'enrichir un evenement existant), et les
  // produits Logs / Tracing ne sont pas actives sur le projet. Un message
  // capture apparait dans Issues, seule vue disponible — c'est ce qui rend
  // l'adoption d'une update reellement observable.
  captureOtaEvent(`OTA ${outcome}`, ["ota", "fetch", outcome], {
    tags: { "ota.outcome": outcome },
    extra: {
      durationSeconds: seconds,
      updateId: Updates.updateId ?? "embedded",
      channel: Updates.channel ?? "none",
      runtimeVersion: Updates.runtimeVersion ?? "unknown",
    },
  });
}
