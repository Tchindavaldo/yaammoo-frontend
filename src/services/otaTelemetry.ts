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
  Sentry.addBreadcrumb({
    category: "ota",
    level: outcome === "failed" ? "warning" : "info",
    message: `OTA ${outcome} en ${Math.round(durationMs)} ms`,
    data: { outcome, durationMs: Math.round(durationMs) },
  });

  if (outcome === "failed" && error) {
    Sentry.captureException(error, { tags: { "ota.outcome": outcome } });
  }
}
