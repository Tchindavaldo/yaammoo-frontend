import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, View, type ViewProps } from "react-native";
import { BACKGROUND } from "./BonusPageBackground";

/**
 * Surface « verre » des cartes de la page bonus (glassmorphism).
 *
 * Empile, sous le contenu : un blur natif du fond de page + un blanc très
 * translucide. Le fond image reste donc perceptible à travers la carte, au lieu
 * d'être masqué par un aplat blanc.
 *
 * Gabarit identique à une `View` : mêmes props, mêmes styles passés par
 * l'appelant. Si `USE_IMAGE_BG` est désactivé, retombe sur une `View` simple
 * (les styles portent alors l'aplat gris d'origine).
 */

/**
 * Active l'effet « verre + image » sur les CARTES, indépendamment du fond de
 * page (`USE_IMAGE_BG`). Mettre à `false` rend les cartes en View simple (aplat),
 * même si le fond de page image est actif — et inversement.
 */
export const CARD_IMAGE_BG = false;

/**
 * ⭐ Couleur de fond de relais des cartes quand `CARD_IMAGE_BG = false`
 * (plus d'image/verre). Constante globale : la modifier ici change TOUTES les
 * cartes (carte principale, mini-cartes, carte de pagination). #fff par
 * défaut — volontairement différent du gris #F2F2F7 du V1.
 */
export const CARD_BG_COLOR = "#ffffff";

/** Blur du verre lui-même. Léger : le fond de page est déjà flouté. */
const GLASS_BLUR = 0;
/** Teinte du verre. Assez basse pour rester translucide, assez haute pour lire. */
const GLASS_TINT = "rgba(0, 0, 0, 0.05)";
/** Liseré clair : c'est lui qui donne l'arête « vitre » au bord de la carte. */
export const GLASS_BORDER = "rgba(0, 0, 0, 0)";
/**
 * Opacité de l'image de fond optionnelle (prop `image`). Basse : elle passe
 * SOUS le blur et le verre, c'est une matière, pas un visuel lisible — au-delà
 * de ~0.35 le texte de la carte perd en lisibilité.
 */
const CARD_IMAGE_OPACITY = 0.28;

interface BonusGlassCardProps extends ViewProps {
  /** Rayon des coins, à garder synchro avec le `borderRadius` du style passé. */
  radius?: number;
  /**
   * Ajoute l'image de fond de la page SOUS le blur et le verre (même asset que
   * BonusPageBackground). Réservé aux cartes qu'on veut détacher des autres —
   * l'appliquer partout annulerait l'effet.
   */
  image?: boolean;
  /**
   * Remplace l'asset par défaut par cette URI (image choisie par l'utilisateur).
   * Sans effet si `image` est false. null/undefined = asset de la page.
   */
  imageUri?: string | null;
  children?: React.ReactNode;
}

export const BonusGlassCard: React.FC<BonusGlassCardProps> = ({
  radius = 20,
  image = false,
  imageUri,
  style,
  children,
  ...rest
}) => {
  if (!CARD_IMAGE_BG) {
    return (
      <View style={style} {...rest}>
        {children}
      </View>
    );
  }

  return (
    <View style={[style, styles.host, { borderRadius: radius }]} {...rest}>
      {/* Couches de verre. `pointerEvents none` : ne jamais intercepter un
          appui destiné au contenu (les cartes de copie sont tappables). */}
      <View
        style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
        pointerEvents="none"
      >
        {/* Sous le blur : l'image donne de la matière à la carte. */}
        {image && (
          <Image
            source={imageUri ? { uri: imageUri } : BACKGROUND}
            style={[StyleSheet.absoluteFill, { opacity: CARD_IMAGE_OPACITY }]}
            contentFit="cover"
            transition={0}
            cachePolicy="memory-disk"
          />
        )}
        <BlurView
          intensity={GLASS_BLUR}
          tint="light"
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: GLASS_TINT }]}
        />
      </View>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  // `overflow hidden` : sans lui, le blur déborde des coins arrondis.
  host: { overflow: "hidden" },
});
