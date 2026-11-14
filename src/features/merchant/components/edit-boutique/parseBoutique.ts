export type Zone = { lieu: string; prix: string };

export interface ParsedDelivery {
  hours: string[];
  periodicEnabled: Record<string, boolean>;
  periodicZones: Record<string, Zone[]>;
  /** Heure selectionnee par defaut (nouveau format uniquement). */
  firstHour: string | null;
  /** Draft prechargee depuis la premiere zone de firstHour. */
  periodicDraft: Zone | null;
}

/**
 * Normalise `deliveryHours` renvoye par l'API : creneaux de livraison
 * PERIODIQUE. L'express n'y est plus (liste `expressZones` de la boutique,
 * sans heure — voir `parseExpressZones`). Deux formats sont supportes :
 * - nouveau : [{ hour, periodic, periodicZones }]
 * - ancien  : string[] (simples heures, sans zones)
 */
export const parseDeliveryHours = (rawHours: any): ParsedDelivery => {
  const empty: ParsedDelivery = {
    hours: [],
    periodicEnabled: {},
    periodicZones: {},
    firstHour: null,
    periodicDraft: null,
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
    result.periodicZones[h.hour] = h.periodicZones || [];
  });

  if (hours.length > 0) {
    result.firstHour = hours[0];
    const firstP = (result.periodicZones[hours[0]] || [])[0];
    if (firstP) result.periodicDraft = { lieu: firstP.lieu || "", prix: firstP.prix || "" };
  }

  return result;
};

/** Zones EXPRESS de la boutique (`expressZones`) : `{ lieu, prix }` en chaines. */
export const parseExpressZones = (raw: any): Zone[] =>
  Array.isArray(raw)
    ? raw
        .filter((z: any) => z && typeof z.lieu === "string" && z.lieu.trim())
        .map((z: any) => ({ lieu: z.lieu, prix: String(z.prix ?? "") }))
    : [];

/** "HH:mm" -> Date d'aujourd'hui a cette heure. */
export const hourToDate = (hour: string) => {
  const [h, m] = hour.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};
