import { useMemo } from "react";
import { FastFood } from "@/src/types";
import { DESIGN_CYCLE } from "../utils/designCycle";
import { categoryApiValue } from "./useHomeCategoryReload";

/** `designIndex` qui rend la carte V7 (aeree) dans le cycle des designs. */
const V7_INDEX = DESIGN_CYCLE.indexOf(7);

/**
 * Tab categorie actif : le filtre est fait par le BACKEND (`?category=`, plats
 * de la categorie seulement, cf. useHomeCategoryReload). Ici, chaque rangee
 * est seulement forcee sur le design V7 aere, le design item retenu pour le
 * home filtre. « Tout » = liste inchangee (cycle normal des designs).
 */
export const useCategoryFilteredShops = (
  fastFoods: FastFood[],
  selectedCategory: string,
): FastFood[] =>
  useMemo(() => {
    if (!categoryApiValue(selectedCategory)) return fastFoods;
    return fastFoods.map((ff) => ({ ...ff, designIndex: V7_INDEX }) as FastFood);
  }, [fastFoods, selectedCategory]);
