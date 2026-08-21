import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
  type ImageStyle,
} from "react-native";
import { Image, type ImageProps } from "expo-image";

/**
 * Image avec skeleton anime tant que le chargement n'est PAS termine.
 *
 * Pourquoi : sans ca, le conteneur laisse voir son `backgroundColor` (souvent une
 * couleur vive de marque) pendant tout le telechargement — l'utilisateur voit un
 * aplat colore avant l'image. Ici un voile neutre couvre la zone et pulse tant
 * que l'image n'est pas prete, puis disparait en fondu.
 *
 * Le skeleton reste affiche jusqu'a `onLoad` (image entierement decodee), pas
 * seulement jusqu'au premier octet recu.
 */

interface SkeletonImageProps extends Omit<ImageProps, "style"> {
  style?: StyleProp<ImageStyle>;
  /** Style du voile skeleton (arrondis notamment). Par defaut il epouse `style`. */
  skeletonStyle?: StyleProp<ViewStyle>;
  /** Teinte du skeleton. Clair par defaut ; passer une teinte sombre sur fond sombre. */
  skeletonColor?: string;
}

export const SkeletonImage: React.FC<SkeletonImageProps> = ({
  style,
  skeletonStyle,
  skeletonColor = "#e9edf2",
  onLoad,
  ...imageProps
}) => {
  const [loaded, setLoaded] = useState(false);
  // Pulsation du voile ; `fade` le fait disparaitre une fois l'image prete.
  const pulse = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (loaded) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [loaded, pulse]);

  useEffect(() => {
    if (!loaded) return;
    Animated.timing(fade, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [loaded, fade]);

  return (
    <>
      <Image
        {...imageProps}
        style={style}
        onLoad={(e) => {
          setLoaded(true);
          onLoad?.(e);
        }}
      />
      {/* Le voile se cale sur la zone de l'image : `style` porte deja sa
          geometrie (absoluteFill ou dimensions), on la reprend telle quelle. */}
      <Animated.View
        pointerEvents="none"
        style={[
          style as StyleProp<ViewStyle>,
          skeletonStyle,
          styles.overlay,
          {
            backgroundColor: skeletonColor,
            opacity: Animated.multiply(
              fade,
              pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.45] }),
            ),
          },
        ]}
      />
    </>
  );
};

const styles = StyleSheet.create({
  // Le voile se superpose a l'image sans decaler le flux (les images en flux
  // gardent leur place ; le voile est retire du layout par `position: absolute`).
  overlay: { position: "absolute" },
});
