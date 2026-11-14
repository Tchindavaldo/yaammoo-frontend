import React, { useEffect, useState } from "react";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { Livraison } from "@/src/types";
import { deliveryProbeOf } from "@/src/features/checkout/hooks/useDeliveryGrouping";
import { DeliveryProbe, fetchPaidDepartures, isPaidDeparture, PaidDeparture } from "@/src/features/checkout/services/deliveryGroupCheck";

type SlotKey = "express" | "period";

/**
 * Groupage dans le panier groupé. Toucher la card Zone express / Créneau lit
 * les départs que le client a déjà payés chez cette boutique et qui ne sont pas
 * encore partis (`loadingKey` = loader au centre de CETTE card), puis ouvre sa
 * liste, qui marque la ligne concernée (`isGroupedSlot`). `grouped` : la
 * livraison choisie rejoint l'un d'eux, sa course est donc à 0.
 */
export const useCartPaidDepartures = (
  fastFoodId: string | undefined,
  delivery: Livraison,
  setDelivery: React.Dispatch<React.SetStateAction<Livraison>>,
) => {
  const { userData } = useAuth();
  const uid = userData?.uid;
  const [departures, setDepartures] = useState<PaidDeparture[]>([]);
  const [loadingKey, setLoadingKey] = useState<SlotKey | null>(null);

  const openAfterCheck = async (key: SlotKey, open: () => void) => {
    if (loadingKey) return;
    if (uid && fastFoodId) {
      setLoadingKey(key);
      setDepartures(await fetchPaidDepartures(uid, fastFoodId));
      setLoadingKey(null);
    }
    open();
  };

  const grouped = !!fastFoodId && isPaidDeparture(departures, deliveryProbeOf(delivery, fastFoodId));
  // Porté sur la livraison commune : `useCartOrderFlow` aligne les totaux
  // (course à 0) au paiement, comme le backend (commande « offerte »).
  useEffect(() => {
    const next = grouped ? "grouped" : null;
    setDelivery(d => ((d.grouping ?? null) === next ? d : { ...d, grouping: next }));
  }, [grouped]);
  const isGroupedSlot = (probe: Omit<DeliveryProbe, "fastFoodId">) => !!fastFoodId && isPaidDeparture(departures, { ...probe, fastFoodId });
  return { grouped, loadingKey, isGroupedSlot, openAfterCheck };
};
