import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DS } from "@/src/theme/ds";

/**
 * Mode verification : `true` colore la bande safe-area basse (pages, pieds
 * fixes, bottom sheets) pour comparer l'alignement par captures. Seul
 * interrupteur de l'app ; `false` en production.
 */
export const SAFE_AREA_DEBUG = false;

/** Couleur de la bande safe-area basse, appliquee partout depuis ici. */
export const SAFE_AREA_BG = SAFE_AREA_DEBUG ? DS.accent : DS.bg;

/**
 * Part de la safe area basse reservee sous une PAGE ENTIERE (hors (tabs), sans
 * navbar). Aligne sur l'ecran Personnel (reference) : inset complet sur les
 * deux OS (iOS : indicateur d'accueil, Android : barre systeme). La garde par
 * OS reste pour pouvoir diverger sans toucher aux appelants.
 */
export const PAGE_INSET_RATIO = Platform.OS === "android" ? 1 : 1;

/**
 * Insets pour les bottom sheets (Modal ancree en bas) : identiques a
 * `useSafeAreaInsets()`, sauf `bottom` ramene au ratio par OS ci-dessus.
 */
export function useSheetSafeInsets() {
  const insets = useSafeAreaInsets();
  return { ...insets, bottom: insets.bottom * PAGE_INSET_RATIO };
}

/**
 * Pied de page FIXE d'une page entiere (barre de filtres, bouton de
 * validation) : il descend dans la safe area comme une tab bar, au lieu de
 * flotter au-dessus d'une bande vide. Meme ratio que les pages : bandes
 * alignees d'une page a l'autre.
 */
export const FOOTER_INSET_RATIO = PAGE_INSET_RATIO;

export function useFooterBottomInset(): number {
  const insets = useSafeAreaInsets();
  return insets.bottom * FOOTER_INSET_RATIO;
}

/** Marge basse d'une page entiere : le contenu est tronque au-dessus. */
export function usePageBottomInset(): number {
  const insets = useSafeAreaInsets();
  return insets.bottom * PAGE_INSET_RATIO;
}
