import { useSafeAreaInsets } from "react-native-safe-area-context";

const TAB_BAR_BASE_HEIGHT = 58;

/**
 * Retourne la hauteur totale de la tab bar (base + safe area bottom).
 * À utiliser dans les écrans pour ajouter le bon paddingBottom
 * et éviter que le contenu soit caché derrière la navbar.
 */
export function useTabBarHeight(): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_BASE_HEIGHT + insets.bottom;
}
