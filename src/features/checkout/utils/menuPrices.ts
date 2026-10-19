import { Menu } from "@/src/types";

/**
 * Prix d'un plat, en nombre VARIABLE (N lignes `prices[]` du backend).
 *
 * `index` est 1-based, comme `selectedPriceIndex` (1 = premier prix). Les
 * menus sans `prices[]` (anciennes données, menu synthétisé) retombent sur les
 * champs aplatis `prix1..3` / `optionPrix1..3` / `rawPrice1..3`.
 *
 * Utilitaire pur, partagé (R16) : pas de rendu.
 */
export interface MenuPriceOption {
  index: number;
  price: number;
  description: string;
  rawPrice?: number;
}

export const menuPriceOptions = (menu: Menu | null | undefined): MenuPriceOption[] => {
  if (!menu) return [];
  const m = menu as any;
  const raw: { price?: number; description?: string; rawPrice?: number }[] =
    Array.isArray(m.prices) && m.prices.length > 0
      ? m.prices
      : [
          { price: m.prix1, description: m.optionPrix1, rawPrice: m.rawPrice1 },
          { price: m.prix2, description: m.optionPrix2, rawPrice: m.rawPrice2 },
          { price: m.prix3, description: m.optionPrix3, rawPrice: m.rawPrice3 },
        ];
  return raw
    .map((p, i) => ({
      index: i + 1,
      price: Number(p?.price) || 0,
      description: p?.description || "",
      ...(p?.rawPrice != null && { rawPrice: p.rawPrice }),
    }))
    .filter((p) => p.index === 1 || p.price > 0);
};

/** Prix retenu pour un index (1-based) ; repli sur le premier prix. */
export const menuPriceAt = (
  menu: Menu | null | undefined,
  index: number,
): MenuPriceOption | undefined => {
  const options = menuPriceOptions(menu);
  return options.find((p) => p.index === index) || options[0];
};

/** Description du prix sélectionné ("" si absente). */
export const menuPriceDescription = (menu: Menu | null | undefined, index: number) =>
  menuPriceOptions(menu).find((p) => p.index === index)?.description || "";
