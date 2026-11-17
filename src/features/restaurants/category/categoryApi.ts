import { CATEGORIES } from "../utils/homeListConfig";

/**
 * Valeur envoyee au backend (`?category=`) pour chaque tab du home, par
 * POSITION dans `CATEGORIES` (le nom affiche est traduit). `null` = « Tout ».
 * Comparee sans casse a `menus.category` (saisie libre du marchand).
 */
const NAMED = ["Poulet", "Burger", "Pizza"];
/** « Autre » : plats sans categorie ou hors de `NAMED` (`?categoryNot=`). */
export const OTHER = "__autre";
const CATEGORY_API: (string | null)[] = [null, ...NAMED, OTHER];

export const categoryApiValue = (selected: string): string | null => {
  const idx = CATEGORIES.findIndex((c) => c.name === selected);
  return idx > 0 ? (CATEGORY_API[idx] ?? null) : null;
};

/** Parametres de requete du tab actif. */
export const categoryParams = (value: string | null) =>
  !value ? {} : value === OTHER ? { categoryNot: NAMED.join(",") } : { category: value };
