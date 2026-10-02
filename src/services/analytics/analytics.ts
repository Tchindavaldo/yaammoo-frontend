import axios from "axios";
import * as Device from "expo-device";
import { AppState, AppStateStatus, Platform } from "react-native";
import { Config } from "@/src/api/config";
import { APP_PLATFORM, APP_VERSION } from "@/src/api/version";

/**
 * Statistiques d'usage (consultees par l'admin, cote backend).
 *
 * `track()` met un evenement en file ; la file part par lots vers
 * `POST /analytics/events` (toutes les FLUSH_INTERVAL_MS, des MAX_QUEUE
 * evenements, et au passage en arriere-plan). Une session = une ouverture de
 * l'app au premier plan ; elle se ferme en arriere-plan.
 *
 * Invite (pas d'utilisateur Firebase) : rien n'est envoye, la file attend.
 * Un echec reseau garde les evenements pour le lot suivant (borne MAX_KEEP).
 * Voir architecture/analytics.md.
 */

export type AnalyticsEventType =
  | "screen_view"
  | "home_page_loaded"
  | "shop_impression"
  | "shop_open"
  | "menu_open"
  | "add_to_cart"
  | "checkout_start"
  | "payment_result"
  | "search"
  | "banner_view"
  | "banner_click";

type AnalyticsEvent = {
  type: AnalyticsEventType;
  occurredAt: string;
  fastFoodId?: string;
  menuId?: string;
  bannerId?: string;
  data?: Record<string, string | number>;
};

type Session = {
  id: string;
  startedAt: string;
  lastActivityAt?: string;
  endedAt?: string;
};

const FLUSH_INTERVAL_MS = 20_000;
const HEARTBEAT_MS = 120_000;
const MAX_QUEUE = 50;
// Limite du backend par lot.
const MAX_BATCH = 200;
// Au-dela, les plus anciens sont abandonnes (hors ligne prolonge).
const MAX_KEEP = 1000;

const newId = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
const now = () => new Date().toISOString();

let queue: AnalyticsEvent[] = [];
let session: Session = { id: newId(), startedAt: now() };
let flushing = false;
let started = false;
let lastFlushAt = 0;

const device = {
  appVersion: APP_VERSION || undefined,
  platform: ["ios", "android", "web"].includes(APP_PLATFORM)
    ? APP_PLATFORM
    : undefined,
  osVersion: Device.osVersion ? `${Platform.OS} ${Device.osVersion}` : undefined,
  deviceModel: Device.modelName ?? undefined,
};

const isSignedIn = (): boolean => {
  // Import paresseux : `firebase` importe `config` (meme raison que setupHttp).
  const { auth } = require("@/src/services/firebase");
  return !!auth.currentUser;
};

/** Met un evenement en file. Sans effet sur l'UI, jamais d'exception. */
export function track(
  type: AnalyticsEventType,
  fields: Omit<AnalyticsEvent, "type" | "occurredAt"> = {},
): void {
  try {
    queue.push({ type, occurredAt: now(), ...fields });
    if (queue.length > MAX_KEEP) queue = queue.slice(-MAX_KEEP);
    if (queue.length >= MAX_QUEUE) void flush();
  } catch {
    // Les statistiques ne doivent jamais casser un parcours.
  }
}

/** Envoie la file (et l'etat de la session). */
export async function flush(): Promise<void> {
  // Non connecte (invite, ou session Firebase pas encore restauree au
  // lancement) : la file attend, bornee par MAX_KEEP.
  if (flushing || !isSignedIn()) return;
  flushing = true;
  lastFlushAt = Date.now();
  const batch = queue.slice(0, MAX_BATCH);
  const sent: Session = { ...session, lastActivityAt: now() };
  try {
    await axios.post(`${Config.apiUrl}/analytics/events`, {
      session: { ...sent, ...device },
      events: batch,
    });
    queue = queue.slice(batch.length);
  } catch (error: any) {
    // 400 : lot refuse, le renvoyer echouerait encore.
    if (error?.response?.status === 400) queue = queue.slice(batch.length);
  } finally {
    flushing = false;
  }
  if (queue.length >= MAX_QUEUE) void flush();
}

const onAppState = (state: AppStateStatus) => {
  if (state === "active") {
    if (session.endedAt) session = { id: newId(), startedAt: now() };
  } else if (state === "background" && !session.endedAt) {
    session = { ...session, endedAt: now() };
    void flush();
  }
};

/** A appeler une fois au demarrage (layout racine). */
export function startAnalytics(): () => void {
  if (started) return () => {};
  started = true;
  // Lot des qu'il y a des evenements ; sinon simple battement (duree de la
  // session) toutes les HEARTBEAT_MS tant que l'app est au premier plan.
  const timer = setInterval(() => {
    const beat = !session.endedAt && Date.now() - lastFlushAt >= HEARTBEAT_MS;
    if (queue.length || beat) void flush();
  }, FLUSH_INTERVAL_MS);
  const sub = AppState.addEventListener("change", onAppState);
  return () => {
    started = false;
    clearInterval(timer);
    sub.remove();
  };
}
