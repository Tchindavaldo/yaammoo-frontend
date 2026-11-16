// Heures de retrait SUR PLACE : le client choisit librement son heure, mais
// dans les horaires de la boutique (openTime -> closeTime, "HH:mm").
// Fermeture apres minuit (ex. 18:00 -> 02:00) geree : la plage deborde sur
// le lendemain. Le jour meme, seules les heures futures (+ delai de
// preparation `leadMinutes`) sont proposees. Util pur, partage (R16).
import { t } from "@/src/i18n";

const STEP = 15;

const toMin = (hhmm?: string | null): number | null => {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(hhmm || "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h > 23 || mi > 59) return null;
  return h * 60 + mi;
};

const fmt = (min: number): string => {
  const v = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
};

const isoOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Heures "HH:mm" (pas de 15 min) possibles pour le jour `dayISO`. */
export const pickupHourSlots = (
  openTime: string | null | undefined,
  closeTime: string | null | undefined,
  dayISO: string,
  leadMinutes = 0,
  now: Date = new Date(),
): string[] => {
  const open = toMin(openTime) ?? 0;
  let close = toMin(closeTime) ?? 1439;
  if (close <= open) close += 1440; // ferme apres minuit
  let start = Math.ceil(open / STEP) * STEP;
  if (dayISO === isoOf(now)) {
    const min = now.getHours() * 60 + now.getMinutes() + Math.max(0, leadMinutes || 0);
    start = Math.max(start, Math.ceil(min / STEP) * STEP);
  }
  const out: string[] = [];
  for (let m = start; m <= close; m += STEP) out.push(fmt(m));
  return out;
};

const WD = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
const MO = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

/** "YYYY-MM-DD" -> "sam. 15 nov." (vide si date illisible). */
export const pickupDayLabel = (iso?: string | null): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""));
  if (!m) return "";
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return `${t(WD[d.getDay()])} ${d.getDate()} ${t(MO[d.getMonth()])}`;
};

/** Libelle complet du retrait : "Sur place · sam. 15 nov. · 14:30". */
export const pickupLabel = (iso?: string | null, hhmm?: string | null): string =>
  [t("Sur place"), pickupDayLabel(iso), hhmm || ""].filter(Boolean).join(" · ");

/** true si `hhmm` est encore proposable ce jour-la (invalide un choix perime). */
export const isPickupHourValid = (
  hhmm: string,
  openTime: string | null | undefined,
  closeTime: string | null | undefined,
  dayISO: string,
  leadMinutes = 0,
): boolean => pickupHourSlots(openTime, closeTime, dayISO, leadMinutes).includes(hhmm);
