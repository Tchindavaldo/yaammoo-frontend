import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Part de `insets.bottom` gardee par les sheets de commande, SEPAREE par OS :
 * - iOS : 0,5 (meme ratio que la tab bar) — l'inset complet laissait un grand
 *   vide sous les boutons sur iPhone.
 * - Android : 1 — inchange, la barre de navigation systeme a besoin de tout.
 * Regler l'un ne touche pas l'autre.
 */
const SHEET_INSET_RATIO_IOS = 0.5;
const SHEET_INSET_RATIO_ANDROID = 1;

/**
 * Safe-area des sheets de commande (home + panier) et de TOUS leurs overlays.
 * Sheet et overlays DOIVENT passer par ce hook, sinon les overlays (ancres en
 * `bottom: 0`, meme hauteur que le sheet) ne le recouvrent plus.
 */
export function useSheetInsets() {
  const insets = useSafeAreaInsets();
  const ratio =
    Platform.OS === "ios" ? SHEET_INSET_RATIO_IOS : SHEET_INSET_RATIO_ANDROID;
  return { ...insets, bottom: insets.bottom * ratio };
}
