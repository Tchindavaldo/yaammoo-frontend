/**
 * Valeurs de paiement par défaut utilisées UNIQUEMENT en mode review Apple
 * (appleReviewMode renvoyé par GET /fastFood/all).
 *
 * En review, on ne fait pas saisir de numéro/réseau à l'utilisateur : on envoie
 * directement /transaction avec ces valeurs. Le backend (qui connaît aussi
 * appleReviewMode) crée alors la commande sans déclencher de vrai paiement
 * Mobile Money.
 */
export const REVIEW_DEFAULT_PHONE = "699000000";
export const REVIEW_DEFAULT_NETWORK: "orange" | "mtn" = "orange";
