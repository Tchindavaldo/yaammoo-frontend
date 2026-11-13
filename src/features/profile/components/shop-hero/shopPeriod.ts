// Periode affichee par le hero du home marchand (utilitaires purs, sans rendu).
// Semaines du lundi au dimanche ; dates en ISO local `YYYY-MM-DD`.
import { t } from "@/src/i18n";

export type PeriodKind = "lastWeek" | "month" | "s1" | "s2" | "pickMonth" | "range";
export type PresetKind = "lastWeek" | "month" | "s1" | "s2";

export interface ShopPeriod {
  kind: PeriodKind;
  from: string;
  to: string;
}

export const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
export const MONTHS_SHORT = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

const pad = (n: number) => String(n).padStart(2, "0");
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromISO = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** Lundi de la semaine de `d`. */
export const mondayOf = (d: Date) => {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() - ((r.getDay() + 6) % 7));
  return r;
};
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export const weekPeriod = (d: Date, kind: PeriodKind = "range"): ShopPeriod => {
  const m = mondayOf(d);
  return { kind, from: toISO(m), to: toISO(addDays(m, 6)) };
};
export const monthPeriod = (y: number, m: number, kind: PeriodKind = "pickMonth"): ShopPeriod => ({
  kind,
  from: toISO(new Date(y, m, 1)),
  to: toISO(new Date(y, m + 1, 0)),
});

export const presetPeriod = (kind: PresetKind, now = new Date()): ShopPeriod => {
  const y = now.getFullYear();
  switch (kind) {
    case "lastWeek":
      return weekPeriod(addDays(now, -7), "lastWeek");
    case "month":
      return monthPeriod(y, now.getMonth(), "month");
    case "s1":
      return { kind, from: `${y}-01-01`, to: `${y}-06-30` };
    case "s2":
      return { kind, from: `${y}-07-01`, to: `${y}-12-31` };
  }
};

export const defaultPeriod = () => presetPeriod("month");

/** Decoupage du graphique : jours (<= 7 j), semaines (<= 62 j), sinon mois. */
export type Bucket = "day" | "week" | "month";
export const bucketOf = (p: ShopPeriod): Bucket => {
  const days = Math.round((fromISO(p.to).getTime() - fromISO(p.from).getTime()) / 86400000) + 1;
  return days <= 7 ? "day" : days <= 62 ? "week" : "month";
};

const DAY_LETTERS = ["D", "L", "M", "M", "J", "V", "S"];
const MONTH_LETTERS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
/** Etiquette d'axe d'un bucket : lettre du jour, S1..S6, ou initiale du mois. */
export const axisLabel = (bucket: Bucket, startISO: string, index: number): string => {
  const d = fromISO(startISO);
  if (bucket === "day") return DAY_LETTERS[d.getDay()];
  if (bucket === "week") return `S${index + 1}`;
  return MONTH_LETTERS[d.getMonth()];
};

const dayLabel = (iso: string) => {
  const d = fromISO(iso);
  return `${d.getDate()} ${t(MONTHS_SHORT[d.getMonth()])}`;
};

const datesLabel = (p: ShopPeriod) => {
  const a = fromISO(p.from);
  const b = fromISO(p.to);
  if (p.from === p.to) return dayLabel(p.from);
  // Mois complet : nom du mois. Annee complete : l'annee.
  if (a.getDate() === 1 && b.getDate() === new Date(b.getFullYear(), b.getMonth() + 1, 0).getDate()) {
    if (a.getFullYear() === b.getFullYear() && a.getMonth() === 0 && b.getMonth() === 11) return String(a.getFullYear());
    if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()) return `${t(MONTHS[a.getMonth()])} ${a.getFullYear()}`;
  }
  return `${dayLabel(p.from)} – ${dayLabel(p.to)}`;
};

/** Libelle court de la periode ; `datesOnly` : les dates, jamais « Cette semaine ». */
export const periodLabel = (p: ShopPeriod, datesOnly = false): string => {
  if (datesOnly) return datesLabel(p);
  switch (p.kind) {
    case "lastWeek":
      return t("Semaine passée");
    case "month":
      return t("Ce mois");
    case "s1":
      return t("1er semestre");
    case "s2":
      return t("2e semestre");
    case "pickMonth": {
      const d = fromISO(p.from);
      return `${t(MONTHS[d.getMonth()])} ${d.getFullYear()}`;
    }
    default:
      return datesLabel(p);
  }
};

/** Libelle du chiffre central du hero (total de la periode). */
export const periodStatLabel = (p: ShopPeriod): string => {
  const b = bucketOf(p);
  if (p.kind === "s1" || p.kind === "s2") return t("SEMESTRE");
  return b === "day" ? t("SEMAINE") : p.kind === "month" || p.kind === "pickMonth" ? t("MOIS") : t("PÉRIODE");
};

/** Grille d'un mois : lignes de 7 jours (lundi en tete), `null` hors mois. */
export const monthGrid = (y: number, m: number): (Date | null)[][] => {
  const first = new Date(y, m, 1);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(y, m + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: lead }, () => null);
  for (let i = 1; i <= days; i++) cells.push(new Date(y, m, i));
  while (cells.length % 7) cells.push(null);
  const rows: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
};
