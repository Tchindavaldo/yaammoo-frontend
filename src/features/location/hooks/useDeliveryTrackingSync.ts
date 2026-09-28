import { useEffect, useRef } from "react";
import { Alert, Platform } from "react-native";
import { Commande } from "@/src/types";
import {
  startDeliveryTracking,
  stopDeliveryTracking,
} from "../tasks/backgroundLocationTask";

const isDelivering = (o: Commande) =>
  (o.status || "").toLowerCase() === "delivering";

/**
 * Suivi du livreur, aligné sur ses courses : au moins une commande
 * `delivering` → mode livraison de la tâche arrière-plan (position envoyée
 * toutes les ~10 s) ; plus aucune → retour au suivi normal.
 *
 * « Lancer » (→ delivering) et « Terminer » (→ delivered) de `DriverOrderCard`
 * passent par `DriverContext.updateStatus`, qui met `orders` à jour : ce hook
 * suit donc les boutons, les events socket et la relance de l'app en course.
 *
 * @param orders commandes déléguées du livreur (`DriverContext`)
 * @param loaded true une fois la liste chargée : avant, une liste vide ne
 *   signifie pas « aucune course » et couperait un suivi en cours.
 */
export const useDeliveryTrackingSync = (orders: Commande[], loaded: boolean) => {
  const active = loaded && orders.some(isDelivering);
  const refusedAlerted = useRef(false);

  useEffect(() => {
    if (!loaded || Platform.OS === "web") return;
    if (!active) {
      stopDeliveryTracking().catch((e) =>
        console.warn("Arrêt du suivi livraison impossible:", e),
      );
      return;
    }
    startDeliveryTracking()
      .then((ok) => {
        if (ok || refusedAlerted.current) return;
        refusedAlerted.current = true;
        Alert.alert(
          "Localisation désactivée",
          "Le client ne peut pas suivre la livraison. Autorisez la localisation de Yaammoo dans les réglages du téléphone.",
        );
      })
      .catch((e) => console.warn("Suivi livraison impossible:", e));
  }, [active, loaded]);
};
