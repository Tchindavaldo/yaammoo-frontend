import { useEffect, useMemo, useRef, useState } from "react";
import type { LatLng } from "../services/orderTrackingService";
import { fetchRoute, type Route } from "../services/routingService";
import { haversineKm } from "../utils/trackingEta";

/**
 * Itinéraire de l'onglet « Suivi ». Pour tenir dans le quota gratuit
 * d'OpenRouteService, la route n'est PAS recalculée à chaque position : une
 * seule fois, puis seulement si le livreur s'en écarte ou si la destination
 * bouge. Entre deux calculs, le tracé est raccourci au point le plus proche du
 * livreur et la durée restante est proratisée sur la distance restante.
 */

/** Écart livreur ↔ tracé au-delà duquel on recalcule (km). */
const OFF_ROUTE_KM = 0.08;
/** Déplacement de la destination qui justifie un recalcul (km). */
const DEST_MOVED_KM = 0.1;
/** Intervalle minimal entre deux appels, même hors trajet. */
const MIN_REFETCH_MS = 30 * 1000;

export interface RemainingRoute {
  points: LatLng[];
  distanceKm: number;
  minutes: number;
}

const nearestIndex = (points: LatLng[], p: LatLng) => {
  let best = 0;
  let bestKm = Infinity;
  points.forEach((q, i) => {
    const d = haversineKm(p, q);
    if (d < bestKm) {
      bestKm = d;
      best = i;
    }
  });
  return { index: best, km: bestKm };
};

const pathKm = (points: LatLng[]) =>
  points.reduce((sum, p, i) => (i ? sum + haversineKm(points[i - 1], p) : 0), 0);

export function useTrackingRoute(
  driver: LatLng | null,
  destination: LatLng | null,
): RemainingRoute | null {
  const [route, setRoute] = useState<Route | null>(null);
  const lastFetch = useRef(0);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!driver || !destination || inFlight.current) return;

    if (route) {
      const end = route.points[route.points.length - 1];
      const destMoved = haversineKm(end, destination) > DEST_MOVED_KM;
      const offRoute = nearestIndex(route.points, driver).km > OFF_ROUTE_KM;
      if (!destMoved && !offRoute) return;
      if (Date.now() - lastFetch.current < MIN_REFETCH_MS) return;
    }

    inFlight.current = true;
    lastFetch.current = Date.now();
    // Pas d'annulation au changement de position (toutes les ~10 s) : la
    // réponse reste valable, seul le démontage l'ignore.
    fetchRoute(driver, destination)
      .then((r) => {
        if (mounted.current && r) setRoute(r);
      })
      .finally(() => {
        inFlight.current = false;
      });
  }, [driver, destination, route]);

  return useMemo(() => {
    if (!route || !driver) return null;
    const { index } = nearestIndex(route.points, driver);
    const points = [driver, ...route.points.slice(index + 1)];
    const totalKm = route.distanceMeters / 1000;
    const distanceKm = pathKm(points);
    const ratio = totalKm > 0 ? Math.min(1, distanceKm / totalKm) : 1;
    const minutes = Math.max(1, Math.ceil((route.durationSeconds * ratio) / 60));
    return { points, distanceKm, minutes };
  }, [route, driver]);
}
