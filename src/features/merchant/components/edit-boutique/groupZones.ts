import type { Zone } from "./parseBoutique";

export interface ZoneHourEntry {
  hour: string;
  periodicPrix?: string;
  expressPrix?: string;
}

export interface ZoneGroup {
  lieu: string;
  hours: ZoneHourEntry[];
}

/**
 * Regroupe les zones par LIEU : chaque lieu liste ses heures avec le prix
 * periodique et/ou express correspondant. Les heures dont le mode est
 * desactive sont ignorees. Les groupes sont renvoyes du plus petit au plus
 * grand (nombre d'heures croissant).
 */
export const groupZonesByLieu = (
  deliveryHours: string[],
  periodicEnabled: Record<string, boolean>,
  expressEnabled: Record<string, boolean>,
  periodicZonesByHour: Record<string, Zone[]>,
  expressZonesByHour: Record<string, Zone[]>,
): ZoneGroup[] => {
  const groups: ZoneGroup[] = [];

  [...deliveryHours].sort().forEach((hour) => {
    const periodicList = periodicEnabled[hour]
      ? periodicZonesByHour[hour] || []
      : [];
    const expressList = expressEnabled[hour]
      ? expressZonesByHour[hour] || []
      : [];

    // Fusion par lieu (periodique + express) sur une meme heure
    const byLieu = new Map<
      string,
      { periodicPrix?: string; expressPrix?: string }
    >();
    periodicList.forEach((z) => {
      const cur = byLieu.get(z.lieu) || {};
      cur.periodicPrix = z.prix;
      byLieu.set(z.lieu, cur);
    });
    expressList.forEach((z) => {
      const cur = byLieu.get(z.lieu) || {};
      cur.expressPrix = z.prix;
      byLieu.set(z.lieu, cur);
    });

    byLieu.forEach((info, lieu) => {
      let group = groups.find((g) => g.lieu === lieu);
      if (!group) {
        group = { lieu, hours: [] };
        groups.push(group);
      }
      group.hours.push({ hour, ...info });
    });
  });

  // Tri croissant : les groupes avec le moins d'heures en haut. A nombre egal,
  // ordre alphabetique du lieu pour garder un affichage stable.
  return groups.sort(
    (a, b) => a.hours.length - b.hours.length || a.lieu.localeCompare(b.lieu),
  );
};
