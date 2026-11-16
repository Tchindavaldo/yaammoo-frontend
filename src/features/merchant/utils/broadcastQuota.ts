import type {
  BroadcastItem,
  BroadcastPlan,
  BroadcastQuota,
} from "../types/broadcast.types";
import { t as tr } from "@/src/i18n";

const monthNames = (): string[] => [
  tr("Janvier"), tr("Février"), tr("Mars"), tr("Avril"), tr("Mai"), tr("Juin"),
  tr("Juillet"), tr("Août"), tr("Septembre"), tr("Octobre"), tr("Novembre"), tr("Décembre"),
];

/** Lundi 00:00 de la semaine de `now` (heure locale). */
export const startOfWeek = (now: Date): Date => {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
};

const startOfDay = (d: Date): Date =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Quota restant et répartition de la semaine, dérivés de l'historique. */
export const computeQuota = (
  plan: BroadcastPlan,
  items: BroadcastItem[],
  now: Date,
): BroadcastQuota => {
  const weekStart = startOfWeek(now).getTime();
  const todayIndex = (now.getDay() + 6) % 7;
  const perDay = [0, 0, 0, 0, 0, 0, 0];

  for (const it of items) {
    const t = new Date(it.sentAt).getTime();
    if (isNaN(t) || t < weekStart) continue;
    const idx = Math.floor((startOfDay(new Date(t)).getTime() - weekStart) / 86400000);
    if (idx >= 0 && idx < 7) perDay[idx] += 1;
  }

  const weekUsed = perDay.reduce((a, b) => a + b, 0);
  const dayUsed = perDay[todayIndex];
  const weekLeft = Math.max(0, plan.weekLimit - weekUsed);
  const dayLeft = Math.max(0, Math.min(plan.dayLimit - dayUsed, weekLeft));
  return { dayUsed, weekUsed, dayLeft, weekLeft, perDay, todayIndex };
};

/**
 * Envois encore possibles par audience : min(reste global, reste du plafond
 * propre à l'audience). Affichage seul, le backend fait foi (refus 429).
 */
export const audienceLeft = (
  plan: BroadcastPlan,
  items: BroadcastItem[],
  now: Date,
): Partial<Record<BroadcastItem["audience"], number>> => {
  const global = computeQuota(plan, items, now).dayLeft;
  const out: Partial<Record<BroadcastItem["audience"], number>> = {};
  for (const a of plan.audiences) {
    const lim = plan.audienceLimits?.[a];
    if (!lim) {
      out[a] = global;
      continue;
    }
    const q = computeQuota(
      { ...plan, dayLimit: lim.dayLimit, weekLimit: lim.weekLimit },
      items.filter((it) => it.audience === a),
      now,
    );
    out[a] = Math.min(global, q.dayLeft);
  }
  return out;
};

const dayNames = (): string[] => [
  tr("Dimanche"), tr("Lundi"), tr("Mardi"), tr("Mercredi"), tr("Jeudi"), tr("Vendredi"), tr("Samedi"),
];

/**
 * Prochaine remise à zéro du quota : minuit ce soir, ou lundi 00:00 si le
 * quota de la semaine est épuisé. Heure « 00h00 » + jour « Samedi 15 Novembre ».
 */
export const nextReset = (
  quota: BroadcastQuota,
  now: Date,
): { hour: string; day: string } => {
  const d =
    quota.weekLeft <= 0
      ? new Date(startOfWeek(now).getTime() + 7 * 86400000)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const hour = `${String(d.getHours()).padStart(2, "0")}h${String(d.getMinutes()).padStart(2, "0")}`;
  return { hour, day: `${dayNames()[d.getDay()]} ${d.getDate()} ${monthNames()[d.getMonth()]}` };
};

export const monthLabel = (now: Date): string => monthNames()[now.getMonth()];

/** Étiquette courte d'un envoi : « AUJOURD'HUI · 11:40 », « HIER · 18:04 », « IL Y A 3 J ». */
export const sentLabel = (sentAt: string, now: Date): string => {
  const d = new Date(sentAt);
  if (isNaN(d.getTime())) return "";
  const days = Math.round(
    (startOfDay(now).getTime() - startOfDay(d).getTime()) / 86400000,
  );
  const hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (days <= 0) return tr("AUJOURD’HUI · {{a}}", { a: hm });
  if (days === 1) return tr("HIER · {{a}}", { a: hm });
  return tr("IL Y A {{a}} J", { a: days });
};
