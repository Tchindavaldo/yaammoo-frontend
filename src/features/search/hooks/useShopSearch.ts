import axios from "axios";
import { useEffect, useMemo, useState } from "react";
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

/** Pages au plus (garde-fou) : le catalogue entier tient largement dedans. */
const MAX_PAGES = 20;

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
 * home n'est jamais touchée). Le catalogue ENTIER est chargé une fois à
 * l'ouverture (`GET /fastFood/all`, toutes les pages), puis filtré en local à
 * chaque frappe : plat, boutique, mots partiels, sans accents.
 *
 * ⚠️ Pas de `?q=` serveur : il ne cherche que dans le NOM des boutiques, donc
 * « poulet » ne trouvait aucun plat.
 */
export const useShopSearch = (query: string, categoryIndex: number) => {
  const [rows, setRows] = useState<SearchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const idToken = await getOptionalIdToken();
        const headers = idToken ? { Authorization: `Bearer ${idToken}` } : undefined;
        const all: any[] = [];
        let cursor: string | null = null;
        for (let page = 0; page < MAX_PAGES; page++) {
          const res: any = await axios.get(`${Config.apiUrl}/fastFood/all`, {
            headers,
            params: { limit: LIMIT, ...(cursor ? { cursor } : {}) },
          });
          if (cancelled) return;
          all.push(...listOf(res.data));
          // Lignes affichées dès la 1re page, complétées ensuite.
          setRows(toRows(all.map((ff: any) => normalizeFastFood(ff))));
          cursor = res.data?.nextCursor ?? null;
          if (!cursor) break;
        }
      } catch (e) {
        if (cancelled) return;
        console.warn("[search] echec", e);
        setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const results = useMemo(
    () =>
      rows.filter(
        (r) =>
          matchesCategory(r.title, categoryIndex) &&
          matchesQuery(r.title, r.shopName, query, r.description),
      ),
    [rows, categoryIndex, query],
  );

  return { results, loading, error };
};
