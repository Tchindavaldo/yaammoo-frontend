import type { HomeListHandle } from "@/modules/home-list";
import { afterPaint } from "@/src/utils/afterPaint";
import { useEffect, useRef, useState, type RefObject } from "react";

/** Retour sur « Tout » : squelettes au moins ce temps (images en memoire, sinon rien ne se verrait). */
const RETURN_SKELETON_MS = 500;
/** Reponse VIDE : le loader reste le temps que la liste pose, dessous, la page vide. */
const EMPTY_SETTLE_MS = 350;

type After = "none" | "skeleton" | "settle";
type Return = "idle" | "loading" | "done";

type Params = {
  /** Tab categorie ouvert (`null` = « Tout »). */
  category: string | null;
  /** Premier chargement, changement de ville ou de compte. */
  firstLoading: boolean;
  /** Boutiques recues (decide squelettes ou page vide). */
  shopCount: number;
  /** Premiere page de « Tout » (celle du pull-to-refresh). */
  refresh: () => Promise<void>;
  nativeListRef: RefObject<HomeListHandle | null>;
};

export type ToutView = {
  /** Loader « Recherche des meilleurs plats… » par-dessus la liste. */
  loader: boolean;
  /** Liste native en squelettes (vide, en chargement). */
  skeleton: boolean;
};

/**
 * Affichage de « Tout » pendant une requete : LOADER, puis squelettes
 * SEULEMENT si au moins une boutique est revenue.
 *
 * - Requete (premier chargement, ville, compte, retour depuis un tab
 *   categorie) : loader par-dessus ; dessous, la liste native est en
 *   squelettes et sa revelation remise a zero (`resetReveal`) : rien ne s'y voit.
 * - Au moins une boutique : le loader part, les boutiques sortent du haut vers
 *   le bas. Au retour d'un tab, squelettes `RETURN_SKELETON_MS` d'abord.
 * - Aucune boutique : la liste recoit la page vide SOUS le loader, qui part
 *   `EMPTY_SETTLE_MS` apres. Aucun squelette ne se montre (c'etait le flash).
 */
export function useToutLoader({
  category,
  firstLoading,
  shopCount,
  refresh,
  nativeListRef,
}: Params): ToutView {
  // Etats derives PENDANT le rendu (pas dans un effet) : un rendu de retard
  // montrerait « Tout » sans loader le temps d'une image.
  const [ret, setRet] = useState<Return>("idle");
  const [prevCategory, setPrevCategory] = useState(category);
  let retNow = ret;
  if (prevCategory !== category) {
    retNow = category ? "idle" : prevCategory ? "loading" : "idle";
    setPrevCategory(category);
    setRet(retNow);
  }

  const wanted = firstLoading || !!category || retNow === "loading";
  const [after, setAfter] = useState<After>("none");
  const [prevWanted, setPrevWanted] = useState(wanted);
  if (prevWanted !== wanted) {
    setPrevWanted(wanted);
    if (wanted) setAfter("none");
    else setAfter(shopCount === 0 ? "settle" : retNow === "done" ? "skeleton" : "none");
    if (!wanted && retNow === "done") setRet("idle");
  }

  // Retour sur « Tout » : premiere page rechargee sous le loader.
  useEffect(() => {
    if (ret !== "loading") return;
    let alive = true;
    void refresh()
      .catch(() => undefined)
      .then(() => {
        if (alive) setRet("done");
      });
    return () => {
      alive = false;
    };
  }, [ret, refresh]);

  // Une fois par loader, des que la liste native existe (elle peut monter
  // apres le debut du chargement : ecran de localisation au lancement). Une
  // fois le loader A L'ECRAN (`afterPaint`) : sinon le natif remonte la liste
  // une image avant lui.
  const resetDoneRef = useRef(false);
  const cancelResetRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!wanted) {
      resetDoneRef.current = false;
      cancelResetRef.current?.();
      cancelResetRef.current = null;
      return;
    }
    if (resetDoneRef.current || !nativeListRef.current) return;
    resetDoneRef.current = true;
    cancelResetRef.current = afterPaint(() => {
      cancelResetRef.current = null;
      void nativeListRef.current?.resetReveal();
    });
  });
  useEffect(() => () => cancelResetRef.current?.(), []);

  useEffect(() => {
    if (after === "none") return;
    const ms = after === "skeleton" ? RETURN_SKELETON_MS : EMPTY_SETTLE_MS;
    const timer = setTimeout(() => setAfter("none"), ms);
    return () => clearTimeout(timer);
  }, [after]);

  return { loader: wanted || after === "settle", skeleton: wanted || after === "skeleton" };
}
