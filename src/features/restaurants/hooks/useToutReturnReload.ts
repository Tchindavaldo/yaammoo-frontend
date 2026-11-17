import type { HomeListHandle } from "@/modules/home-list";
import { useEffect, useRef, useState, type RefObject } from "react";

/** Squelettes visibles au moins ce temps au retour sur « Tout » (comme les tabs categorie). */
const RETURN_HOLD_MS = 500;

type Params = {
  /** Tab categorie ouvert (`null` = « Tout »). */
  category: string | null;
  /** Premiere page de « Tout » rechargee (celle du pull-to-refresh). */
  refresh: () => Promise<void>;
  nativeListRef: RefObject<HomeListHandle | null>;
};

/**
 * Retour sur « Tout » depuis un tab categorie : requete automatique, en
 * squelettes (banniere + rangees), comme a chaque changement de tab categorie.
 *
 * - Tab categorie ouvert : « Tout » est MASQUE (le home lui envoie une liste
 *   vide en chargement, donc des squelettes, invisibles sous le tab) et sa
 *   revelation est remise a zero, liste en haut (`resetReveal`).
 * - Retour sur « Tout » : premiere page rechargee ; les squelettes restent au
 *   moins `RETURN_HOLD_MS`, puis banniere et boutiques sortent en fondu, du
 *   haut vers le bas (natif).
 *
 * Renvoie `true` tant que « Tout » doit rester masque.
 */
export function useToutReturnReload({ category, refresh, nativeListRef }: Params): boolean {
  const [masked, setMasked] = useState(false);
  const genRef = useRef(0);
  const prevRef = useRef(category);

  useEffect(() => {
    const was = prevRef.current;
    prevRef.current = category;
    if (category && !was) {
      // Un retour en cours est abandonne : « Tout » reste masque.
      genRef.current += 1;
      setMasked(true);
      void nativeListRef.current?.resetReveal();
      return;
    }
    if (!category && was) {
      const gen = ++genRef.current;
      const startedAt = Date.now();
      void refresh()
        .catch(() => undefined)
        .then(() => {
          const wait = Math.max(0, RETURN_HOLD_MS - (Date.now() - startedAt));
          setTimeout(() => {
            if (genRef.current === gen) setMasked(false);
          }, wait);
        });
    }
  }, [category, refresh, nativeListRef]);

  return masked;
}
