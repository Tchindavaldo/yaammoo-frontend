import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";

/**
 * Squelette de chargement couvrant UNE CARTE ENTIERE.
 *
 * Pourquoi plein carte et pas seulement l'image : habiller la seule image
 * laissait apparaitre le chrome de la carte autour du voile (liseres, bandeau
 * haut, fonds de blocs) — rendu inegal d'un design a l'autre. Ici le voile est
 * rendu A LA PLACE de la carte (retour anticipe dans `DesignItem`), jamais
 * par-dessus : superpose, les elements en `position: absolute` du design
 * passaient au-dessus et restaient visibles.
 *
 * Le rayon doit correspondre a celui de la carte : le passer via `radius`.
 *
 * Animation : fondu de couleur entre `color` et `highlight`. Rien ne se
 * deplace — pas de bande qui balaie.
 */

interface CardSkeletonProps {
  /** Rayon des coins, a aligner sur celui de la carte. */
  radius: number;
  /** Style additionnel (rarement utile : le voile remplit deja la carte). */
  style?: StyleProp<ViewStyle>;
  /** Teinte de base du voile. */
  color?: string;
  /** Seconde teinte du fondu. */
  highlight?: string;
  /**
   * Passer à `true` dès que le contenu est prêt : le voile s'efface en fondu
   * au lieu de disparaître d'un coup. Le parent doit garder le composant monté
   * le temps du fondu (`onFadedOut` signale la fin).
   */
  fadeOut?: boolean;
  /** Appelé une fois le fondu de sortie terminé. */
  onFadedOut?: () => void;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({
  radius,
  style,
  color = "#e6eaef",
  highlight = "#f4f7fa",
  fadeOut = false,
  onFadedOut,
}) => {
  const fade = useRef(new Animated.Value(0)).current;
  /** Opacité du voile : 1 pendant le chargement, 0 une fois l'image prête. */
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(fade, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          // Interpolation de COULEUR : non supportee par le driver natif.
          useNativeDriver: false,
        }),
        Animated.timing(fade, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [fade]);

  // Fondu de sortie : sans lui le voile disparaissait d'un coup au demontage,
  // la bascule squelette -> image etait brusque.
  useEffect(() => {
    if (!fadeOut) return;
    const anim = Animated.timing(opacity, {
      toValue: 0,
      duration: 260,
      easing: Easing.out(Easing.ease),
      // Coherent avec l'interpolation de couleur ci-dessus, qui interdit le
      // driver natif : les deux animations doivent tourner sur le meme driver.
      useNativeDriver: false,
    });
    anim.start(({ finished }) => {
      if (finished) onFadedOut?.();
    });
    return () => anim.stop();
  }, [fadeOut, opacity, onFadedOut]);

  // Va-et-vient entre les deux teintes : le squelette « respire » sans qu'aucun
  // element ne se deplace.
  const backgroundColor = fade.interpolate({
    inputRange: [0, 1],
    outputRange: [color, highlight],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor, borderRadius: radius, opacity },
        style,
      ]}
    />
  );
};
