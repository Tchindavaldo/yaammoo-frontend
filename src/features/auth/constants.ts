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

/*
 * Gouttiere basse de la sheet : la bande safe-area (`useBottomSafeArea`,
 * source unique R19), AJOUTEE a `AUTH_SHEET_HEIGHT` (hauteur utile du
 * contenu). La capsule (`AuthFieldCapsule`) la compense avec le meme hook :
 * son voile descend jusqu'au bord et fait `AUTH_SHEET_HEIGHT + bande`.
 */
