import { Dimensions, Platform } from "react-native";

const { height: SCREEN_H } = Dimensions.get("window");

/**
 * Hauteur FIXE de la sheet d'auth.
 *
 * ⚠️ Dans son propre module, et non dans `AuthGateContext` : la capsule
 * flottante (`AuthFieldCapsule`) en a besoin pour se plafonner, et l'importer
 * du contexte fermait un cycle
 * (`AuthGateContext` → `AuthSheetContent` → `EmailAuthStep` → capsule → …).
 *
 * Android gagne quelques points : la barre de navigation y mange le bas de
 * l'ecran, le contenu s'y retrouvait a l'etroit.
 */
export const AUTH_SHEET_HEIGHT =
  SCREEN_H * (Platform.OS === "android" ? 0.59 : 0.57);

/**
 * Gouttiere basse de la sheet (`styles.sheet.paddingBottom`).
 *
 * ⚠️ Partagee avec la capsule : celle-ci est rendue DANS le corps de la sheet,
 * donc au-dessus de ce padding. Sans le compenser, son voile s'arretait 24 px
 * trop haut — une bande blanche non floutee restait en bas — et son sommet
 * depassait d'autant.
 */
export const AUTH_SHEET_PADDING_BOTTOM = 24;
