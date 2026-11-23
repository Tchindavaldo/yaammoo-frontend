import { useEffect, useMemo, type Dispatch, type SetStateAction } from "react";
import { Boisson, Embalage, Menu } from "../../../types";
import { menuPriceAt, isMerchantFeePayer } from "../utils/menuPrices";

/**
 * Extras et boissons proposés au checkout (home et panier), sortis de
 * `useCheckout` (R26). Les extras suivent le `feePayer` du prix choisi.
 */
export const useCheckoutOptions = (
  menu: Menu | null,
  selectedPriceIndex: number,
  setSelectedPackaging: Dispatch<SetStateAction<Embalage[]>>,
) => {
  // Prix choisi payé par le MARCHAND (feePayer, money-rules.md §2 bis) : les
  // extras suivent ce prix et sont facturés au BRUT (`rawPrice`), comme le
  // backend (repriceCart). Les boissons portent déjà leur prix (vue home).
  const extrasAtRaw = isMerchantFeePayer(menuPriceAt(menu, selectedPriceIndex)?.feePayer);

  // Utiliser les extras/drinks du menu si disponibles
  const availablePackaging = useMemo(
    () => {
      if (menu && (menu as any).extra && Array.isArray((menu as any).extra)) {
        return (menu as any).extra
          .filter((e: any) => e.name && e.name !== 'Aucun')
          .map((e: any) => new Embalage(e.name, (extrasAtRaw && e.rawPrice != null ? e.rawPrice : e.prix) || 0, e.rawPrice));
      }
      return [new Embalage("Sac plastique", 100), new Embalage("Gamelle", 150)];
    },
    [menu, extrasAtRaw],
  );

  // Prix changé (client <-> marchand) : les extras déjà cochés reprennent le
  // prix de la nouvelle liste, sinon le total garderait l'ancien prix.
  useEffect(() => {
    setSelectedPackaging((prev) => {
      if (prev.length === 0) return prev;
      const next = availablePackaging.filter((p: Embalage) => prev.some((x) => x.type === p.type));
      return next.length === prev.length && next.every((p: Embalage, i: number) => p.prix === prev[i]?.prix) ? prev : next;
    });
  }, [availablePackaging]);

  const availableDrinks = useMemo(
    () => {
      if (menu && (menu as any).drink && Array.isArray((menu as any).drink)) {
        return (menu as any).drink
          .filter((d: any) => d.name && d.name !== 'Aucune')
          .map((d: any) => new Boisson(d.name, d.prix || 0, d.rawPrice));
      }
      return [
        new Boisson("Coca Cola", 600),
        new Boisson("Djino", 700),
        new Boisson("Top Pamplemousse", 500),
        new Boisson("Planete Cocktail", 600),
        new Boisson("Vinto", 700),
      ];
    },
    [menu],
  );

  return { availablePackaging, availableDrinks };
};
