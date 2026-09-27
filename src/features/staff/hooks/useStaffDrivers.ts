import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import type { ApplicationEvent } from "@/src/features/driver/context/DriverContext";
import { useDriver } from "@/src/features/driver/hooks/useDriver";
import {
  driverService,
  type DriverApplication,
  type DriverInfo,
} from "@/src/features/driver/services/driverService";

// Construit un DriverInfo (forme « Mes livreurs ») depuis une demande
// acceptée, pour l'ajouter EN LOCAL sans refetch.
const applicationToDriver = (app: DriverApplication): DriverInfo => ({
  uid: app.userId,
  driverId: app.userId,
  isDriver: true,
  infos: app.user?.infos,
});

/** Ajoute un livreur à la liste locale sans doublon (par driverId). */
const addDriverLocal = (list: DriverInfo[], d: DriverInfo): DriverInfo[] =>
  list.some((x) => x.driverId === d.driverId) ? list : [d, ...list];

/**
 * Une seule demande visible par candidat (userId), la plus récente : filet si
 * l'API renvoie un doublon transitoire.
 */
export const dedupeByUser = (list: DriverApplication[]): DriverApplication[] => {
  const byUser = new Map<string, DriverApplication>();
  const t = (a: DriverApplication) => a.updatedAt || a.createdAt || "";
  for (const app of list) {
    const prev = byUser.get(app.userId);
    if (!prev || t(app) >= t(prev)) byUser.set(app.userId, app);
  }
  return Array.from(byUser.values());
};

/** « Demandes reçues » = uniquement les PENDING, dédupliquées par candidat. */
export const pendingOf = (apps: DriverApplication[]) =>
  dedupeByUser(apps.filter((a) => a.status === "pending"));

export type DriverActionResult = { ok: true } | { ok: false; message: string };

/**
 * Onglet Livreurs de l'écran Personnel : demandes en attente et livreurs de la
 * boutique, synchronisés en temps réel via le bus de DriverContext.
 * Reprend la logique de l'ancien écran « Livreurs ».
 */
export const useStaffDrivers = (active: boolean, onLoadError: () => void) => {
  const { userData } = useAuth();
  const { registerApplicationHandler, unregisterApplicationHandler } = useDriver();
  const fastFoodId = userData?.fastFoodId;

  const [applications, setApplications] = useState<DriverApplication[]>([]);
  const [drivers, setDrivers] = useState<DriverInfo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  /** Demandes en cours de décision (id → true). */
  const [deciding, setDeciding] = useState<Record<string, boolean>>({});
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchAll = useCallback(
    (ff: string) =>
      Promise.all([driverService.getApplications(ff), driverService.getDrivers(ff)]),
    [],
  );

  useEffect(() => {
    if (!active || !fastFoodId) return;
    let alive = true;
    fetchAll(fastFoodId).then(
      ([apps, drv]) => {
        if (!alive) return;
        setApplications(pendingOf(apps));
        setDrivers(drv);
        setLoaded(true);
      },
      () => {
        if (!alive) return;
        setLoaded(true);
        onLoadError();
      },
    );
    return () => {
      alive = false;
    };
  }, [active, fastFoodId, fetchAll, onLoadError]);

  const refresh = useCallback(async () => {
    if (!fastFoodId) return;
    setRefreshing(true);
    try {
      const [apps, drv] = await fetchAll(fastFoodId);
      setApplications(pendingOf(apps));
      setDrivers(drv);
    } catch {
      onLoadError();
    } finally {
      setRefreshing(false);
    }
  }, [fastFoodId, fetchAll, onLoadError]);

  // Temps réel : ne traite que les demandes de CETTE boutique.
  useEffect(() => {
    if (!active) return;
    const handler = (e: ApplicationEvent) => {
      // Livreur retiré depuis un AUTRE appareil marchand.
      if (e.type === "merchant_driver_removed") {
        setDrivers((prev) => prev.filter((d) => d.driverId !== e.driverId));
        return;
      }
      // Le retrait côté livreur ne concerne pas cet écran.
      if (e.type === "removed") return;
      const app = e.application;
      if (!app || app.fastFoodId !== fastFoodId) return;
      if (e.type === "created") {
        // Relance d'un candidat : remplace sa demande, jamais 2 lignes.
        setApplications((prev) => [app, ...prev.filter((a) => a.userId !== app.userId)]);
      } else if (e.type === "decided" || e.type === "merchant_decided") {
        setApplications((prev) => prev.filter((a) => a.id !== app.id));
        if (app.status === "accepted") {
          setDrivers((prev) => addDriverLocal(prev, applicationToDriver(app)));
        }
      }
    };
    registerApplicationHandler(handler);
    return () => unregisterApplicationHandler(handler);
  }, [active, fastFoodId, registerApplicationHandler, unregisterApplicationHandler]);

  const decide = useCallback(
    async (app: DriverApplication, decision: "accepted" | "refused"): Promise<DriverActionResult> => {
      setDeciding((p) => ({ ...p, [app.id]: true }));
      try {
        await driverService.decideApplication(app.id, decision);
        setApplications((prev) => prev.filter((a) => a.id !== app.id));
        if (decision === "accepted") {
          setDrivers((prev) => addDriverLocal(prev, applicationToDriver(app)));
        }
        return { ok: true };
      } catch {
        return { ok: false, message: "Action échouée" };
      } finally {
        setDeciding((p) => ({ ...p, [app.id]: false }));
      }
    },
    [],
  );

  const removeDriver = useCallback(
    async (driverId: string): Promise<DriverActionResult> => {
      if (!fastFoodId) return { ok: false, message: "Boutique introuvable" };
      setRemovingId(driverId);
      try {
        await driverService.removeDriver(driverId, fastFoodId);
        setDrivers((prev) => prev.filter((d) => d.driverId !== driverId));
        return { ok: true };
      } catch {
        return { ok: false, message: "Retrait échoué" };
      } finally {
        setRemovingId(null);
      }
    },
    [fastFoodId],
  );

  return {
    applications,
    drivers,
    loaded,
    refreshing,
    deciding,
    removingId,
    refresh,
    decide,
    removeDriver,
  };
};
