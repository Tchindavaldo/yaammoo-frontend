import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { Config } from "@/src/api/config";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { DraftPrice } from "../recap-designs/MenuDraft.types";
import { t as tr } from "@/src/i18n";

/** Réponse de `GET /menu/price-preview/:fastFoodId` (calcul 100 % serveur). */
export interface MenuPricePreview {
  price: number;
  displayedPrice: number;
  withdrawalFee: number;
  merchantReceives: number;
  accepted: boolean;
  message: string | null;
}

/** Résultat de la vérification groupée (bouton « Suivant »). */
export interface PriceCheckResult {
  ok: boolean;
  /** Index du premier prix refusé (onglet à afficher). */
  firstBad: number;
  /** Message du toast : un prix refusé = son message ; plusieurs = une ligne par prix. */
  message: string | null;
}

const num = (raw?: string) => Number(raw);
/** `loadingIdx` : index du prix (bouton ✓), ou vérification groupée. */
export const LOADING_NEXT = -1;
export const LOADING_INIT = -2;
const valid = (n: number) => Number.isFinite(n) && n > 0;

/**
 * Vérification des prix du menu, à la demande (plus de requête pendant la frappe) :
 * - `checkOne(idx)` : bouton ✓ d'un prix ;
 * - `checkAll()` : bouton « Suivant », tous les prix en UNE requête (`?prices=`).
 * Un prix est « validé » tant que l'aperçu reçu porte encore le prix saisi et
 * qu'il est accepté : modifier le montant le dévalide. Rien n'est recalculé
 * dans l'app (R23) : on relaie la réponse du backend.
 */
export function useMenuPriceCheck(prices: DraftPrice[]) {
  const { userData } = useAuth();
  const fastFoodId = userData?.fastFoodId;
  const [previews, setPreviews] = useState<(MenuPricePreview | null)[]>([]);
  const [loadingIdx, setLoadingIdx] = useState<number | null>(null);

  const url = `${Config.apiUrl}/menu/price-preview/${fastFoodId}`;

  /** Aperçu encore valable pour le montant saisi (sinon null). */
  const previewAt = (idx: number): MenuPricePreview | null => {
    const p = previews[idx];
    return p && p.price === num(prices[idx]?.price) ? p : null;
  };

  const isValidated = (idx: number) => !!previewAt(idx)?.accepted;

  const store = (entries: [number, MenuPricePreview | null][]) =>
    setPreviews((prev) => {
      const next = [...prev];
      entries.forEach(([i, p]) => (next[i] = p));
      return next;
    });

  const checkOne = useCallback(
    async (idx: number): Promise<MenuPricePreview | null> => {
      const price = num(prices[idx]?.price);
      if (!valid(price) || !fastFoodId) return null;
      setLoadingIdx(idx);
      try {
        const res = await axios.get(url, { params: { price } });
        const p: MenuPricePreview | null = res.data?.data ?? null;
        store([[idx, p]]);
        return p;
      } catch {
        return null;
      } finally {
        setLoadingIdx(null);
      }
    },
    [prices, fastFoodId, url],
  );

  /**
   * Vérifie tous les prix renseignés. Seuls les prix sans aperçu valable sont
   * demandés (en une requête) ; si tout est déjà vérifié, aucune requête.
   * `mode` : "next" = bouton Suivant (spinner sur le bouton seulement),
   * "init" = ouverture d'un menu existant (spinner sur les cartes).
   */
  const checkAll = useCallback(
    async (mode: "next" | "init" = "next"): Promise<PriceCheckResult | null> => {
      const idxs = prices.map((_, i) => i).filter((i) => valid(num(prices[i].price)));
      const known = new Map<number, MenuPricePreview>();
      idxs.forEach((i) => {
        const p = previewAt(i);
        if (p) known.set(i, p);
      });
      const missing = idxs.filter((i) => !known.has(i));
      if (missing.length && fastFoodId) {
        setLoadingIdx(mode === "init" ? LOADING_INIT : LOADING_NEXT);
        try {
          const res = await axios.get(url, {
            params: { prices: missing.map((i) => num(prices[i].price)).join(",") },
          });
          const items: (MenuPricePreview | null)[] = res.data?.items ?? [];
          store(missing.map((i, k) => [i, items[k] ?? null]));
          missing.forEach((i, k) => items[k] && known.set(i, items[k]!));
        } catch {
          return null;
        } finally {
          setLoadingIdx(null);
        }
      }
      const bad = idxs.filter((i) => known.get(i) && !known.get(i)!.accepted);
      if (!bad.length) return { ok: true, firstBad: -1, message: null };
      const msgOf = (i: number) => known.get(i)?.message || "";
      const message =
        bad.length === 1
          ? msgOf(bad[0])
          : bad
              .map((i) => `${tr("Prix {{a}}", { a: i + 1 })} : ${msgOf(i)}`)
              .join("\n");
      return { ok: false, firstBad: bad[0], message };
    },
    [prices, previews, fastFoodId, url],
  );

  // Menu existant ouvert : ses prix sont vérifiés dès qu'ils sont posés.
  const prefetch = useRef(false);
  const prefetchOnNextPrices = () => {
    prefetch.current = true;
  };
  useEffect(() => {
    if (!prefetch.current) return;
    prefetch.current = false;
    checkAll("init");
  }, [prices]);

  /** Spinner des cartes : bouton ✓ du prix affiché, ou ouverture du menu. */
  const cardLoading = (idx: number) =>
    loadingIdx === idx || loadingIdx === LOADING_INIT;

  /** Retrait d'un prix : décale les aperçus des prix suivants. */
  const removeAt = (idx: number) =>
    setPreviews((prev) => prev.filter((_, i) => i !== idx));

  return {
    previewAt,
    isValidated,
    checkOne,
    checkAll,
    removeAt,
    loadingIdx,
    prefetchOnNextPrices,
    cardLoading,
  };
}
