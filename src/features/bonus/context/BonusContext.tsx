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
import { BonusUploadToast } from "../components/BonusUploadToast";
import { useBonus } from "../hooks/useBonus";
import { useBonusFlyer } from "../hooks/useBonusFlyer";

type BonusContextType = ReturnType<typeof useBonus> &
  ReturnType<typeof useBonusFlyer>;

const BonusContext = createContext<BonusContextType | undefined>(undefined);

export const BonusProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const bonus = useBonus();
  // Téléchargement du flyer / envoi de la preuve montés ICI et non dans la
  // sheet : fermer la modale démontait le hook en plein upload — progression
  // perdue, `onProofSent` jamais remonté, échec invisible. Porté par le
  // contexte, l'envoi survit à la fermeture et l'état est retrouvé intact à la
  // réouverture.
  const flyer = useBonusFlyer(bonus.applyClaimPayload);
  return (
    <BonusContext.Provider value={{ ...bonus, ...flyer }}>
      {children}
      {/* Après `children` : se superpose à l'app, quelle que soit la page. */}
      <BonusUploadToast />
    </BonusContext.Provider>
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
