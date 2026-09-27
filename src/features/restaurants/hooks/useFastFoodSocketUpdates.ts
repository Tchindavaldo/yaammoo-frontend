import type { DeliveryOffer, FastFood } from "@/src/types";
import { useCallback, type Dispatch, type SetStateAction } from "react";
import { normalizeFastFood, normalizeMenu } from "../utils/normalizeFastFood";

/**
 * Injection directe des payloads socket dans la liste du home, sans refetch.
 * Extrait de `FastFoodContext` : chaque callback ne fait qu'un `setFastFoods`
 * (identite stable), exposee telle quelle par le contexte.
 */
export function useFastFoodSocketUpdates(
  setFastFoods: Dispatch<SetStateAction<FastFood[]>>,
) {
  // ── Injection socket : upsert/remove sur le state local, sans requête ──
  const upsertMenuFromSocket = useCallback(
    (rawMenu: any) => {
      const menu = normalizeMenu(rawMenu);
      const ffId = rawMenu?.fastFoodId;
      if (!menu?.id || !ffId) return;
      setFastFoods((prev) =>
        prev.map((ff) => {
          if (ff.id !== ffId) return ff;
          const list = Array.isArray(ff.menu) ? ff.menu : [];
          const idx = list.findIndex((m: any) => m.id === menu.id);
          const nextMenu =
            idx >= 0
              ? list.map((m: any) => (m.id === menu.id ? { ...m, ...menu } : m))
              : [menu, ...list];
          return { ...ff, menu: nextMenu };
        }),
      );
    },
    [setFastFoods],
  );

  const removeMenuFromSocket = useCallback(
    (ffId: string, menuId: string) => {
      if (!ffId || !menuId) return;
      setFastFoods((prev) =>
        prev.map((ff) =>
          ff.id === ffId
            ? { ...ff, menu: (ff.menu || []).filter((m: any) => m.id !== menuId) }
            : ff,
        ),
      );
    },
    [setFastFoods],
  );

  const upsertFastFoodFromSocket = useCallback(
    (rawFastFood: any) => {
      if (!rawFastFood?.id) return;
      // Le payload contient-il les menus ? (ex. fastfoodUpdated n'envoie que les
      // infos boutique, sans les plats). Si non, on NE doit pas écraser les menus
      // déjà chargés — sinon le fast food passerait à menu=[] et disparaîtrait de
      // la home (filtre « sans plat »).
      const payloadHasMenus =
        Array.isArray(rawFastFood.menus) || Array.isArray(rawFastFood.menu);
      setFastFoods((prev) => {
        const idx = prev.findIndex((ff) => ff.id === rawFastFood.id);
        const normalized = normalizeFastFood(
          rawFastFood,
          // Insertion en tête (voir plus bas) : le design 0 est celui de la
          // première position. `prev.length % 6` valait pour un ajout en fin.
          idx >= 0 ? (prev[idx].designIndex ?? 0) : 0,
        );
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            ...normalized,
            // Préserve les menus existants si le payload ne les fournit pas.
            menu: payloadHasMenus ? normalized.menu : next[idx].menu,
          };
          return next;
        }
        // ⚠️ Nouvelle boutique : elle s'insère en TÊTE, pas en fin. Le backend
        // trie par `createdAt` décroissant — la plus récente est donc première.
        // L'ajouter en fin la placerait au milieu d'une liste paginée, à un
        // endroit qui ne correspond à rien, et elle disparaîtrait au prochain
        // refresh. En tête, rien ne se décale sous les yeux de l'utilisateur.
        return [normalized, ...prev];
      });
    },
    [setFastFoods],
  );

  const clearDeliveryOfferForBonus = useCallback(
    (bonusId: string) => {
      if (!bonusId) return;
      setFastFoods((prev) =>
        prev.map((ff) => {
          const offer = (ff as any).deliveryOffer;
          // Ciblé : on n'efface QUE si l'offre affichée vient bien de ce bonus —
          // une offre issue d'un autre bonus (ou d'une campagne) doit survivre.
          if (!offer || offer.bonusId !== bonusId) return ff;
          return { ...ff, deliveryOffer: null } as FastFood;
        }),
      );
    },
    [setFastFoods],
  );

  /**
   * Applique l'offre de livraison portée par `bonus.armed` / `bonus.disarmed`,
   * exactement comme le ferait `GET /fastFood/all` — sans refetch.
   *
   * Portée : une offre **plateforme** (`fastFoodId: null`) couvre TOUTES les
   * boutiques ; une offre ciblée ne touche que la sienne. Au désarmement le
   * backend envoie `deliveryOffer: null` sans portée : on efface donc partout,
   * le user ne pouvant avoir qu'une offre livraison active à la fois.
   */
  const applyDeliveryOffer = useCallback(
    (offer: DeliveryOffer | null) => {
      setFastFoods((prev) =>
        prev.map((ff) => {
          const targets =
            !offer || offer.fastFoodId == null || offer.fastFoodId === ff.id;
          if (!targets) return ff;
          return { ...ff, deliveryOffer: offer ?? null } as FastFood;
        }),
      );
    },
    [setFastFoods],
  );

  return {
    upsertMenuFromSocket,
    removeMenuFromSocket,
    upsertFastFoodFromSocket,
    applyDeliveryOffer,
    clearDeliveryOfferForBonus,
  };
}
