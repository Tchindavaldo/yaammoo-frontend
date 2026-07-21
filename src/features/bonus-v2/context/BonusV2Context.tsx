// ============================================================================
// BonusV2Context — état partagé des bonus
// ----------------------------------------------------------------------------
// Le hook `useBonusV2` reste le moteur (fetch, claim, normalisation) ; ce contexte
// n'en instancie qu'UNE copie pour toute l'app.
//
// Pourquoi un contexte et pas le hook appelé directement : les events socket
// `bonus.claimed` / `bonus.reward_credentials` arrivent à n'importe quel moment, souvent
// alors que la modale bonus est FERMÉE (Netflix est provisionné manuellement,
// avec du délai). `useSocketEvents` est monté globalement : il lui faut un état
// vivant hors de la modale, sinon la livraison est perdue.
// ============================================================================
import React, { createContext, useContext } from "react";
import { useBonusV2 } from "../hooks/useBonusV2";

type BonusV2ContextType = ReturnType<typeof useBonusV2>;

const BonusV2Context = createContext<BonusV2ContextType | undefined>(undefined);

export const BonusV2Provider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const value = useBonusV2();
  return (
    <BonusV2Context.Provider value={value}>{children}</BonusV2Context.Provider>
  );
};

/** Accès à l'état bonus partagé. À utiliser partout à la place de `useBonusV2`. */
export const useBonusV2Context = (): BonusV2ContextType => {
  const ctx = useContext(BonusV2Context);
  if (!ctx) {
    throw new Error("useBonusV2Context doit être utilisé dans un <BonusV2Provider>");
  }
  return ctx;
};
