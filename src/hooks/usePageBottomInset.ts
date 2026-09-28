import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DS } from "@/src/theme/ds";

/**
 * SOURCE UNIQUE de la safe-area basse de l'app (R19). Tout element qui touche
 * le bas de l'ecran en derive : pages entieres, pieds de page fixes, tab bar,
 * bottom sheets (marchand, commande, paiement). Aucune autre part de
 * `insets.bottom` n'existe ailleurs.
 */

/**
 * Part de la safe area basse reservee, par OS. Aligne sur l'ecran Personnel
 * (reference) : inset complet sur les deux OS (iOS : indicateur d'accueil,
 * Android : barre systeme). La garde par OS reste pour pouvoir diverger sans
 * toucher aux appelants.
 */
export const PAGE_INSET_RATIO = Platform.OS === "android" ? 1 : 1;

/**
 * Mode verification : `true` colore la bande safe-area basse (pages, pieds
 * fixes, tab bar, bottom sheets) pour comparer l'alignement par captures.
 * Seul interrupteur de l'app ; `false` en production.
 */
export const SAFE_AREA_DEBUG = false;

/** Couleur de la bande safe-area basse, appliquee partout depuis ici. */
export const SAFE_AREA_BG = SAFE_AREA_DEBUG ? DS.accent : DS.bg;

/** Hauteur de la bande safe-area basse (px), commune a tous les elements. */
export function useBottomSafeArea(): number {
  const insets = useSafeAreaInsets();
  return insets.bottom * PAGE_INSET_RATIO;
}

/**
 * Insets pour les bottom sheets (Modal ancree en bas) : identiques a
 * `useSafeAreaInsets()`, sauf `bottom` ramene au ratio ci-dessus.
 */
export function useSheetSafeInsets() {
  const insets = useSafeAreaInsets();
  return { ...insets, bottom: insets.bottom * PAGE_INSET_RATIO };
}

/**
 * Pied de page FIXE (barre de filtres, bouton de validation, tab bar) : il
 * descend dans la safe area au lieu de flotter au-dessus d'une bande vide.
 * Meme ratio que les pages : bandes alignees d'un ecran a l'autre.
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
