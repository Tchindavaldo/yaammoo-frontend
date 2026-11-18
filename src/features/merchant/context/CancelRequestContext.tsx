import { createContext, useContext } from "react";

/**
 * Demande d'annulation en attente sur la carte ouverte : posé par MerchantOrderCard
 * autour du détail. L'onglet Commande remplace alors « Valider » par « Demande
 * d'annulation » (ouvre MerchantCancelRequestSheet). null = aucune demande.
 */
export const CancelRequestContext = createContext<(() => void) | null>(null);

export const useCancelRequestAction = () => useContext(CancelRequestContext);
