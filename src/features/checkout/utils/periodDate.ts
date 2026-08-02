/**
 * `CheckoutPeriodOverlay` remonte la période au format "YYYY-MM-DD|HH:mm|lieu"
 * (la partie lieu est optionnelle). La date choisie n'existe QUE dans cette
 * chaîne : si on ne l'extrait pas pour la poser dans `delivery.date`, le
 * fallback de `useCheckout` retombe sur la date du jour et une commande
 * programmée pour demain est vue comme une commande d'aujourd'hui côté
 * marchand.
 */
export function extractPeriodDate(period: string): string | null {
  if (!period) return null;
  const head = String(period).split("|")[0];
  return /^\d{4}-\d{2}-\d{2}$/.test(head) ? head : null;
}
