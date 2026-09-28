import type { LatLng } from "../services/orderTrackingService";

/**
 * Heure d'arrivée estimée du livreur, sans service d'itinéraire : distance à
 * vol d'oiseau majorée d'un facteur route, à la vitesse moyenne d'une moto en
 * ville. La vitesse instantanée du GPS est écartée (feu rouge = 0 km/h, ETA
 * infinie) : l'estimation reste stable d'une position à l'autre.
 */

const EARTH_RADIUS_KM = 6371;
/** Trajet routier ≈ 1,3 × vol d'oiseau en ville. */
const ROAD_FACTOR = 1.3;
/** Vitesse moyenne d'une moto en ville (km/h). */
const CITY_SPEED_KMH = 20;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Distance à vol d'oiseau (haversine), en km. */
export const haversineKm = (a: LatLng, b: LatLng) => {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) *
      Math.cos(toRad(b.latitude)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
};

export interface TrackingEta {
  /** Distance routière estimée (km). */
  distanceKm: number;
  /** Minutes restantes (au moins 1). */
  minutes: number;
  arrivalAt: Date;
}

export const estimateArrival = (
  driver: LatLng,
  destination: LatLng,
  now = new Date(),
): TrackingEta => {
  const distanceKm = haversineKm(driver, destination) * ROAD_FACTOR;
  const minutes = Math.max(1, Math.ceil((distanceKm / CITY_SPEED_KMH) * 60));
  return {
    distanceKm,
    minutes,
    arrivalAt: new Date(now.getTime() + minutes * 60 * 1000),
  };
};

/** « 14:32 » */
export const formatClock = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

/** « à l'instant », « il y a 40 s », « il y a 3 min ». */
export const formatAgo = (iso: string, now = Date.now()) => {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (!Number.isFinite(s) || s < 10) return "à l'instant";
  if (s < 60) return `il y a ${s} s`;
  return `il y a ${Math.round(s / 60)} min`;
};
