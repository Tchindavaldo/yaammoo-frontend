import { useEffect, useState } from "react";

/** Reponse VIDE : le loader reste le temps que la liste pose, dessous, la page vide. */
const EMPTY_SETTLE_MS = 350;

/**
 * Loader d'un tab categorie : pendant la premiere page du tab, puis squelettes
 * SEULEMENT si au moins un plat est revenu. Sans plat, la liste recoit la page
 * vide SOUS le loader, qui part `EMPTY_SETTLE_MS` apres : aucun squelette ne
 * se montre.
 */
export function useCategoryLoader(loading: boolean, rowCount: number): boolean {
  const [settle, setSettle] = useState(false);
  // Derive PENDANT le rendu : un rendu de retard montrerait la liste une image.
  const [prevLoading, setPrevLoading] = useState(loading);
  if (prevLoading !== loading) {
    setPrevLoading(loading);
    setSettle(!loading && rowCount === 0);
  }
  useEffect(() => {
    if (!settle) return;
    const timer = setTimeout(() => setSettle(false), EMPTY_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [settle]);
  return loading || settle;
}
