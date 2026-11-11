import { Config } from "@/src/api/config";
import { Sentry } from "@/src/services/sentry";
import type { LatLng } from "./orderTrackingService";

/**
 * Itinéraire livreur → client pour l'onglet « Suivi » (OpenRouteService,
 * offre gratuite ~2 000 itinéraires/jour). Repris du service de routage du
 * projet VORA. Fournisseur encapsulé ici : changer de moteur (OSRM, Valhalla)
 * ne touche que ce fichier.
 *
 * Profil `cycling-regular` : plus proche du trajet réel d'une moto en ville
 * (ruelles, raccourcis) que le profil voiture.
 */

export type Route = {
  /** Géométrie à tracer, dans l'ordre du parcours. */
  points: LatLng[];
  distanceMeters: number;
  durationSeconds: number;
};

// `api.heigit.org` et non `api.openrouteservice.org`, en cours de retrait.
const ORS_URL =
  "https://api.heigit.org/openrouteservice/v2/directions/cycling-regular/geojson";

/** Sur un réseau lent, mieux vaut garder l'estimation à vol d'oiseau. */
const TIMEOUT_MS = 12000;

/** Échec envoyé à Sentry : sans lui, la carte reste sans tracé sans aucune trace. */
const reportRouteFailure = (reason: string, extra: Record<string, unknown> = {}) => {
  console.warn("[Suivi] itinéraire indisponible :", reason);
  Sentry.captureMessage("Suivi: itinéraire indisponible", {
    level: "warning",
    tags: { route_failure: reason },
    extra,
  });
};

/** Itinéraire, ou null (clé absente, réseau, aucune route) : l'appelant garde l'estimation. */
export async function fetchRoute(
  origin: LatLng,
  destination: LatLng,
): Promise<Route | null> {
  const key = Config.orsKey;
  if (!key) {
    reportRouteFailure("no_key");
    return null;
  }
  const points = { origin, destination };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(ORS_URL, {
      method: "POST",
      headers: { Authorization: key, "Content-Type": "application/json" },
      body: JSON.stringify({
        coordinates: [
          [origin.longitude, origin.latitude],
          [destination.longitude, destination.latitude],
        ],
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 500);
      reportRouteFailure(`http_${response.status}`, { ...points, detail });
      return null;
    }
    const body = await response.json();
    const feature = body?.features?.[0];
    const coords: [number, number][] | undefined = feature?.geometry?.coordinates;
    const summary = feature?.properties?.summary;
    if (!Array.isArray(coords) || coords.length < 2) {
      reportRouteFailure("no_geometry", points);
      return null;
    }
    if (typeof summary?.distance !== "number" || typeof summary?.duration !== "number") {
      reportRouteFailure("no_summary", points);
      return null;
    }
    return {
      points: coords.map(([longitude, latitude]) => ({ latitude, longitude })),
      distanceMeters: summary.distance,
      durationSeconds: summary.duration,
    };
  } catch (e) {
    reportRouteFailure("network", { ...points, message: (e as Error)?.message });
    return null;
  } finally {
    clearTimeout(timer);
  }
}
