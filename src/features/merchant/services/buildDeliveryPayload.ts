/**
 * Construit les payloads de livraison au format attendu par le backend.
 *
 * `deliveryHours` = creneaux PERIODIQUES seuls :
 *
 * ```json
 * [{ "hour": "08:00", "periodic": true, "periodicZones": [{ "lieu": "Bonanjo", "prix": "500" }] }]
 * ```
 *
 * `expressZones` = liste EXPRESS de la boutique, SANS heure (backend, migration
 * 073) : l'express part des que la commande est prete, un seul prix par lieu.
 *
 * ```json
 * [{ "lieu": "Bonanjo", "prix": "900" }]
 * ```
 */

interface Zone {
  lieu: string;
  prix: string;
}

interface DeliveryHourPayload {
  hour: string;
  periodic: boolean;
  periodicZones: Zone[];
}

export const buildDeliveryPayload = (
  hours: string[],
  periodicEnabled: Record<string, boolean>,
  periodicZonesByHour: Record<string, Zone[]>,
): DeliveryHourPayload[] =>
  hours.map((hour) => ({
    hour,
    periodic: periodicEnabled[hour] === true,
    periodicZones: periodicZonesByHour[hour] || [],
  }));

/** Liste express : un lieu une seule fois (le premier garde), lieu non vide. */
export const buildExpressPayload = (expressZones: Zone[]): Zone[] => {
  const seen = new Set<string>();
  return expressZones.filter((z) => {
    const key = (z.lieu || "").trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
