import { Sentry } from "@/src/services/sentry";

/**
 * Rapports de fluidite de la liste NATIVE du home (`onDiagnostics`, iOS).
 *
 * Pourquoi Sentry : en build TestFlight il n'y a ni Metro ni terminal. Chaque
 * rapport est journalise en local (`[NATIVE]`) ET laisse une trace Sentry :
 * - fil d'Ariane pour tous (joint au prochain evenement) ;
 * - message « saccade » des qu'un geste perd des images ou accroche ;
 * - bilan tous les `SUMMARY_EVERY` gestes, fluides compris, pour pouvoir
 *   affirmer que ca ne saccade PAS.
 * Debit borne (un message / `MIN_GAP_MS`, `MAX_MESSAGES` par lancement) : le
 * quota Sentry ne doit pas partir dans une sonde de test.
 */

const MIN_GAP_MS = 10_000;
const MAX_MESSAGES = 40;
const SUMMARY_EVERY = 10;

let sent = 0;
let lastSentAt = 0;
let announced = false;
const summary = { gestures: 0, frames: 0, dropped: 0, hitches: 0, worstMs: 0 };

const send = (message: string, level: "info" | "warning", extra: Record<string, unknown>) => {
  const now = Date.now();
  if (sent >= MAX_MESSAGES || now - lastSentAt < MIN_GAP_MS) return;
  sent += 1;
  lastSentAt = now;
  Sentry.captureMessage(message, {
    level,
    tags: { home_list: "native" },
    extra,
  });
};

/** Une fois par lancement : preuve que la build embarque bien la liste native. */
export const announceNativeList = () => {
  if (announced) return;
  announced = true;
  console.log("[NATIVE] liste native du home active");
  Sentry.captureMessage("home-list: liste native active", {
    level: "info",
    tags: { home_list: "native" },
  });
};

export const reportNativeDiagnostics = (r: Record<string, any>) => {
  console.log(`[NATIVE] ${JSON.stringify(r)}`);
  Sentry.addBreadcrumb({ category: "home-list", level: "info", data: r });

  if (r.kind === "scroll") {
    summary.gestures += 1;
    summary.frames += r.frames ?? 0;
    summary.dropped += r.dropped ?? 0;
    summary.hitches += r.hitches ?? 0;
    summary.worstMs = Math.max(summary.worstMs, r.worstMs ?? 0);
    if ((r.hitches ?? 0) > 0 || (r.dropped ?? 0) >= 3) {
      send("home-list: saccade pendant le scroll", "warning", r);
    }
    if (summary.gestures % SUMMARY_EVERY === 0) {
      send(`home-list: bilan ${SUMMARY_EVERY} gestes`, "info", { ...summary });
      Object.assign(summary, { gestures: 0, frames: 0, dropped: 0, hitches: 0, worstMs: 0 });
    }
  } else if (r.kind === "apply" && (r.applyMs ?? 0) + (r.patchMs ?? 0) > 8) {
    send("home-list: arrivee de page lente", "warning", r);
  }
};
