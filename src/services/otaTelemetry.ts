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
  Sentry.captureMessage(
    `OTA boot ${Updates.isEmbeddedLaunch ? "embedded" : "updated"}`,
    {
      level: "info",
      tags: { "ota.event": "boot" },
      extra: {
        updateId: Updates.updateId ?? "embedded",
        channel: Updates.channel ?? "none",
        runtimeVersion: Updates.runtimeVersion ?? "unknown",
        createdAt: Updates.createdAt?.toISOString() ?? "unknown",
      },
    },
  );
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
    Sentry.captureMessage(`OTA telechargement en cours (${elapsed}s)`, {
      level: "info",
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
  Sentry.captureMessage(`OTA ${outcome}`, {
    level: "info",
    tags: { "ota.outcome": outcome },
    extra: {
      durationSeconds: seconds,
      updateId: Updates.updateId ?? "embedded",
      channel: Updates.channel ?? "none",
      runtimeVersion: Updates.runtimeVersion ?? "unknown",
    },
  });
}
