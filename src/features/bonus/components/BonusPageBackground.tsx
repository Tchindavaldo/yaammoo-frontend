import { BlurView } from "expo-blur";
// `expo-image` (et non `Image` de react-native) : il garde l'asset en cache
// mémoire, donc au 2e affichage de la page le fond est peint dès la 1re frame.
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, View } from "react-native";

/**
 * Fond de la page bonus, en pleine page derrière tout le contenu :
 * image de plat floutée → blur natif clair → voile blanc → dégradé de couleur.
 *
 * Les cartes ne portent plus de fond propre : elles sont translucides et
 * laissent voir ce fond commun, ce qui évite la répétition du même visuel une
 * dizaine de fois à l'écran.
 *
 * ⚠️ Retour arrière : passer `USE_IMAGE_BG` à `false` ci-dessous suffit à
 * revenir au fond gris d'origine (page blanche + cartes grises) — le composant
 * ne rend alors rien et les cartes reprennent leur aplat.
 */
export const USE_IMAGE_BG = false;

/** Image de fond de la page (réutilisée par BonusGlassCard, cf. prop `image`). */
export const BACKGROUND = require("../../../../assets/images/purre-avocat-tomate-legume-flouter.png");

/**
 * Met le fond en cache mémoire AVANT que la page ne s'ouvre. Sans ça, la toute
 * première ouverture peint une frame vide le temps que le bitmap soit décodé.
 * Appelé une fois au démarrage de l'app (voir app/_layout.tsx).
 */
export const prefetchBonusBackground = () =>
  Image.prefetch(BACKGROUND, { cachePolicy: "memory-disk" }).catch(() => {
    // Préchargement raté : la page s'affichera simplement avec le délai de
    // décodage habituel, ce n'est pas une erreur bloquante.
  });

/**
 * Facteur d'agrandissement de l'image. L'asset est un plat centré entouré de
 * vide : à 1 (cover plein cadre) ce vide retombe en haut et en bas de l'écran.
 * Au-delà de 1, on zoome pour que la matière du plat couvre toute la hauteur.
 * 1 = pas de zoom · 1.6 = +60 %. Monter si le bas de page reste vide.
 */
const IMAGE_SCALE = 1.2;

/** Intensité du blur natif appliqué par-dessus l'image (déjà floutée). */
const BLUR_INTENSITY = 81;
/** Voile clair par-dessus le blur : garantit le contraste du texte foncé. */
const VEIL = "rgba(255, 255, 255, 0.95)"; // valeur final valider
// const VEIL = "rgba(2, 1, 1, 0.55)"; // valeur test

/**
 * Dégradé de couleur posé par-dessus le voile : réchauffe le blanc laiteux et
 * donne une profondeur diagonale (orange de marque → indigo secondaire).
 * Opacités volontairement basses — c'est une teinte, pas un aplat : au-delà de
 * ~0.20 le texte foncé des cartes commence à perdre en lisibilité.
 */
const GRADIENT_COLORS = [
  "rgba(236,73,19,0.16)", // primary — chaud, en haut à gauche
  "rgba(255,255,255,0)", // transparent au centre : garde la zone de lecture neutre
  "rgba(88,86,214,0.16)", // secondary — froid, en bas à droite
] as const;

interface BonusPageBackgroundProps {
  /**
   * Y de départ du fond. À régler sur la hauteur du header : au-dessus, rien
   * n'est peint, si bien que la page qui est DERRIÈRE (settings) transparaît et
   * que le blur du TabHeader la floute — même effet que gestion menu/boutique.
   * 0 = plein écran, header compris.
   */
  top?: number;
}

/**
 * À monter en premier enfant du conteneur pleine page, avant le contenu.
 * Ne rend rien si `USE_IMAGE_BG` est désactivé.
 */
export const BonusPageBackground: React.FC<BonusPageBackgroundProps> = ({
  top = 0,
}) => {
  if (!USE_IMAGE_BG) return null;

  return (
    // `pointerEvents none` : le fond ne doit jamais intercepter un appui.
    <View
      style={[StyleSheet.absoluteFill, styles.host, { top }]}
      pointerEvents="none"
    >
      {/* L'image est un plat CENTRÉ sur fond vide : en `cover` plein cadre, ses
          bords vides retombent en haut/bas et la pagination n'a rien à flouter.
          On l'agrandit donc au-delà du cadre (IMAGE_SCALE) pour que la matière
          couvre toute la hauteur, débordement rogné par le parent. */}
      <Image
        source={BACKGROUND}
        style={styles.image}
        contentFit="cover"
        // Asset local déjà bundlé : pas de fondu d'apparition (il rejouerait le
        // flash), et cache mémoire pour un affichage immédiat aux ouvertures
        // suivantes.
        transition={0}
        cachePolicy="memory-disk"
      />
      <BlurView
        intensity={BLUR_INTENSITY}
        tint="light"
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: VEIL }]} />
      {/* Dégradé diagonal (haut-gauche → bas-droite), par-dessus le voile. */}
      <LinearGradient
        colors={GRADIENT_COLORS}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  // Rogne le débordement de l'image agrandie (IMAGE_SCALE > 1).
  host: { overflow: "hidden" }, // Plein cadre, puis zoom CENTRÉ via `transform` — et non des marges en %,
  // qui se réfèrent toutes à la LARGEUR du parent (marginTop compris) et
  // décaleraient donc l'image verticalement.
  image: {
    width: "100%",
    height: "100%",
    transform: [{ scale: IMAGE_SCALE }],
  },
});
