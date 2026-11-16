import { useMemo } from "react";
import { FastFood } from "@/src/types";
import { DESIGN_CYCLE } from "../utils/designCycle";
import { categoryApiValue } from "./useHomeCategoryReload";

/** `designIndex` qui rend la carte V7 (aeree) dans le cycle des designs. */
const V7_INDEX = DESIGN_CYCLE.indexOf(7);

/** Champs de livraison de la boutique, recopies sur chaque plat de la grille. */
const SHOP_FIELDS = [
  "deliveryHours",
  "expressZones",
  "orderLeadTime",
  "advanceDays",
  "deliveryOffer",
  "pickupAllowed",
  "openTime",
  "closeTime",
  "deliveryFees",
  "deliveryMode",
] as const;

/**
 * Tab categorie actif : le filtre est fait par le BACKEND (`?category=`, plats
 * de la categorie seulement, cf. useHomeCategoryReload). Ici, les plats de
 * toutes les boutiques sont regroupes PAR 2 en rangees « grille » (`gridRow`) :
 * la liste native les rend en 2 cartes V7 cote a cote, sans en-tete boutique
 * (design `HL_GRID` = 8, `modules/home-list`). Chaque plat garde sa boutique
 * (`__shop`) pour l'appui et les frais de livraison.
 * « Tout » = liste inchangee (une rangee par boutique, cycle des designs).
 */
export const useCategoryFilteredShops = (
  fastFoods: FastFood[],
  selectedCategory: string,
): FastFood[] =>
  useMemo(() => {
    if (!categoryApiValue(selectedCategory)) return fastFoods;
    const dishes: any[] = [];
    for (const ff of fastFoods as any[]) {
      // Fantomes de pagination (pas encore de plats) : ignores en grille.
      for (const m of ff.menu ?? []) dishes.push({ ...m, __shop: ff });
    }
    const rows: FastFood[] = [];
    for (let i = 0; i < dishes.length; i += 2) {
      const pair = dishes.slice(i, i + 2);
      const first = pair[0].__shop;
      const row: any = {
        ...first,
        id: `grid:${pair.map((m) => m.id ?? "").join(":")}`,
        nom: "",
        menu: pair,
        gridRow: true,
        designIndex: V7_INDEX,
      };
      for (const k of SHOP_FIELDS) row[k] = first[k];
      rows.push(row as FastFood);
    }
    return rows;
  }, [fastFoods, selectedCategory]);
