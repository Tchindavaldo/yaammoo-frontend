/**
 * Libelle de livraison d'une boutique sur les cartes du home.
 *
 * - livraison offerte (`deliveryOffer.active`, renvoye par le backend) : "gratuit"
 * - sinon : le tarif LE MOINS CHER parmi toutes ses zones (periodiques, tous
 *   creneaux confondus, et express), tel que renvoye par le backend
 *   (`deliveryHours` / `expressZones` = zones du regime actif) : "300F"
 * - aucune zone tarifee : "" (rien d'affiche)
 *
 * Aucun calcul d'argent ici : on lit les prix du backend, on prend le minimum.
 */
export const FEE_FREE = "gratuit";

const priceOf = (z: any): number => {
  const n = Number(z?.prix);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export function shopDeliveryFeeLabel(ff: any): string {
  if (ff?.deliveryOffer?.active === true) return FEE_FREE;
  const prices: number[] = [];
  for (const entry of Array.isArray(ff?.deliveryHours) ? ff.deliveryHours : []) {
    for (const z of Array.isArray(entry?.periodicZones) ? entry.periodicZones : []) {
      const p = priceOf(z);
      if (p) prices.push(p);
    }
  }
  for (const z of Array.isArray(ff?.expressZones) ? ff.expressZones : []) {
    const p = priceOf(z);
    if (p) prices.push(p);
  }
  return prices.length ? `${Math.min(...prices)}F` : "";
}
