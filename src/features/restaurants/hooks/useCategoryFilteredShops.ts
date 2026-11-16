import { useMemo } from "react";
import { Dimensions } from "react-native";
import { Theme } from "@/src/theme";
import { FastFood } from "@/src/types";
import { DESIGN_CYCLE } from "../utils/designCycle";
import { categoryApiValue } from "./useHomeCategoryReload";

/** `designIndex` qui rend la carte V7 (aeree) dans le cycle des designs. */
const V7_INDEX = DESIGN_CYCLE.indexOf(7);

/** Carte V7 du natif (`HLLayout.card(7)`) + ecart entre cartes, en dp. */
const CARD_W = 150;
const CARD_GAP = 8;

/**
 * Plats par rangee : ceux qui tiennent a l'ecran + 1 qui depasse (on defile
 * pour le voir), plafonne a 4. Ex. 390 dp : 2 entiers + 1 coupe = 3.
 */
const perRow = () => {
  const usable = Dimensions.get("window").width - 2 * Theme.design.horizontalPadding;
  const full = Math.floor((usable + CARD_GAP) / (CARD_W + CARD_GAP));
  return Math.min(4, Math.max(2, full + 1));
};

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
 * toutes les boutiques sont regroupes par N (`perRow`) en rangees « grille »
 * (`gridRow`) : la liste native les rend en cartes V7, sans en-tete boutique
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
    const n = perRow();
    for (let i = 0; i < dishes.length; i += n) {
      const pair = dishes.slice(i, i + n);
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
