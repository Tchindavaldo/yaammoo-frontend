import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TAB_BAR_BASE_HEIGHT = 58;

/**
 * Part de la safe area basse reservee sous la tab bar. Android en prend plus :
 * ses touches de navigation sont physiquement plus hautes que l'indicateur
 * d'accueil d'iOS, la barre de l'app s'y retrouvait collee dessus.
 */
export const TAB_BAR_INSET_RATIO = Platform.OS === "android" ? 0.9 : 0.5;

/**
 * Retourne la hauteur totale de la tab bar (base + safe area bottom).
 * À utiliser dans les écrans pour ajouter le bon paddingBottom
 * et éviter que le contenu soit caché derrière la navbar.
 */
export function useTabBarHeight(): number {
  const insets = useSafeAreaInsets();
  // MEME calcul que `app/(tabs)/_layout.tsx` : les deux doivent rester alignes.
  return TAB_BAR_BASE_HEIGHT + insets.bottom * TAB_BAR_INSET_RATIO;
}
