import { useBottomSafeArea, PAGE_INSET_RATIO } from "@/src/hooks/usePageBottomInset";

/**
 * Hauteur VISIBLE de la tab bar, au-dessus de la bande safe-area : marge haute
 * + onglets. AUCUN padding bas interne : la bande safe-area garantit deja
 * l'espace sous les onglets (R19). Source unique pour `_layout.tsx`,
 * `useSettingsTabBarStyle` et les ecrans.
 */
export const TAB_BAR_PADDING_TOP = 8;
// Icone (cadre 28) + marge 2 + libelle (lineHeight 13), cales en bas.
export const TAB_BAR_ITEM_HEIGHT = 44;
export const TAB_BAR_BASE_HEIGHT = TAB_BAR_PADDING_TOP + TAB_BAR_ITEM_HEIGHT;

/**
 * Part de la safe area basse reservee sous la tab bar : la source unique
 * (`PAGE_INSET_RATIO`, R19), pour que sa bande soit alignee sur celle des
 * pages entieres et des sheets.
 */
export const TAB_BAR_INSET_RATIO = PAGE_INSET_RATIO;

/**
 * Retourne la hauteur totale de la tab bar (base + safe area bottom).
 * À utiliser dans les écrans pour ajouter le bon paddingBottom
 * et éviter que le contenu soit caché derrière la navbar.
 */
export function useTabBarHeight(): number {
  const band = useBottomSafeArea();
  return TAB_BAR_BASE_HEIGHT + band;
}
