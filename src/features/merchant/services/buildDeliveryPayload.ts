/**
 * Construit le payload `deliveryHours` au format attendu par le backend.
 *
 * Transforme les états frontend éparpillés en un tableau d'objets structurés :
 *
 * ```json
 * [
 *   {
 *     "hour": "08:00",
 *     "periodic": true,
 *     "periodicZones": [{ "lieu": "Bonanjo", "prix": "500" }],
 *     "express": false,
 *     "expressZones": []
 *   }
 * ]
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
  express: boolean;
  expressZones: Zone[];
}

export const buildDeliveryPayload = (
  hours: string[],
  periodicEnabled: Record<string, boolean>,
  periodicZonesByHour: Record<string, Zone[]>,
  expressEnabled: Record<string, boolean>,
  expressZonesByHour: Record<string, Zone[]>,
): DeliveryHourPayload[] => {
  return hours.map((hour) => ({
    hour,
    periodic: periodicEnabled[hour] === true,
    periodicZones: periodicZonesByHour[hour] || [],
    express: expressEnabled[hour] === true,
    expressZones: expressZonesByHour[hour] || [],
  }));
};
