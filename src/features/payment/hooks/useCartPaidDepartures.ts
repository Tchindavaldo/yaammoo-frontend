import React, { useEffect, useState } from "react";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { Livraison } from "@/src/types";
import { deliveryProbeOf } from "@/src/features/checkout/hooks/useDeliveryGrouping";
import { DeliveryProbe, fetchPaidDepartures, isPaidDeparture, PaidDeparture } from "@/src/features/checkout/services/deliveryGroupCheck";

/**
 * Groupage dans le panier groupé : départs que le client a déjà payés chez
 * cette boutique et qui ne sont pas encore partis. Lus à l'ouverture du sheet
 * (`checking` = loader sur la carte Course). `grouped` : la livraison choisie
 * rejoint l'un d'eux, sa course est donc à 0. `isGroupedSlot` marque les zones
 * et créneaux concernés dans les listes de choix.
 */
export const useCartPaidDepartures = (
  visible: boolean,
  fastFoodId: string | undefined,
  delivery: Livraison,
  setDelivery: React.Dispatch<React.SetStateAction<Livraison>>,
) => {
  const { userData } = useAuth();
  const uid = userData?.uid;
  const [departures, setDepartures] = useState<PaidDeparture[]>([]);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!visible || !uid || !fastFoodId) return;
    let alive = true;
    setChecking(true);
    fetchPaidDepartures(uid, fastFoodId).then(list => {
      if (!alive) return;
      setDepartures(list);
      setChecking(false);
    });
    return () => {
      alive = false;
    };
  }, [visible, uid, fastFoodId]);

  const grouped = !!fastFoodId && isPaidDeparture(departures, deliveryProbeOf(delivery, fastFoodId));
  // Porté sur la livraison commune : `useCartOrderFlow` aligne les totaux
  // (course à 0) au paiement, comme le backend (commande « offerte »).
  useEffect(() => {
    const next = grouped ? "grouped" : null;
    setDelivery(d => ((d.grouping ?? null) === next ? d : { ...d, grouping: next }));
  }, [grouped]);
  const isGroupedSlot = (probe: Omit<DeliveryProbe, "fastFoodId">) => !!fastFoodId && isPaidDeparture(departures, { ...probe, fastFoodId });
  return { grouped, checking, isGroupedSlot };
};
