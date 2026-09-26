import { AppState } from "react-native";
import { Sentry } from "@/src/services/sentry";

/**
 * Rapports de fluidite de la liste NATIVE du home (`onDiagnostics`, iOS).
 *
 * Pourquoi Sentry : en build TestFlight il n'y a ni Metro ni terminal. Chaque
 * rapport est journalise en local (`[NATIVE]`) ET laisse une trace Sentry :
 * - fil d'Ariane pour tous (joint au prochain evenement) ;
 * - message « saccade » des qu'un geste perd des images ou accroche ;
 * - message « geste N apres lancement » pour les `DETAILED_GESTURES` premiers
 *   scrolls de CHAQUE lancement : la double micro-pause des premiers scrolls
 *   s'y lit (un geste isole ne declenche pas de bilan). Ils portent le profil
 *   de mouvement image par image (`motion`, `fingerUpFrame`), les arrets /
 *   sauts detectes (`stalls`, `jumps`, `motionAt`) et la chronologie de ce qui
 *   a change a l'ecran (`events` : `cfgN` (+`n` cellule neuve), `inNdD`
 *   (+`n` premier affichage) / `outN` entree / sortie d'ecran, `revealN`,
 *   `applyN`, `banner`, `leftTop`) ;
 * - bilan tous les `SUMMARY_EVERY` gestes, fluides compris, pour pouvoir
 *   affirmer que ca ne saccade PAS.
 * Deux sondes par geste : `dropped`/`hitches`/`worstMs` (fil principal de
 * l'app) et `screen*` (ce qui arrive vraiment a l'ecran, serveur de rendu
 * compris). Tags `blur` = rendu des barres floutees (`live` | `baked`),
 * `bannerAutoplay` = defilement auto de la banniere actif ou coupe,
 * `cellDiag` = famille d'elements retiree des boutiques ce lancement.
 * Debit borne (un message / `MIN_GAP_MS`, `MAX_MESSAGES` par lancement) : le
 * quota Sentry ne doit pas partir dans une sonde de test.
 *
 * Envois RETENUS pendant l'usage de la liste : les messages partent apres
 * `FLUSH_IDLE_MS` sans geste, ou quand l'app passe en arriere-plan (tag
 * `deferred`, `heldMs` = attente). Build 60 : 5 des 10 scrolls 2-3 perdaient
 * une image ecran 0,5 a 1,3 s apres un envoi de la sonde, le 1er scroll (sans
 * envoi avant lui) jamais. Si ces pertes disparaissent, c'etait la sonde.
 */

const MIN_GAP_MS = 10_000;
const MAX_MESSAGES = 40;
const SUMMARY_EVERY = 10;
/** Gestes envoyes a chaque lancement, fluides ou non (= natif `detailedGestures`). */
const DETAILED_GESTURES = 3;
/** Silence de la liste avant de vider la file des messages. */
const FLUSH_IDLE_MS = 10_000;

let sent = 0;
let lastSentAt = 0;
let announced = false;

type Held = {
  message: string;
  level: "info" | "warning";
  extra: Record<string, unknown>;
  tags: Record<string, string>;
  at: number;
};
const held: Held[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let appStateHooked = false;

const flush = () => {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = null;
  const now = Date.now();
  for (const h of held.splice(0)) {
    Sentry.captureMessage(h.message, {
      level: h.level,
      tags: { home_list: "native", deferred: "true", ...h.tags },
      extra: { ...h.extra, heldMs: now - h.at },
    });
  }
};

/** Repousse l'envoi : appele a chaque fin de geste, la file part au silence. */
const scheduleFlush = () => {
  if (!appStateHooked) {
    appStateHooked = true;
    AppState.addEventListener("change", (s) => {
      if (s !== "active") flush();
    });
  }
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(flush, FLUSH_IDLE_MS);
};
// `rows` : rangees chargees au dernier geste, pour savoir jusqu'ou le bilan va.
const EMPTY_SUMMARY = {
  gestures: 0,
  frames: 0,
  dropped: 0,
  hitches: 0,
  worstMs: 0,
  screenDropped: 0,
  screenHitches: 0,
  screenWorstMs: 0,
};
const summary = { ...EMPTY_SUMMARY, rows: 0 };
/** Numeros des gestes du bilan ayant perdu une image ecran (4e geste et suivants compris). */
let dropGestures: number[] = [];

/**
 * `always` : ignore l'ecart minimal (pas le plafond). Le bilan en a besoin,
 * sinon une page lente signalee juste avant l'avalait sans trace.
 */
const send = (
  message: string,
  level: "info" | "warning",
  extra: Record<string, unknown>,
  always = false,
  tags: Record<string, string> = {},
) => {
  const now = Date.now();
  if (sent >= MAX_MESSAGES || (!always && now - lastSentAt < MIN_GAP_MS)) return;
  sent += 1;
  lastSentAt = now;
  held.push({ message, level, extra, tags, at: now });
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
  scheduleFlush();

  if (r.kind === "scroll") {
    const tags = {
      blur: String(r.blur ?? "inconnu"),
      bannerAutoplay: String(r.bannerAutoplay ?? "inconnu"),
      cellDiag: String(r.cellDiag ?? "inconnu"),
    };
    summary.gestures += 1;
    summary.frames += r.frames ?? 0;
    summary.dropped += r.dropped ?? 0;
    summary.hitches += r.hitches ?? 0;
    summary.worstMs = Math.max(summary.worstMs, r.worstMs ?? 0);
    summary.screenDropped += r.screenDropped ?? 0;
    summary.screenHitches += r.screenHitches ?? 0;
    summary.screenWorstMs = Math.max(summary.screenWorstMs, r.screenWorstMs ?? 0);
    summary.rows = r.rows ?? summary.rows;
    if ((r.screenDropped ?? 0) > 0) dropGestures.push(r.gesture ?? 0);
    // Premiers scrolls du lancement : toujours envoyes, fluides ou non.
    if ((r.gesture ?? 0) >= 1 && r.gesture <= DETAILED_GESTURES) {
      send(`home-list: geste ${r.gesture} apres lancement`, "info", r, true, tags);
    } else if (
      (r.hitches ?? 0) > 0 ||
      (r.dropped ?? 0) >= 3 ||
      (r.screenHitches ?? 0) > 0 ||
      (r.screenDropped ?? 0) >= 3 ||
      (r.stalls ?? 0) > 0 ||
      (r.jumps ?? 0) > 0
    ) {
      send("home-list: saccade pendant le scroll", "warning", r, false, tags);
    }
    if (summary.gestures % SUMMARY_EVERY === 0) {
      send(`home-list: bilan ${SUMMARY_EVERY} gestes`, "info", { ...summary, dropGestures, ...tags }, true, tags);
      Object.assign(summary, EMPTY_SUMMARY);
      dropGestures = [];
    }
  } else if (r.kind === "apply" && (r.applyMs ?? 0) + (r.patchMs ?? 0) > 8) {
    send("home-list: arrivee de page lente", "warning", r);
  }
};
