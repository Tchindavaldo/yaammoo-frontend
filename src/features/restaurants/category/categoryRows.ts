import { Image } from "react-native";
import type { CategoryListDish, CategoryListRow } from "@/modules/home-list/category";
import { getLanguage, t as tr } from "@/src/i18n";
import { FEE_FREE, shopDeliveryFeeLabel } from "../utils/shopDeliveryFee";
import {
  DELIVERY_ETA,
  feeText,
  isStockLow,
  stockParts,
  stockRatio,
} from "../components/designs/item/aere/labels";
import { dishIdOf, type DishGridRow, type GridDish } from "./dishGrid";

/**
 * Rangees de la grille -> records de la liste native categorie, DEJA prets a
 * afficher (prix formate, libelles du design aere, image de secours en URL) :
 * le natif n'a aucune regle metier. Fonctions pures.
 */

// `resolveAssetSource` n'existe pas sur web : ce module y est charge sans rendu.
const uri = (asset: number) => Image.resolveAssetSource?.(asset)?.uri ?? null;
const FALLBACK_IMAGE = uri(require("@/assets/images/burger1-nobackground1.webp"));

const toDish = (d: GridDish): CategoryListDish => {
  const m = d.menu;
  // Livraison reelle de la boutique du plat : offerte, ou son tarif le moins cher.
  const fee = shopDeliveryFeeLabel(d.shop);
  const stock = Math.round(m?.stock ?? 0);
  const { value, unit } = stockParts(stock);
  return {
    id: dishIdOf(d),
    title: m?.titre ?? "",
    image: m?.image || null,
    fallbackImage: FALLBACK_IMAGE,
    price: `${m?.prix1 ?? 0} F`,
    rating: (m?.votes ?? 0) > 0 ? String(m?.rating ?? 0) : tr("Nouveau"),
    votes: Math.round(m?.votes ?? 0),
    stockValue: value,
    stockUnit: unit,
    stockLow: isStockLow(stock),
    stockRatio: stockRatio(stock),
    feeText: feeText(fee),
    feeFree: fee === FEE_FREE,
    eta: DELIVERY_ETA,
  };
};

/**
 * Cache de records PAR LISTE : une rangee inchangee (memes plats, meme langue)
 * garde la meme reference, et `updateRows` n'envoie que ce qui a bouge.
 */
export const createCategoryRowCache = () => {
  const cache = new Map<string, { dishes: GridDish[]; lang: string; row: CategoryListRow }>();
  return {
    rowFor: (r: DishGridRow): CategoryListRow => {
      const lang = getLanguage();
      const c = cache.get(r.id);
      if (
        c &&
        c.lang === lang &&
        c.dishes.length === r.dishes.length &&
        c.dishes.every((d, i) => d === r.dishes[i])
      ) {
        return c.row;
      }
      const row = { id: r.id, dishes: r.dishes.map(toDish) };
      cache.set(r.id, { dishes: r.dishes, lang, row });
      return row;
    },
    clear: () => cache.clear(),
  };
};
