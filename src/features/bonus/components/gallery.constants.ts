/**
 * Constantes partagées par la galerie de pagination. Module sans dépendance :
 * évite le cycle d'imports avec BonusGalleryCard.
 */

export const GALLERY_CARD_W = 72;
export const GALLERY_GAP = 8;
export const GALLERY_STEP = GALLERY_CARD_W + GALLERY_GAP;
export const GALLERY_RADIUS = 14;

/**
 * Indices des mini-cartes affichées dans une galerie FIXE de largeur `width` :
 * autant de cartes qu'il en tient (2 au minimum). Fenêtre par pages de `k`,
 * calée pour rester pleine en fin de liste — le bonus courant y est toujours,
 * et au sein d'une page seule la mise en avant varie au scroll. Même calcul
 * que `BPFooterView.window` (iOS).
 */
export const galleryWindow = (count: number, index: number, width: number) => {
  const k = Math.max(2, Math.floor((width + GALLERY_GAP) / GALLERY_STEP));
  if (count <= k) return Array.from({ length: count }, (_, i) => i);
  const start = Math.min(Math.floor(index / k) * k, count - k);
  return Array.from({ length: k }, (_, i) => start + i);
};
