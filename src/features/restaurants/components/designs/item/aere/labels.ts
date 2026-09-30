/**
 * Libelles et seuils communs aux cartes aerees (4 / 5 / 7). Fonctions pures,
 * reprises telles quelles par la liste native (`NativeHomeList` les envoie
 * deja calcules) : une seule regle d'affichage pour les deux listes.
 */

/** Frais en toutes lettres apres « Livraison » (« gratuite », « 300F »). */
export const feeText = (label: string) => (label === "gratuit" ? "gratuite" : label);

/** Delai de livraison affiche (maquette) : le meme sur toutes les cartes. */
export const DELIVERY_ETA = "30min";

/** Sous ce stock, urgence : « Plus que N plats » et jauge rouge. */
export const STOCK_LOW = 5;

/** Jauge pleine a partir de ce stock : elle ne se vide qu'en fin de stock. */
export const STOCK_GAUGE_MAX = 20;

export const isStockLow = (stock: number) => stock < STOCK_LOW;

/** Remplissage de la jauge de stock, entre 0 et 1. */
export const stockRatio = (stock: number) =>
  Math.min(Math.max(stock, 0), STOCK_GAUGE_MAX) / STOCK_GAUGE_MAX;

/** Stock en 2 morceaux (valeur mise en avant + unite), meme libelle partout. */
export const stockParts = (stock: number) => {
  if (stock <= 0) return { value: "Épuisé", unit: "" };
  const unit = stock > 1 ? "plats" : "plat";
  return isStockLow(stock)
    ? { value: `Plus que ${stock}`, unit }
    : { value: `${stock}`, unit: `${unit} dispo` };
};

export const stockLabel = (stock: number) => {
  const { value, unit } = stockParts(stock);
  return unit ? `${value} ${unit}` : value;
};
