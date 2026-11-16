// Boutiques presentes dans le panier (filtre du haut de `cart.tsx`), extrait
// pour R4 : nom, image, nombre de commandes et total par boutique, plus la
// boutique selectionnee.
import { useEffect, useMemo, useState } from "react";
import type { CartFastFood } from "../components/CartFastFoodFilter";
import { useFastFoods } from "@/src/features/restaurants/hooks/useFastFoods";
import { useCartFastFoodInfos } from "./useCartFastFoodInfos";
import { prefetchFastFoodDelivery } from "@/src/features/payment/hooks/useGroupedDeliveryData";
import { computeCartTotal } from "@/src/features/checkout/utils/cartDeliveryTotal";
import { t } from "@/src/i18n";

export const useCartFastFoods = (pendingToBuy: any[], i18nLang: unknown) => {
  // Filtre fastfood du haut de page (duplication du filtre « État des commandes »).
  const { fastFoods } = useFastFoods();
  const [selectedFastFoodId, setSelectedFastFoodId] = useState<string | null>(null);

  // Boutiques du panier non chargées sur le home (pagination) : nom + image
  // récupérés via `GET /fastFood/:id`.
  const missingFfIds = useMemo(() => {
    const known = new Set(fastFoods.map((f: any) => f.id));
    return Array.from(
      new Set(pendingToBuy.map((o: any) => o.fastFoodId).filter(Boolean)),
    ).filter((id) => !known.has(id)) as string[];
  }, [pendingToBuy, fastFoods]);
  const fetchedFfInfos = useCartFastFoodInfos(missingFfIds);

  // Fastfoods présents dans le panier + nombre de commandes et montant total
  // (livraison mutualisée incluse) par fastfood.
  const cartFastFoods = useMemo<CartFastFood[]>(() => {
    const map = new Map<string, CartFastFood>();
    const ordersByFf = new Map<string, any[]>();
    pendingToBuy.forEach((o: any) => {
      const ffId = o.fastFoodId;
      if (!ffId) return;
      let entry = map.get(ffId);
      if (!entry) {
        const ff: any = fastFoods.find((f: any) => f.id === ffId);
        const fetched = fetchedFfInfos[ffId];
        entry = {
          id: ffId,
          name: ff?.nom || ff?.name || fetched?.name || t("Boutique"),
          // Boutique sans logo en base : photo du plat commandé à défaut.
          image:
            ff?.image || ff?.logo || ff?.coverImage || fetched?.image ||
            o.menu?.image || o.menu?.coverImage || o.menu?.images?.[0] || undefined,
          orderCount: 0,
          total: 0,
        };
        map.set(ffId, entry);
      }
      entry.orderCount += 1;
      ordersByFf.set(ffId, [...(ordersByFf.get(ffId) || []), o]);
    });
    // Total par fastfood : même calcul que le total panier (livraison mutualisée).
    map.forEach((entry, ffId) => {
      entry.total = computeCartTotal(ordersByFf.get(ffId) || []);
    });
    return Array.from(map.values());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingToBuy, fastFoods, fetchedFfInfos, i18nLang]);

  // Creneaux et zones express des boutiques du panier chargees d'avance : a
  // l'ouverture d'un sheet de livraison, la card « Zone » est deja la.
  useEffect(() => {
    cartFastFoods.forEach((f) => prefetchFastFoodDelivery(f.id));
  }, [cartFastFoods]);

  // Sélection par défaut : le premier fastfood ; on re-sélectionne si celui en
  // cours disparaît du panier.
  useEffect(() => {
    if (cartFastFoods.length === 0) {
      if (selectedFastFoodId !== null) setSelectedFastFoodId(null);
      return;
    }
    if (!cartFastFoods.some((f) => f.id === selectedFastFoodId)) {
      setSelectedFastFoodId(cartFastFoods[0].id);
    }
  }, [cartFastFoods, selectedFastFoodId]);

  return { cartFastFoods, selectedFastFoodId, setSelectedFastFoodId };
};
