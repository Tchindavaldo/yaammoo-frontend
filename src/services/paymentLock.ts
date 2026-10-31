/**
 * Verrou du paiement en cours (achat direct, panier individuel, panier groupé).
 *
 * Pendant l'attente du verdict (« Veuillez patienter », USSD envoyé), le sheet
 * peut être fermé d'un toucher hors de la zone : le paiement continue. Tant que
 * le verrou est posé, toute ouverture d'un plat / d'une commande ROUVRE le sheet
 * du paiement en cours, dans l'état où il est. Le verdict (toast succès/échec)
 * lève le verrou.
 *
 * Service pur sans rendu (comme `globalToast`) : un seul paiement à la fois,
 * le handler socket `payment.settled` étant lui-même unique.
 */
let reopenActive: (() => void) | null = null;

/** Pose le verrou ; `reopen` rouvre le sheet du paiement en cours. */
export function lockPayment(reopen: () => void) {
  reopenActive = reopen;
}

/** Lève le verrou (seulement s'il appartient à ce `reopen`). */
export function unlockPayment(reopen?: () => void) {
  if (!reopen || reopenActive === reopen) reopenActive = null;
}

/**
 * À appeler avant d'ouvrir un plat / une commande. Paiement en cours : rouvre
 * son sheet et renvoie `true` (l'appelant n'ouvre rien d'autre).
 */
export function reopenLockedPayment(): boolean {
  if (!reopenActive) return false;
  reopenActive();
  return true;
}
