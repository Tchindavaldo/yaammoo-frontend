import { requireNativeView, requireOptionalNativeModule } from "expo";
import type { ComponentType, ReactNode } from "react";
import { Platform, type ViewProps } from "react-native";

/**
 * Carrousel natif de la sheet Bonus — iOS uniquement.
 *
 * Les cartes restent des composants React (enfants de la vue) ; le natif
 * possede le defilement (UIScrollView pagine) et dessine le pied de page
 * (galerie + panneau heros), mis a jour dans le MEME appel que le scroll.
 *
 * ⚠️ Le module n'existe que dans un build natif qui l'embarque. Sur un dev
 * client plus ancien, Expo Go ou Android, `isBonusPagerAvailable` vaut
 * `false` et la sheet garde son carrousel React.
 */

/** Donnees d'un bonus pour le pied de page, deja pretes a afficher. */
export type BonusPagerItem = {
  id: string;
  /** Couleur du bonus (#RRGGBB). */
  color: string;
  /** Glyphe Ionicons (caractere) de l'icone du type. */
  icon: string;
  /** « Bonus 3 » (mini-carte de la galerie). */
  label: string;
  issuer: string;
  /** « · 2 restantes », ou null sans plafond d'utilisation. */
  remaining: string | null;
  name: string;
  statusLabel: string;
  statusColor: string;
};

export type BonusPagerViewProps = ViewProps & {
  items: BonusPagerItem[];
  /** Hauteur du pied de page, reservee en bas (0 = pas de pied de page). */
  footerHeight: number;
  /** Texte actif de la galerie et jauge du panneau heros. */
  textColor: string;
  /** Police Ionicons deja chargee par l'app (`Ionicons.getFontFamily()`). */
  iconFontFamily: string | null;
  /** Une page par bonus, dans l'ordre de `items`. */
  children?: ReactNode;
};

export const isBonusPagerAvailable =
  Platform.OS === "ios" && requireOptionalNativeModule("BonusPager") != null;

export const BonusPagerView: ComponentType<BonusPagerViewProps> | null =
  isBonusPagerAvailable ? requireNativeView("BonusPager") : null;
