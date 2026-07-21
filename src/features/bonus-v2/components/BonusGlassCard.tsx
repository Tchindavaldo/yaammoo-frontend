import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, View, type ViewProps } from "react-native";
import { BACKGROUND, USE_IMAGE_BG } from "./BonusPageBackground";

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

/** Blur du verre lui-même. Léger : le fond de page est déjà flouté. */
const GLASS_BLUR = 81;
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
  if (!USE_IMAGE_BG) {
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
