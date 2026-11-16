import { useMemo } from "react";
import { FastFood } from "@/src/types";
import { matchesCategory } from "@/src/features/search/utils/searchFilters";
import { CATEGORIES } from "../utils/homeListConfig";

/**
 * Filtre catégorie du home (tabs du header) : garde les plats dont le nom
 * correspond à la catégorie (mêmes mots-clés que la page de recherche) et
 * retire les boutiques sans plat correspondant. « Tout » = liste inchangée.
 */
export const useCategoryFilteredShops = (
  fastFoods: FastFood[],
  selectedCategory: string,
): FastFood[] =>
  useMemo(() => {
    const idx = CATEGORIES.findIndex((c) => c.name === selectedCategory);
    if (idx <= 0) return fastFoods;
    return fastFoods
      .map((ff: any) => ({
        ...ff,
        menu: (ff.menu ?? []).filter((m: any) => matchesCategory(m.titre ?? "", idx)),
      }))
      .filter((ff: any) => ff.menu.length > 0);
  }, [fastFoods, selectedCategory]);
