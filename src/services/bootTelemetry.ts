import * as Sentry from "@sentry/react-native";

import { sinceBoot } from "@/src/utils/bootClock";

/**
 * Telemetrie du DEMARRAGE : combien de temps met l'app a etre utilisable, et
 * quelle etape la retarde.
 *
 * ⚠️ UN SEUL evenement par lancement, emis quand toutes les etapes suivies sont
 * arrivees. Un evenement par etape multiplierait le volume par quatre pour la
 * meme information, et le quota Sentry se vide vite a l'echelle du parc.
 *
 * Les durees observees en dev (backend Fly.io, reseau correct) :
 * `/settings/app-version` 2,5 s · `/fastFood/all` 0,8 s · socket 0,5 s, pour un
 * boot complet autour de 8 s. C'est cette distribution, sur de vrais appareils
 * et de vrais reseaux, qu'il s'agit de mesurer.
 */

/** Etapes suivies. Le rapport part quand toutes ont ete renseignees. */
type Step = "appVersion" | "catalogue" | "socket";

const STEPS: Step[] = ["appVersion", "catalogue", "socket"];

/** Duree de chaque etape (secondes) et instant d'arrivee depuis le boot. */
const timings: Partial<Record<Step, { duration: number; at: number }>> = {};

/** Un seul rapport par lancement, meme si une etape se rejoue. */
let reported = false;

/**
 * Enregistre la fin d'une etape de demarrage.
 *
 * @param step   l'etape terminee
 * @param durationMs sa duree propre, en millisecondes
 */
export function trackBootStep(step: Step, durationMs: number) {
  if (reported || timings[step]) return;

  timings[step] = {
    duration: Number((durationMs / 1000).toFixed(2)),
    at: Number(sinceBoot()),
  };

  if (STEPS.every((s) => timings[s])) report();
}

function report() {
  reported = true;

  // L'etape la plus lente : c'est elle qu'il faudra traiter en priorite si le
  // demarrage se degrade sur le parc.
  const slowest = STEPS.reduce((worst, s) =>
    (timings[s]?.duration ?? 0) > (timings[worst]?.duration ?? 0) ? s : worst,
  );

  // Instant ou la DERNIERE etape est arrivee : la vraie duree ressentie.
  const total = Math.max(...STEPS.map((s) => timings[s]?.at ?? 0));

  Sentry.withScope((scope) => {
    scope.setLevel("info");
    // Fingerprint fixe : tous les lancements se groupent en UNE issue, dont on
    // lit la distribution. Sans lui, chaque boot creerait la sienne.
    scope.setFingerprint(["boot", "timings"]);
    // ⚠️ OBLIGATOIRE avec le fingerprint : prive du groupement par stack trace,
    // Sentry n'a plus de fonction a nommer et titre l'issue « anonymous ».
    scope.setTransactionName("Boot timings");

    scope.setTag("boot.slowest", slowest);
    // Tranches plutot que valeurs brutes : un tag a cardinalite libre est
    // inexploitable en filtre, et Sentry les plafonne.
    scope.setTag("boot.bucket", bucket(total));

    scope.setExtra("totalSeconds", total);
    STEPS.forEach((s) => {
      scope.setExtra(`${s}Seconds`, timings[s]?.duration);
      scope.setExtra(`${s}AtSeconds`, timings[s]?.at);
    });

    // ⚠️ Tant qu'une stack trace est presente, Sentry titre l'issue d'apres elle
    // et relegue le message au champ Culprit. On la retire pour CET evenement ;
    // `attachStacktrace` reste actif pour les vraies erreurs.
    scope.addEventProcessor((event) => {
      delete event.exception;
      delete event.threads;
      return event;
    });

    Sentry.captureMessage("Boot timings");
  });
}

/** Tranches de duree totale, pour filtrer sans exploser la cardinalite. */
function bucket(total: number): string {
  if (total < 3) return "<3s";
  if (total < 6) return "3-6s";
  if (total < 10) return "6-10s";
  if (total < 20) return "10-20s";
  return ">20s";
}
