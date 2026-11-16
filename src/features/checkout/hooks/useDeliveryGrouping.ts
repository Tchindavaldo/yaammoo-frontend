import { useEffect } from "react";
import { Livraison } from "@/src/types";
import { cachedPaidDepartures, DeliveryProbe, isPaidDeparture } from "../services/deliveryGroupCheck";

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
 * Groupage : la carte Zone / Période lit les départs déjà payés AU TOUCHER
 * (`DeliveryTab`, loader sur la carte), puis ouvre la liste qui marque la
 * ligne concernée. Ici, sans requête : la livraison choisie est comparée à
 * cette liste → `delivery.grouping = "grouped"` (course à 0) ou `null`.
 * `groupingShopId` / `groupingUserId` (UI seulement, jamais envoyés) donnent
 * à `DeliveryTab` de quoi lancer la lecture.
 */
export const useDeliveryGrouping = (
  delivery: Livraison,
  setDelivery: (fn: (d: Livraison) => Livraison) => void,
  fastFoodId?: string | null,
  userId?: string | null,
) => {
  const probe = deliveryProbeOf(delivery, fastFoodId);
  const grouped = isPaidDeparture(cachedPaidDepartures(userId, fastFoodId), probe) ? "grouped" : null;
  useEffect(() => {
    setDelivery(d =>
      d.grouping === grouped && d.groupingShopId === (fastFoodId ?? null) && d.groupingUserId === (userId ?? null)
        ? d
        : { ...d, grouping: grouped, groupingShopId: fastFoodId ?? null, groupingUserId: userId ?? null },
    );
  }, [grouped, fastFoodId, userId]);
};
