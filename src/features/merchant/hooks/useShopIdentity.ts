import { useEffect, useState } from "react";
import { broadcastService } from "../services/broadcastService";

type ShopIdentity = { name: string; imageUrl: string | null };

// Cache memoire par boutique : nom et logo restent stables d'un montage a
// l'autre (bascule de mode), sans repasser par un etat vide.
const cache = new Map<string, ShopIdentity>();

/** Nom + logo de la boutique (GET /fastfood/:id), servis depuis le cache puis rafraichis. */
export function useShopIdentity(fastFoodId?: string | null): ShopIdentity | null {
  const [shop, setShop] = useState<ShopIdentity | null>(() => (fastFoodId ? cache.get(fastFoodId) ?? null : null));
  useEffect(() => {
    if (!fastFoodId) return;
    setShop(cache.get(fastFoodId) ?? null);
    let alive = true;
    broadcastService.getShop(fastFoodId).then(
      (s) => {
        const prev = cache.get(fastFoodId);
        if (prev && prev.name === s.name && prev.imageUrl === s.imageUrl) return;
        cache.set(fastFoodId, s);
        if (alive) setShop(s);
      },
      () => {},
    );
    return () => {
      alive = false;
    };
  }, [fastFoodId]);
  return shop;
}
