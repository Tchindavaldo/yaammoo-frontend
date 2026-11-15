import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import { Config } from "@/src/api/config";
import { getOptionalIdToken } from "@/src/services/idToken";
import { normalizeFastFood } from "@/src/features/restaurants/utils/normalizeFastFood";
import { Menu } from "@/src/types";
import { matchesCategory, matchesQuery } from "../utils/searchFilters";

const DEBOUNCE_MS = 300;
const LIMIT = 50;

/** Une ligne de résultat = un plat, avec sa boutique. Gabarit unique. */
export interface SearchRow {
  key: string;
  title: string;
  shopName: string;
  image: string;
  price: number;
  available: boolean;
  /** Menu enrichi des infos de livraison de la boutique, prêt pour le checkout. */
  menu: Menu;
}

/** Aplatis les boutiques en plats, avec le même enrichissement que le home. */
const toRows = (shops: any[]): SearchRow[] =>
  shops.flatMap((ff) =>
    (ff.menu ?? []).map((m: any, i: number) => ({
      key: `${ff.id}:${m.id ?? i}`,
      title: m.titre,
      shopName: ff.nom,
      image: m.image || ff.image || "",
      price: Number(m.prix1) || 0,
      available: m.disponibilite === "available",
      menu: {
        ...m,
        deliveryHours: ff.deliveryHours,
        orderLeadTime: ff.orderLeadTime,
        advanceDays: ff.advanceDays,
        deliveryOffer: ff.deliveryOffer ?? null,
        pickupAllowed: ff.pickupAllowed,
      } as Menu,
    })),
  );

/**
 * Recherche de la page dédiée : indépendante du FastFoodContext (la liste du
 * home n'est jamais touchée). Requête serveur `GET /fastFood/all?q=` debouncée,
 * puis filtre local (saisie + catégorie) sur les plats.
 */
export const useShopSearch = (query: string, categoryIndex: number) => {
  const [rows, setRows] = useState<SearchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const runRef = useRef(0);

  useEffect(() => {
    const run = ++runRef.current;
    const q = query.trim();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        const idToken = await getOptionalIdToken();
        const res = await axios.get(`${Config.apiUrl}/fastFood/all`, {
          headers: idToken ? { Authorization: `Bearer ${idToken}` } : undefined,
          params: { limit: LIMIT, ...(q ? { q } : {}) },
        });
        if (run !== runRef.current) return;
        const list = Array.isArray(res.data?.fastFoods)
          ? res.data.fastFoods
          : Array.isArray(res.data?.data)
            ? res.data.data
            : Array.isArray(res.data)
              ? res.data
              : [];
        setRows(toRows(list.map((ff: any) => normalizeFastFood(ff))));
      } catch (e) {
        if (run !== runRef.current) return;
        console.warn("[search] echec", e);
        setError(true);
        setRows([]);
      } finally {
        if (run === runRef.current) setLoading(false);
      }
    }, q ? DEBOUNCE_MS : 0);
    return () => clearTimeout(timer);
  }, [query]);

  const results = useMemo(
    () =>
      rows.filter(
        (r) =>
          matchesCategory(r.title, categoryIndex) &&
          matchesQuery(r.title, r.shopName, query),
      ),
    [rows, categoryIndex, query],
  );

  return { results, loading, error };
};
