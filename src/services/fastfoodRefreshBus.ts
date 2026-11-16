/**
 * Canal « recharge ces boutiques » (sans etat partage : un simple emetteur).
 *
 * Les changements faits par l'API arrivent AVEC leurs donnees (`fastfoodUpdated`,
 * applique sans requete). Ce canal ne sert qu'aux cas sans donnees :
 * - le socket `fastfoodsChanged { ids: null }` (catalogEvents) : reglage global
 *   (frais, marges, interrupteur plateforme) -> rafraichissement silencieux de
 *   tout le home, le meme qu'au retour au premier plan ;
 * - un refus de paiement 422 qui porte `fastFoodIds` (useCartPayment,
 *   useCheckout) : les prix du panier n'etaient plus a jour.
 *
 * `requestFastfoodsRemove(ids)` : socket `fastfoodsHidden` (boutique modifiee
 * devenue invisible au home), retiree de la liste sans requete.
 *
 * Ecoute par `useFastFoodRefreshByIds` (FastFoodContext), qui recharge le home.
 * `null` = toutes les boutiques chargees. Une liste (ancien backend, refus de
 * paiement) = GET cible, en arriere-plan.
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

type RemoveListener = (ids: string[]) => void;
const removeListeners = new Set<RemoveListener>();

export function requestFastfoodsRemove(ids: string[]): void {
  const list = Array.isArray(ids) ? ids.filter(Boolean).map(String) : [];
  if (list.length) removeListeners.forEach((l) => l(list));
}

export function onFastfoodsRemove(listener: RemoveListener): () => void {
  removeListeners.add(listener);
  return () => {
    removeListeners.delete(listener);
  };
}

/**
 * Panier a recharger (en silence) : refus de paiement « prix changes ». Le
 * backend a deja recalcule le panier en base ; si le socket `userOrderUpdated`
 * a ete rate, ce GET le rattrape tout de suite. Ecoute par OrderContext.
 */
const cartListeners = new Set<() => void>();

export function requestCartRefresh(): void {
  cartListeners.forEach((l) => l());
}

export function onCartRefresh(listener: () => void): () => void {
  cartListeners.add(listener);
  return () => {
    cartListeners.delete(listener);
  };
}
