import { Dimensions } from "react-native";
import { Theme } from "@/src/theme";
import { FastFood, Menu } from "@/src/types";
import { DESIGN_CYCLE } from "../utils/designCycle";

/**
 * Grille des tabs categorie : les plats de toutes les boutiques recues (le
 * backend ne renvoie que ceux de la categorie) regroupes par N en rangees.
 * Fonctions pures, sans rendu.
 */

/** Plat de la grille : le menu + SA boutique (appui, frais de livraison). */
export type GridDish = { menu: any; shop: FastFood };
export type DishGridRow = { id: string; dishes: GridDish[] };

/** Carte V7 de la grille + ecart entre cartes, en dp (`HLCLayout`). */
const CARD_W = 150;
const CARD_GAP = 8;

/**
 * Plats par rangee : ceux qui tiennent a l'ecran + 1 qui depasse (on defile
 * pour le voir), plafonne a 4. Ex. 390 dp : 2 entiers + 1 coupe = 3.
 */
export const dishesPerRow = () => {
  const usable = Dimensions.get("window").width - 2 * Theme.design.horizontalPadding;
  const full = Math.floor((usable + CARD_GAP) / (CARD_W + CARD_GAP));
  return Math.min(4, Math.max(2, full + 1));
};

/** Identifiant du plat dans la grille (appui, cle de rangee). */
export const dishIdOf = (d: GridDish) => String(d.menu?.id ?? `${d.shop?.id}_${d.menu?.titre ?? ""}`);

/**
 * Menu passe a la commande : celui du plat, enrichi des infos de livraison de
 * SA boutique (comme `NativeHomeList.handleMenuPress`).
 */
export const dishToMenu = (d: GridDish): Menu => {
  const ff: any = d.shop;
  return {
    ...d.menu,
    deliveryHours: ff?.deliveryHours,
    expressZones: ff?.expressZones ?? [],
    orderLeadTime: ff?.orderLeadTime,
    advanceDays: ff?.advanceDays,
    deliveryOffer: ff?.deliveryOffer ?? null,
    pickupAllowed: ff?.pickupAllowed,
    openTime: ff?.openTime,
    closeTime: ff?.closeTime,
  } as Menu;
};

// Un plat garde la MEME reference tant que son menu (objet normalise) et sa
// boutique ne changent pas : une page ajoutee ne renvoie au natif que ses rangees.
const dishCache = new WeakMap<object, GridDish>();
const dishOf = (menu: any, shop: FastFood): GridDish => {
  let d = dishCache.get(menu);
  if (!d || d.shop !== shop) {
    d = { menu, shop };
    dishCache.set(menu, d);
  }
  return d;
};

export const buildDishGrid = (shops: FastFood[], perRow: number): DishGridRow[] => {
  const dishes: GridDish[] = [];
  for (const ff of shops as any[]) {
    for (const m of ff?.menu ?? []) if (m) dishes.push(dishOf(m, ff));
  }
  const rows: DishGridRow[] = [];
  for (let i = 0; i < dishes.length; i += perRow) {
    const slice = dishes.slice(i, i + perRow);
    rows.push({ id: `grid:${slice.map(dishIdOf).join(":")}`, dishes: slice });
  }
  return rows;
};

/** `designIndex` qui rend la carte V7 (aeree) dans le cycle des designs. */
const V7_INDEX = DESIGN_CYCLE.indexOf(7);

/**
 * Repli (build sans liste categorie native, ou sans liste native du tout) :
 * rangees au format « boutique » que lisent `NativeHomeList` (design grille 8)
 * et la FlashList. Chaque plat porte sa boutique (`__shop`).
 */
export const toLegacyGridRows = (rows: DishGridRow[]): FastFood[] =>
  rows.map((r) => {
    const first: any = r.dishes[0]?.shop ?? {};
    return {
      ...first,
      id: r.id,
      nom: "",
      menu: r.dishes.map((d) => ({ ...d.menu, __shop: d.shop })),
      gridRow: true,
      designIndex: V7_INDEX,
    } as FastFood;
  });
