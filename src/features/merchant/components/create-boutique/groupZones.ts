import type { Zone } from "./parseBoutique";

export interface ZoneHourEntry {
  /** Creneau periodique "HH:mm" ; "" = ligne EXPRESS seule (aucun creneau). */
  hour: string;
  periodicPrix?: string;
  /** Prix express du LIEU (sans heure), repris sur chaque ligne du lieu. */
  expressPrix?: string;
}

export interface ZoneGroup {
  lieu: string;
  /** Creneaux periodiques du lieu. */
  hours: ZoneHourEntry[];
  /** Prix express du lieu : un seul, l'express n'a pas d'heure. */
  expressPrix?: string;
}

/** Cle de comparaison d'un lieu (casse et espaces de bord ignores). */
export const lieuKey = (lieu: string) => lieu.trim().toLowerCase();

/**
 * Regroupe les zones par LIEU : chaque lieu liste ses creneaux periodiques
 * (prix par heure) et porte son prix EXPRESS unique (`expressZones`, sans
 * heure). Un lieu servi seulement en express a un groupe sans creneau. Les
 * groupes sont renvoyes du plus petit au plus grand (nombre d'heures croissant).
 */
export const groupZonesByLieu = (
  deliveryHours: string[],
  periodicEnabled: Record<string, boolean>,
  periodicZonesByHour: Record<string, Zone[]>,
  expressZones: Zone[],
): ZoneGroup[] => {
  const groups: ZoneGroup[] = [];
  const groupOf = (lieu: string) => {
    let group = groups.find((g) => lieuKey(g.lieu) === lieuKey(lieu));
    if (!group) {
      group = { lieu, hours: [] };
      groups.push(group);
    }
    return group;
  };

  expressZones.forEach((z) => {
    if (z.lieu) groupOf(z.lieu).expressPrix = z.prix;
  });

  [...deliveryHours].sort().forEach((hour) => {
    if (!periodicEnabled[hour]) return;
    (periodicZonesByHour[hour] || []).forEach((z) => {
      if (!z.lieu) return;
      const group = groupOf(z.lieu);
      group.hours.push({ hour, periodicPrix: z.prix, expressPrix: group.expressPrix });
    });
  });

  // Tri croissant : les groupes avec le moins d'heures en haut. A nombre egal,
  // ordre alphabetique du lieu pour garder un affichage stable.
  return groups.sort(
    (a, b) => a.hours.length - b.hours.length || a.lieu.localeCompare(b.lieu),
  );
};
