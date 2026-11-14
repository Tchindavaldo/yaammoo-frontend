/**
 * Canal « recharge ces boutiques » (sans etat partage : un simple emetteur).
 *
 * Emis par :
 * - le socket `fastfoodsChanged { ids | null }` (catalogEvents) : une boutique,
 *   ses zones / prix / creneaux / regime, ou un reglage global ont change ;
 * - un refus de paiement 422 qui porte `fastFoodIds` (useCartPayment,
 *   useCheckout) : les prix du panier n'etaient plus a jour.
 *
 * Ecoute par `useFastFoodRefreshByIds` (FastFoodContext), qui recharge le home.
 * `null` = toutes les boutiques chargees.
 */
type Listener = (ids: string[] | null) => void;

const listeners = new Set<Listener>();

export function requestFastfoodsRefresh(ids: string[] | null): void {
  const list = Array.isArray(ids) ? ids.filter(Boolean).map(String) : null;
  if (list && list.length === 0) return;
  listeners.forEach((l) => l(list));
}

export function onFastfoodsRefresh(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
