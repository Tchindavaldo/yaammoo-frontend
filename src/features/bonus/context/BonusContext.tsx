// ============================================================================
// BonusContext — état partagé des bonus
// ----------------------------------------------------------------------------
// Le hook `useBonus` reste le moteur (fetch, claim, normalisation) ; ce contexte
// n'en instancie qu'UNE copie pour toute l'app.
//
// Pourquoi un contexte et pas le hook appelé directement : les events socket
// `bonus.claimed` / `bonus.reward_credentials` arrivent à n'importe quel moment, souvent
// alors que la modale bonus est FERMÉE (Netflix est provisionné manuellement,
// avec du délai). `useSocketEvents` est monté globalement : il lui faut un état
// vivant hors de la modale, sinon la livraison est perdue.
// ============================================================================
import React, { createContext, useContext } from "react";
import { useBonus } from "../hooks/useBonus";

type BonusContextType = ReturnType<typeof useBonus>;

const BonusContext = createContext<BonusContextType | undefined>(undefined);

export const BonusProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const value = useBonus();
  return (
    <BonusContext.Provider value={value}>{children}</BonusContext.Provider>
  );
};

/** Accès à l'état bonus partagé. À utiliser partout à la place de `useBonus`. */
export const useBonusContext = (): BonusContextType => {
  const ctx = useContext(BonusContext);
  if (!ctx) {
    throw new Error("useBonusContext doit être utilisé dans un <BonusProvider>");
  }
  return ctx;
};
