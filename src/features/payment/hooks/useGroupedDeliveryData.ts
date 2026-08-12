import { Config } from "@/src/api/config";
import { useFastFoods } from "@/src/features/restaurants/hooks/useFastFoods";
import axios from "axios";
import React from "react";

/**
 * Cache des données de livraison par boutique (`GET /fastfood/:id`).
 *
 * Sans lui, chaque ouverture repartait de `null` : les cards « Zone » (rendues
 * seulement si des `expressZones` existent) et les prix apparaissaient d'un coup
 * à l'arrivée de la réponse — un flash visible. Avec le cache, la 2e ouverture
 * rend tout de suite, et la 1re ne clignote plus dès que le fetch a été amorcé
 * avant l'affichage du sheet.
 */
const ffCache = new Map<string, any>();

/**
 * Données de livraison de la boutique de référence du lot groupé : créneaux,
 * délai de préparation, jours d'avance et offre de livraison. Alimente
 * `DeliveryTab` et ses overlays exactement comme `CartCheckoutSheet` le fait
 * pour une commande individuelle.
 */
export const useGroupedDeliveryData = (fastFoodId?: string) => {
  const { fastFoods } = useFastFoods();
  const [ffData, setFfData] = React.useState<any>(
    () => (fastFoodId ? ffCache.get(fastFoodId) : null) ?? null,
  );

  React.useEffect(() => {
    if (!fastFoodId) return;
    // Deja connu : on rend immediatement, sans passer par `null` (pas de flash).
    const cached = ffCache.get(fastFoodId);
    if (cached !== undefined) {
      setFfData(cached);
      return;
    }
    let cancelled = false;
    axios
      .get(`${Config.apiUrl}/fastfood/${fastFoodId}`, {
        headers: { "ngrok-skip-browser-warning": "true" },
      })
      .then((res) => {
        const data = res.data?.data || null;
        ffCache.set(fastFoodId, data);
        if (!cancelled) setFfData(data);
      })
      .catch(() => {
        if (!cancelled) setFfData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [fastFoodId]);

  return {
    rawHours: ffData?.deliveryHours || [],
    orderLeadTime: ffData?.orderLeadTime || 0,
    advanceDays: ffData?.advanceDays as number | undefined,
    deliveryOffer:
      (fastFoods.find((f: any) => f.id === fastFoodId) as any)?.deliveryOffer ??
      null,
  };
};
