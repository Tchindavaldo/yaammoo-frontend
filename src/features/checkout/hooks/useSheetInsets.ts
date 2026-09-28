import { useSheetSafeInsets } from "@/src/hooks/usePageBottomInset";

/**
 * Safe-area des sheets de commande (home + panier) et de TOUS leurs overlays.
 * Sheet et overlays DOIVENT passer par ce hook, sinon les overlays (ancres en
 * `bottom: 0`, meme hauteur que le sheet) ne le recouvrent plus.
 *
 * La part de `insets.bottom` vient de la source unique (`PAGE_INSET_RATIO`,
 * R19) : bande alignee sur les pages, la tab bar et les autres sheets.
 */
export function useSheetInsets() {
  return useSheetSafeInsets();
}
