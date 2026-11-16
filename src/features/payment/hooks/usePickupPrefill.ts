// Parcours groupe : a l'ouverture, si toutes les commandes du lot sont deja en
// retrait sur place au meme jour et a la meme heure (choisis depuis le home),
// la livraison commune les reprend : rien a ressaisir.
import React from "react";
import { Livraison } from "@/src/types";
import type { CartZoneGroup } from "@/src/features/orders/utils/groupCartOrders";
import { commonPickup } from "@/src/features/orders/utils/commonPickup";

export const usePickupPrefill = (
  visible: boolean,
  groups: CartZoneGroup[],
  inFlight: boolean,
  setDelivery: React.Dispatch<React.SetStateAction<Livraison>>,
  setPickupChosen: (v: boolean) => void,
) => {
  React.useEffect(() => {
    if (!visible || inFlight) return;
    const p = commonPickup(groups.flatMap((g) => g.entries.map((e) => e.order)));
    if (!p) {
      // Heures differentes : tuiles Date / Heure vides, a choisir.
      setDelivery((d) =>
        Object.assign(Object.create(Object.getPrototypeOf(d)), d, { date: "", pickupTime: "" }),
      );
      setPickupChosen(false);
      return;
    }
    setDelivery((d) =>
      Object.assign(Object.create(Object.getPrototypeOf(d)), d, {
        statut: false,
        type: "aucune",
        date: p.date,
        pickupTime: p.time,
        ...(p.phone && { phone: p.phone }),
      }),
    );
    setPickupChosen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);
};
