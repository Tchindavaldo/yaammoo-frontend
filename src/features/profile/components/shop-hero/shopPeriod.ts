// Periode affichee par le hero du home marchand (utilitaires purs, sans rendu).
// Semaines du lundi au dimanche ; dates en ISO local `YYYY-MM-DD`.
import { t } from "@/src/i18n";

export type PeriodKind = "week" | "lastWeek" | "month" | "lastMonth" | "year" | "pickMonth" | "range";

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

export const presetPeriod = (kind: "week" | "lastWeek" | "month" | "lastMonth" | "year", now = new Date()): ShopPeriod => {
  switch (kind) {
    case "week":
      return weekPeriod(now, "week");
    case "lastWeek":
      return weekPeriod(addDays(now, -7), "lastWeek");
    case "month":
      return monthPeriod(now.getFullYear(), now.getMonth(), "month");
    case "lastMonth":
      return monthPeriod(now.getFullYear(), now.getMonth() - 1, "lastMonth");
    case "year":
      return { kind, from: `${now.getFullYear()}-01-01`, to: `${now.getFullYear()}-12-31` };
  }
};

export const defaultPeriod = () => presetPeriod("week");

const dayLabel = (iso: string) => {
  const d = fromISO(iso);
  return `${d.getDate()} ${t(MONTHS_SHORT[d.getMonth()])}`;
};

/** Libelle court du bouton de periode. */
export const periodLabel = (p: ShopPeriod): string => {
  switch (p.kind) {
    case "week":
      return t("Cette semaine");
    case "lastWeek":
      return t("Semaine passée");
    case "month":
      return t("Ce mois");
    case "lastMonth":
      return t("Mois passé");
    case "year":
      return t("Cette année");
    case "pickMonth": {
      const d = fromISO(p.from);
      return `${t(MONTHS[d.getMonth()])} ${d.getFullYear()}`;
    }
    default:
      return p.from === p.to ? dayLabel(p.from) : `${dayLabel(p.from)} – ${dayLabel(p.to)}`;
  }
};

/** Libelle du chiffre central du hero (total de la periode). */
export const periodStatLabel = (p: ShopPeriod): string =>
  p.kind === "week" || p.kind === "lastWeek"
    ? t("SEMAINE")
    : p.kind === "month" || p.kind === "lastMonth" || p.kind === "pickMonth"
      ? t("MOIS")
      : p.kind === "year"
        ? t("ANNÉE")
        : t("PÉRIODE");

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
