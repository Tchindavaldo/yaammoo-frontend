import type {
  BroadcastItem,
  BroadcastPlan,
  BroadcastQuota,
} from "../types/broadcast.types";

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
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
    if (isNaN(t) || t < weekStart || t > now.getTime()) continue;
    const idx = Math.floor((startOfDay(new Date(t)).getTime() - weekStart) / 86400000);
    if (idx >= 0 && idx < 7) perDay[idx] += 1;
  }

  const weekUsed = perDay.reduce((a, b) => a + b, 0);
  const dayUsed = perDay[todayIndex];
  const weekLeft = Math.max(0, plan.weekLimit - weekUsed);
  const dayLeft = Math.max(0, Math.min(plan.dayLimit - dayUsed, weekLeft));
  return { dayUsed, weekUsed, dayLeft, weekLeft, perDay, todayIndex };
};

/** Temps restant avant minuit, pour la tuile « Remise à zéro ». */
export const untilMidnight = (now: Date): { h: number; m: string } => {
  const mins = 24 * 60 - (now.getHours() * 60 + now.getMinutes());
  return { h: Math.floor(mins / 60), m: String(mins % 60).padStart(2, "0") };
};

export const monthLabel = (now: Date): string => MONTHS[now.getMonth()];

/** Étiquette courte d'un envoi : « AUJOURD'HUI · 11:40 », « HIER · 18:04 », « IL Y A 3 J ». */
export const sentLabel = (sentAt: string, now: Date): string => {
  const d = new Date(sentAt);
  if (isNaN(d.getTime())) return "";
  const days = Math.round(
    (startOfDay(now).getTime() - startOfDay(d).getTime()) / 86400000,
  );
  const hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (days <= 0) return `AUJOURD’HUI · ${hm}`;
  if (days === 1) return `HIER · ${hm}`;
  return `IL Y A ${days} J`;
};
