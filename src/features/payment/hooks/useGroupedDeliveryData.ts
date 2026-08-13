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

/** Donnees deja connues pour cette boutique, `undefined` si jamais chargees. */
export const getCachedFastFood = (fastFoodId?: string) =>
  fastFoodId ? ffCache.get(fastFoodId) : undefined;

/**
 * Charge `GET /fastfood/:id` dans le cache si ce n'est pas deja fait.
 *
 * A appeler AVANT d'ouvrir un sheet de livraison : sans cela le sheet rend une
 * premiere fois sans `expressZones` (card « Zone » absente) puis la fait
 * apparaitre a l'arrivee de la reponse — le flash visible a l'ouverture.
 */
export const prefetchFastFoodDelivery = async (fastFoodId?: string) => {
  if (!fastFoodId) return null;
  if (ffCache.has(fastFoodId)) return ffCache.get(fastFoodId);
  try {
    const res = await axios.get(`${Config.apiUrl}/fastfood/${fastFoodId}`, {
      headers: { "ngrok-skip-browser-warning": "true" },
    });
    const data = res.data?.data || null;
    ffCache.set(fastFoodId, data);
    return data;
  } catch {
    return null;
  }
};

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
    prefetchFastFoodDelivery(fastFoodId).then((data) => {
      if (!cancelled) setFfData(data ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [fastFoodId]);

  const listedFf = fastFoods.find((f: any) => f.id === fastFoodId) as any;

  return {
    /** Nom de la boutique du lot, affiche a l'etape de groupage. */
    fastFoodName:
      ffData?.nom || ffData?.name || listedFf?.nom || listedFf?.name || "",
    rawHours: ffData?.deliveryHours || [],
    orderLeadTime: ffData?.orderLeadTime || 0,
    advanceDays: ffData?.advanceDays as number | undefined,
    deliveryOffer: listedFf?.deliveryOffer ?? null,
  };
};
