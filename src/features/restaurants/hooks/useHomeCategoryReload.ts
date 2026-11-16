import { Dispatch, MutableRefObject, SetStateAction, useEffect, useRef } from "react";
import { FastFood } from "@/src/types";
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

/**
 * Tab categorie change : la valeur API est posee dans `categoryRef` (lue par
 * chaque requete de `useFastFoodFetch`), puis le home recharge depuis la
 * premiere page, liste videe (meme parcours que le changement de ville).
 */
export const useHomeCategoryReload = ({
  selectedCategory,
  categoryRef,
  refresh,
  setLoading,
  setFastFoods,
}: {
  selectedCategory: string;
  categoryRef: MutableRefObject<string | null>;
  refresh: () => Promise<void>;
  setLoading: (v: boolean) => void;
  setFastFoods: Dispatch<SetStateAction<FastFood[]>>;
}) => {
  const value = categoryApiValue(selectedCategory);
  const firstRef = useRef(true);
  useEffect(() => {
    if (firstRef.current) {
      firstRef.current = false;
      categoryRef.current = value;
      return;
    }
    if (categoryRef.current === value) return;
    categoryRef.current = value;
    setLoading(true);
    setFastFoods([]);
    void refresh();
  }, [value, categoryRef, refresh, setLoading, setFastFoods]);
};
