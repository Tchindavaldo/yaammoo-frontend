import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

/**
 * Squelette des rangees du home (cartes menu + header boutique).
 *
 * Copie dediee de `src/components/CardSkeleton` (R16), meme rendu : fondu
 * entre `#e6eaef` et `#f4f7fa`, rien ne se deplace.
 *
 * ⚠️ Difference unique et voulue : la respiration joue sur l'OPACITE d'un
 * calque clair, sur le driver NATIF. `CardSkeleton` interpole une couleur,
 * donc tourne sur le thread JS et pousse une mise a jour de props a chaque
 * frame. Avec les fantomes de la page suivante (`utils/pagePlaceholders`),
 * une quinzaine de squelettes respirent en permanence : ces mises a jour
 * saturaient le thread UI, le scroll ramait au point de ne plus repondre
 * (mesure : JS libre, lenteur disparue en coupant les fantomes). Ici la
 * boucle vit entierement cote natif, sans aucun aller-retour JS.
 */
export const ShopSkeleton: React.FC<{
  /** Rayon des coins, a aligner sur celui de la carte. */
  radius: number;
  /** `false` coupe la boucle (squelette invisible sous le contenu). */
  animating?: boolean;
}> = ({ radius, animating = true }) => {
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animating) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(fade, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(fade, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [fade, animating]);

  return (
    <View
      pointerEvents="none"
      style={[styles.base, { borderRadius: radius }]}
    >
      <Animated.View
        style={[styles.highlight, { borderRadius: radius, opacity: fade }]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "#e6eaef",
    overflow: "hidden",
  },
  highlight: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "#f4f7fa",
  },
});
