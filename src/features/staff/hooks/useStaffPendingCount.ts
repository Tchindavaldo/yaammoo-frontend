import { useEffect, useState } from "react";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import type { ApplicationEvent } from "@/src/features/driver/context/DriverContext";
import { useDriver } from "@/src/features/driver/hooks/useDriver";
import { driverService } from "@/src/features/driver/services/driverService";
import { pendingOf } from "./useStaffDrivers";

/**
 * Nombre de demandes de livreur en attente, pour la tuile « Personnel » de
 * Settings. Rechargé à la fermeture de l'écran Personnel (où l'on décide) et
 * à chaque event de demande reçu par socket.
 *
 * @param enabled marchand avec boutique uniquement.
 * @param screenOpen écran Personnel ouvert : pas de fetch, il a sa propre liste.
 */
export const useStaffPendingCount = (enabled: boolean, screenOpen: boolean) => {
  const { userData } = useAuth();
  const { registerApplicationHandler, unregisterApplicationHandler } = useDriver();
  const fastFoodId = userData?.fastFoodId;
  const [count, setCount] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled || !fastFoodId || screenOpen) return;
    let alive = true;
    driverService.getApplications(fastFoodId).then(
      (apps) => {
        if (alive) setCount(pendingOf(apps).length);
      },
      () => {},
    );
    return () => {
      alive = false;
    };
  }, [enabled, fastFoodId, screenOpen, tick]);

  useEffect(() => {
    if (!enabled) return;
    const handler = (e: ApplicationEvent) => {
      if (e.type === "created" || e.type === "decided" || e.type === "merchant_decided") {
        setTick((t) => t + 1);
      }
    };
    registerApplicationHandler(handler);
    return () => unregisterApplicationHandler(handler);
  }, [enabled, registerApplicationHandler, unregisterApplicationHandler]);

  return enabled ? count : 0;
};
