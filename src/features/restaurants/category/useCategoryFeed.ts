import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Config } from "@/src/api/config";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { getOptionalIdToken } from "@/src/services/idToken";
import type { FastFood } from "@/src/types";
import { useFastFoodContext } from "../context/FastFoodContext";
import { normalizeFastFood } from "../utils/normalizeFastFood";
import { categoryParams } from "./categoryApi";
import { buildDishGrid, dishesPerRow, type DishGridRow } from "./dishGrid";

export type CategoryFeed = {
  /** Change a chaque tab, ville ou compte : la liste native repart a zero. */
  feedKey: string;
  rows: DishGridRow[];
  /** Premiere page en cours (squelettes). */
  loading: boolean;
  hasMore: boolean;
  /** Premiere page en echec : liste vide + message. */
  error: boolean;
  refreshing: boolean;
  loadMore: () => void;
  refresh: () => Promise<void>;
};

type FeedState = {
  key: string;
  shops: FastFood[];
  hasMore: boolean;
  loading: boolean;
  error: boolean;
};

const NO_SHOPS: FastFood[] = [];

/**
 * Plats d'UN tab categorie : requetes et pagination PROPRES
 * (`GET /fastFood/all?category=`), rien de partage avec la liste « Tout »
 * (`FastFoodContext`). Changer de tab ne vide, ne recharge et ne bloque
 * JAMAIS « Tout » (ni sa pagination, ni ses verrous de page).
 *
 * - Etat porte par `key` (tab + ville + compte) : au rendu ou le tab change,
 *   l'ancien tab n'est deja plus servi (pas un instant de l'ancienne grille).
 * - `genRef` : une reponse arrivee apres un changement de tab ou un
 *   rafraichissement est ignoree, et ses verrous sont liberes tout de suite.
 */
export function useCategoryFeed(category: string): CategoryFeed {
  const { user } = useAuth();
  const { homeCity, homeSettings } = useFastFoodContext();
  const key = `${category}|${homeCity.city ?? ""}|${user?.uid ?? ""}`;
  const [feed, setFeed] = useState<FeedState>({
    key: "",
    shops: NO_SHOPS,
    hasMore: false,
    loading: true,
    error: false,
  });
  const [refreshing, setRefreshing] = useState(false);
  const genRef = useRef(0);
  const cursorRef = useRef<string | null>(null);
  const moreInFlightRef = useRef(false);
  const pageSizeRef = useRef(homeSettings.pageSize);
  pageSizeRef.current = homeSettings.pageSize;
  const stale = feed.key !== key;
  const loadingRef = useRef(true);
  loadingRef.current = stale || feed.loading;
  const { cityRef, cityReady } = homeCity;

  /** Une page du tab (premiere si `cursor` est nul), deja normalisee. */
  const fetchPage = useCallback(
    async (cursor: string | null) => {
      // Route publique a auth optionnelle : le Bearer resout les offres de
      // livraison du compte (`deliveryOffer`), comme pour « Tout ».
      const idToken = await getOptionalIdToken();
      await cityReady.current;
      const response = await axios.get(`${Config.apiUrl}/fastFood/all`, {
        headers: idToken ? { Authorization: `Bearer ${idToken}` } : undefined,
        params: {
          limit: pageSizeRef.current,
          ...(cursor ? { cursor } : {}),
          ...(cityRef.current ? { city: cityRef.current } : {}),
          ...categoryParams(category),
        },
      });
      const raw: any[] = Array.isArray(response.data?.data) ? response.data.data : [];
      return {
        shops: raw.filter((x) => x?.id).map((x, i) => normalizeFastFood(x, i % 6)) as FastFood[],
        next: (response.data?.nextCursor ?? null) as string | null,
      };
    },
    [category, cityRef, cityReady],
  );

  // Nouveau tab (ou ville, ou compte) : on repart de la premiere page.
  useEffect(() => {
    const gen = ++genRef.current;
    cursorRef.current = null;
    moreInFlightRef.current = false;
    setRefreshing(false);
    setFeed({ key, shops: NO_SHOPS, hasMore: false, loading: true, error: false });
    fetchPage(null)
      .then((page) => {
        if (gen !== genRef.current) return;
        cursorRef.current = page.next;
        setFeed({ key, shops: page.shops, hasMore: !!page.next, loading: false, error: false });
      })
      .catch((err) => {
        if (gen !== genRef.current) return;
        console.error("[category] premiere page", err);
        setFeed({ key, shops: NO_SHOPS, hasMore: false, loading: false, error: true });
      });
  }, [key, fetchPage]);

  const loadMore = useCallback(() => {
    const cursor = cursorRef.current;
    if (moreInFlightRef.current || !cursor || loadingRef.current) return;
    const gen = genRef.current;
    moreInFlightRef.current = true;
    fetchPage(cursor)
      .then((page) => {
        if (gen !== genRef.current) return;
        cursorRef.current = page.next;
        // Dedup : une boutique deja recue (page qui chevauche) n'est pas doublee.
        setFeed((f) => {
          const seen = new Set(f.shops.map((s) => String(s.id)));
          const fresh = page.shops.filter((s) => !seen.has(String(s.id)));
          return { ...f, shops: fresh.length ? [...f.shops, ...fresh] : f.shops, hasMore: !!page.next };
        });
      })
      .catch((err) => {
        if (gen === genRef.current) console.error("[category] page suivante", err);
      })
      .finally(() => {
        if (gen === genRef.current) moreInFlightRef.current = false;
      });
  }, [fetchPage]);

  /** Pull-to-refresh : contenu garde a l'ecran jusqu'a la reponse (pas de squelette). */
  const refresh = useCallback(async () => {
    const gen = ++genRef.current;
    moreInFlightRef.current = false;
    setRefreshing(true);
    try {
      const page = await fetchPage(null);
      if (gen !== genRef.current) return;
      cursorRef.current = page.next;
      setFeed((f) => ({ ...f, shops: page.shops, hasMore: !!page.next, loading: false, error: false }));
    } catch (err) {
      if (gen === genRef.current) console.error("[category] rafraichissement", err);
    } finally {
      if (gen === genRef.current) setRefreshing(false);
    }
  }, [fetchPage]);

  const perRow = useMemo(dishesPerRow, []);
  const shops = stale ? NO_SHOPS : feed.shops;
  const rows = useMemo(() => buildDishGrid(shops, perRow), [shops, perRow]);

  return {
    feedKey: key,
    rows,
    loading: stale || feed.loading,
    hasMore: !stale && feed.hasMore,
    error: !stale && feed.error,
    refreshing,
    loadMore,
    refresh,
  };
}
