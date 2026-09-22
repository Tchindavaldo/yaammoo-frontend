import { Menu } from "@/src/types";
import { Dimensions } from "react-native";

/**
 * Reglages et constantes des cartes menu (`DesignItem` et ses 7 variantes).
 * Extraits de l'ancien `DesignItem.tsx` monolithique (R4).
 */

export const { width: SCREEN_WIDTH } = Dimensions.get("window");

/** Set to true to enable variable backgrounds for Design 4, 5 & 6. */
export const USE_VARIABLE_BACKGROUNDS = false;

/** Mettre a `true` pour figer le squelette et inspecter son rendu. */
export const FORCE_SKELETON = false;

/** TEMPORAIRE — `false` masque tout le contenu de la carte variant 5 pour ne
 *  laisser voir que son image de fond. */
export const V5_SHOW_CONTENT = false;

/** TEMPORAIRE — idem pour la carte variant 4. */
export const V4_SHOW_CONTENT = false;

/** TEMPORAIRE — idem pour la carte variant 6. */
export const V6_SHOW_CONTENT = false;

/** TEMPORAIRE — `false` masque les bandes blur du bas (variants 4 et 5). */
export const SHOW_BOTTOM_BAR = true;

/**
 * Affichage du statut de disponibilite sur la ligne du nom du plat.
 * Masque temporairement : passer a `false` pour le masquer, sans autre modif.
 */
export const SHOW_AVAILABILITY = true;

/**
 * Bas interne des cards : "blur" (barre blur du variant 5), "blur2" (barre
 * stock + livraison) ou "v7" (zone du variant 7). Bascule globale, appliquee a
 * tous les variants.
 *
 * `string` volontaire (pas d'union figee) : TS refuserait sinon la
 * comparaison avec l'autre valeur des que le flag est fixe.
 */
export const CARD_BOTTOM_STYLE: string = "blur2"; // "blur" | "blur2" | "v7"

/** Fonds du variant 5 : un poster different par menu, en boucle sur l'index. */
export const V5_BACKGROUNDS = [
  require("@/assets/images/background/pop-chicken-poster.jpg"),
  require("@/assets/images/background/macdonald-poster.jpg"),
  require("@/assets/images/background/molten-cheese-burger-poster.jpg"),
];

/** Fonds du variant 4 : un poster different par menu, en boucle sur l'index. */
export const V4_BACKGROUNDS = [
  require("@/assets/images/background/spicy-biryani-poster.jpg"),
  require("@/assets/images/background/pisang-goreng-poster.jpg"),
  require("@/assets/images/background/sushi-bar-poster.jpg"),
];

/** Fond du variant 6. */
export const V6_BACKGROUND = require("@/assets/images/background/design6-poster.png");

/**
 * Gabarit du squelette par variante : il doit occuper EXACTEMENT la place de la
 * carte finale, sinon la rangee horizontale saute au moment du chargement.
 * Valeurs alignees sur les styles `vNCard` (width/height/borderRadius/marginRight).
 * Les designs 2 et 3 n'ont pas de hauteur fixe (elle depend du contenu) : on
 * reprend la hauteur rendue observee.
 */
export const SKELETON_SIZES: Record<
  number,
  { width: number; height: number; radius: number; gap: number }
> = {
  1: { width: 260, height: 280, radius: 18, gap: 8 },
  2: { width: 220, height: 260, radius: 14, gap: 8 },
  3: { width: 130, height: 200, radius: 12, gap: 8 },
  4: { width: 240, height: 240, radius: 16, gap: 8 },
  5: { width: 200, height: 250, radius: 16, gap: 8 },
  6: { width: SCREEN_WIDTH * 0.78, height: 200, radius: 14, gap: 8 },
  7: { width: 150, height: 190, radius: 12, gap: 8 },
};

export interface DesignItemProps {
  menu: Menu;
  variant: number;
  merchantName?: string;
  onPress: () => void;
  index?: number;
  isLast?: boolean;
  deliveryHours?: string[];
  orderLeadTime?: number;
  stock?: number;
}

/**
 * Props d'une variante de carte : celles de `DesignItem` + les valeurs
 * derivees calculees UNE fois par `DesignItemCard`.
 */
export interface CardVariantProps {
  menu: Menu;
  onPress: () => void;
  index: number;
  isLast: boolean;
  stock: number;
  price: string;
  deliveryTime: string;
  deliveryFeeLabel: string;
}

/** Frais de livraison affiches (maquette) : cycle sur l'index du menu. */
export const deliveryFeeLabelFor = (index: number) =>
  index % 3 === 0 ? "gratuit" : index % 3 === 1 ? "300F" : "1000F";
