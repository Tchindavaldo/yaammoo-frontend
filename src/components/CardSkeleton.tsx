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
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({
  radius,
  style,
  color = "#e6eaef",
  highlight = "#f4f7fa",
}) => {
  const fade = useRef(new Animated.Value(0)).current;

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
        { backgroundColor, borderRadius: radius },
        style,
      ]}
    />
  );
};
