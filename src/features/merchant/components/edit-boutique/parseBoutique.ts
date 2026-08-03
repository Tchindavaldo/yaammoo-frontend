export type Zone = { lieu: string; prix: string };

export interface ParsedDelivery {
  hours: string[];
  periodicEnabled: Record<string, boolean>;
  expressEnabled: Record<string, boolean>;
  periodicZones: Record<string, Zone[]>;
  expressZones: Record<string, Zone[]>;
  /** Heure selectionnee par defaut (nouveau format uniquement). */
  firstHour: string | null;
  /** Drafts prechargees depuis la premiere zone de firstHour. */
  periodicDraft: Zone | null;
  expressDraft: Zone | null;
}

/**
 * Normalise `deliveryHours` renvoye par l'API. Deux formats sont supportes :
 * - nouveau : [{ hour, periodic, periodicZones, express, expressZones }]
 * - ancien  : string[] (simples heures, sans zones)
 */
export const parseDeliveryHours = (rawHours: any): ParsedDelivery => {
  const empty: ParsedDelivery = {
    hours: [],
    periodicEnabled: {},
    expressEnabled: {},
    periodicZones: {},
    expressZones: {},
    firstHour: null,
    periodicDraft: null,
    expressDraft: null,
  };

  if (!Array.isArray(rawHours) || rawHours.length === 0) return empty;

  // Ancien format : simple string[]
  if (typeof rawHours[0] !== "object") {
    return { ...empty, hours: rawHours, firstHour: rawHours[0] ?? null };
  }

  const hours: string[] = rawHours.map((h: any) => h.hour).sort();
  const result: ParsedDelivery = { ...empty, hours };

  rawHours.forEach((h: any) => {
    result.periodicEnabled[h.hour] = h.periodic === true;
    result.expressEnabled[h.hour] = h.express === true;
    result.periodicZones[h.hour] = h.periodicZones || [];
    result.expressZones[h.hour] = h.expressZones || [];
  });

  if (hours.length > 0) {
    result.firstHour = hours[0];
    const firstP = (result.periodicZones[hours[0]] || [])[0];
    const firstE = (result.expressZones[hours[0]] || [])[0];
    if (firstP || firstE) {
      const lieu = firstP?.lieu || firstE?.lieu || "";
      result.periodicDraft = { lieu, prix: firstP?.prix || "" };
      result.expressDraft = { lieu, prix: firstE?.prix || "" };
    }
  }

  return result;
};

/** "HH:mm" -> Date d'aujourd'hui a cette heure. */
export const hourToDate = (hour: string) => {
  const [h, m] = hour.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};
