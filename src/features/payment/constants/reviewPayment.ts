/**
 * Durée d'affichage de chaque étape simulée quand `POST /transaction` répond
 * `appleReviewMode: true` : le parcours se déroule seul (`ussd_sent` →
 * `success` → `success_created`), sans paiement réel ni verdict socket.
 */
export const REVIEW_STEP_MS = 2500;
