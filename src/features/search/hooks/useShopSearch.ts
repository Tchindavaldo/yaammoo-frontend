import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Config } from "@/src/api/config";
import { getOptionalIdToken } from "@/src/services/idToken";
import { normalizeFastFood } from "@/src/features/restaurants/utils/normalizeFastFood";
import { Menu } from "@/src/types";
import { matchesCategory, matchesQuery } from "../utils/searchFilters";

const LIMIT = 50;

/** Une ligne de résultat = un plat, avec sa boutique. Gabarit unique. */
export interface SearchRow {
  key: string;
  title: string;
  /** Description du plat (recherche plein texte). */
  description: string;
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
      description: String(m.description || m.desc || ""),
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

const DEBOUNCE_MS = 300;

const listOf = (data: any): any[] =>
  Array.isArray(data?.fastFoods)
    ? data.fastFoods
    : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data)
        ? data
        : [];

/**
 * Recherche de la page dédiée : indépendante du FastFoodContext (la liste du
 * home n'est jamais touchée). Recherche SERVEUR `GET /fastFood/all?q=`
 * (debounce 300 ms, page de 50, suite par curseur avec `loadMore`) : le
 * backend renvoie les boutiques dont le nom OU un plat correspond. Le filtre
 * local ne fait que ne garder, dans ces boutiques, que les plats concernés
 * (et la catégorie choisie).
 */
export const useShopSearch = (query: string, categoryIndex: number, shopId?: string | null) => {
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const cursorRef = useRef<string | null>(null);
  const runRef = useRef(0);
  const [shopName, setShopName] = useState("");
  const q = query.trim();

  const fetchPage = useCallback(
    async (run: number, cursor: string | null) => {
      const idToken = await getOptionalIdToken();
      const res: any = await axios.get(`${Config.apiUrl}/fastFood/all`, {
        headers: idToken ? { Authorization: `Bearer ${idToken}` } : undefined,
        // Boutique scannee (QR) : `?ids=` renvoie cette seule boutique, avec ses plats.
        params: shopId
          ? { ids: shopId }
          : { limit: LIMIT, ...(q ? { q } : {}), ...(cursor ? { cursor } : {}) },
      });
      if (run !== runRef.current) return null;
      cursorRef.current = res.data?.nextCursor ?? null;
      const list = listOf(res.data).map((ff: any) => normalizeFastFood(ff));
      if (shopId) setShopName(String(list[0]?.nom ?? ""));
      return list;
    },
    [q, shopId],
  );

  const prevShopRef = useRef<string | null | undefined>(shopId);

  useEffect(() => {
    const run = ++runRef.current;
    // Autre boutique scannee : on vide TOUT de suite l'ancien resultat (plats et
    // nom) et on affiche le loader, sans attendre la reponse.
    if (prevShopRef.current !== shopId) {
      prevShopRef.current = shopId;
      setShops([]);
      setShopName("");
      setLoading(true);
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(false);
      cursorRef.current = null;
      try {
        const page = await fetchPage(run, null);
        if (page) setShops(page);
      } catch (e) {
        if (run !== runRef.current) return;
        console.warn("[search] echec", e);
        setError(true);
        setShops([]);
      } finally {
        if (run === runRef.current) setLoading(false);
      }
    }, q ? DEBOUNCE_MS : 0);
    return () => clearTimeout(timer);
  }, [q, shopId, fetchPage]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !cursorRef.current) return;
    const run = runRef.current;
    setLoadingMore(true);
    try {
      const page = await fetchPage(run, cursorRef.current);
      if (page) setShops((prev) => [...prev, ...page]);
    } catch (e) {
      console.warn("[search] page suivante", e);
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, fetchPage]);

  const results = useMemo(
    () =>
      toRows(shops).filter(
        (r) =>
          matchesCategory(r.title, categoryIndex) &&
          matchesQuery(r.title, r.shopName, query, r.description),
      ),
    [shops, categoryIndex, query],
  );

  return { results, loading, loadingMore, error, loadMore, shopName };
};
