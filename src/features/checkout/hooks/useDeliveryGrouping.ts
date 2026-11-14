import { useEffect } from "react";
import { Livraison } from "@/src/types";
import { checkDeliveryGroup, DeliveryProbe } from "../services/deliveryGroupCheck";

/** Départ visé par la livraison choisie (même découpage que `createOrder`). */
export const deliveryProbeOf = (delivery: Livraison, fastFoodId?: string | null): DeliveryProbe | null => {
  if (!fastFoodId || !delivery.statut) return null;
  if (delivery.type === "express") {
    if (!delivery.expressLieu) return null;
    return { fastFoodId, zone: delivery.expressLieu, type: "express", date: delivery.date || new Date().toISOString().split("T")[0] };
  }
  if (delivery.type !== "standard" || !delivery.hour) return null;
  const parts = delivery.hour.split("|");
  const isDate = /^\d{4}-\d{2}-\d{2}$/.test(parts[0]);
  const time = ((isDate ? parts[1] : parts[0]) || "").replace("h", ":");
  const zone = isDate ? parts[2] : parts[1];
  if (!zone || !time) return null;
  return { fastFoodId, zone, type: "time", date: (isDate ? parts[0] : delivery.date) || new Date().toISOString().split("T")[0], time };
};

/**
 * Groupage : à chaque zone / créneau choisi, vérifie si le client a déjà payé
 * ce départ. Pendant la requête `delivery.grouping = "checking"` (loader sur la
 * carte), puis `"grouped"` (course offerte) ou `null`.
 */
export const useDeliveryGrouping = (
  delivery: Livraison,
  setDelivery: (fn: (d: Livraison) => Livraison) => void,
  fastFoodId?: string | null,
  userId?: string | null,
) => {
  const probe = deliveryProbeOf(delivery, fastFoodId);
  const key = probe && userId ? JSON.stringify(probe) : "";
  useEffect(() => {
    if (!key || !userId) {
      setDelivery(d => (d.grouping ? { ...d, grouping: null } : d));
      return;
    }
    let alive = true;
    setDelivery(d => ({ ...d, grouping: "checking" }));
    checkDeliveryGroup(userId, JSON.parse(key)).then(grouped => {
      if (alive) setDelivery(d => ({ ...d, grouping: grouped ? "grouped" : null }));
    });
    return () => {
      alive = false;
    };
  }, [key, userId]);
};
