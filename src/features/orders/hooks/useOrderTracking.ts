import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";
import { AppState, Platform } from "react-native";
import { socketService } from "@/src/services/socket";
import {
  DriverPosition,
  LatLng,
  orderTrackingService,
} from "../services/orderTrackingService";

/**
 * Suivi du livreur d'une commande `delivering` (onglet « Suivi ») :
 * - état initial par HTTP (`GET /driver/tracking/:orderId`), relu au retour
 *   au premier plan (l'event n'est pas rejoué) ;
 * - positions suivantes par socket `driverLocationUpdated`, filtrées sur
 *   `orderIds` (le livreur peut porter les commandes de plusieurs clients) ;
 * - destination : position live du téléphone du client si la localisation est
 *   autorisée, sinon sa dernière position connue renvoyée par le backend.
 *
 * Écoute locale (comme `driverRatingUpdated` dans `DriverInfoTab`) : l'event
 * ne concerne que l'onglet ouvert, aucun contexte à mettre à jour.
 */
export const useOrderTracking = (orderId: string | undefined, enabled: boolean) => {
  const [driver, setDriver] = useState<DriverPosition | null>(null);
  const [serverDestination, setServerDestination] = useState<LatLng | null>(null);
  const [liveDestination, setLiveDestination] = useState<LatLng | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(
    async (quiet: boolean) => {
      if (!orderId) return;
      if (!quiet) setLoading(true);
      try {
        const data = await orderTrackingService.get(orderId);
        // Une position socket plus récente que la réponse HTTP est gardée
        // (dates comparées parsées : le backend renvoie `+00:00`, le socket `Z`).
        setDriver((prev) =>
          prev &&
          data?.driver &&
          Date.parse(prev.capturedAt) > Date.parse(data.driver.capturedAt)
            ? prev
            : (data?.driver ?? prev),
        );
        setServerDestination(data?.destination ?? null);
        setError(false);
      } catch (e) {
        console.warn("Suivi livraison indisponible:", e);
        if (!quiet) setError(true);
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [orderId],
  );

  // État initial, puis relecture silencieuse au retour au premier plan.
  useEffect(() => {
    if (!enabled || !orderId) return;
    setDriver(null);
    void load(false);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void load(true);
    });
    return () => sub.remove();
  }, [enabled, orderId, load]);

  // Position du livreur en direct.
  useEffect(() => {
    if (!enabled || !orderId) return;
    const sock = socketService.getSocket();
    const onUpdate = (payload: any) => {
      const d = payload?.data ?? payload;
      if (!d || !Array.isArray(d.orderIds) || !d.orderIds.includes(orderId)) {
        return;
      }
      if (!Number.isFinite(d.latitude) || !Number.isFinite(d.longitude)) return;
      setDriver({
        driverId: d.driverId,
        latitude: d.latitude,
        longitude: d.longitude,
        accuracy: d.accuracy,
        speed: d.speed,
        heading: d.heading,
        capturedAt: d.capturedAt || new Date().toISOString(),
      });
    };
    sock.on("driverLocationUpdated", onUpdate);
    return () => {
      sock.off("driverLocationUpdated", onUpdate);
    };
  }, [enabled, orderId]);

  // Destination : position du client, sans demander de permission ici.
  useEffect(() => {
    if (!enabled || Platform.OS === "web") return;
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== "granted") return;
        const pos =
          (await Location.getLastKnownPositionAsync()) ??
          (await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          }));
        if (!cancelled && pos) {
          setLiveDestination({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        }
      } catch (e) {
        console.warn("Position du client indisponible:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return {
    driver,
    destination: liveDestination ?? serverDestination,
    loading,
    error,
    retry: () => load(false),
  };
};
