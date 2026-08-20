import { useEffect, useRef, useState } from "react";
import { Animated } from "react-native";

/** Sequence d'entree du panneau (fade + slide + scale de la carte). */
export const useEntryAnimation = (visible: boolean) => {
  const cardSlideAnim = useRef(new Animated.Value(250)).current;
  const cardScaleAnim = useRef(new Animated.Value(0.96)).current;
  const cardFadeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [isEntering, setIsEntering] = useState(false);

  const resetAnims = () => {
    cardSlideAnim.setValue(250);
    cardScaleAnim.setValue(0.96);
    cardFadeAnim.setValue(0);
    fadeAnim.setValue(0);
  };

  useEffect(() => {
    if (!visible) return;
    setIsEntering(true);
    resetAnims();

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(100),
        Animated.parallel([
          Animated.timing(cardFadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.spring(cardSlideAnim, {
            toValue: 0,
            tension: 18,
            friction: 8,
            useNativeDriver: true,
          }),
          Animated.spring(cardScaleAnim, {
            toValue: 1,
            tension: 18,
            friction: 8,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start(() => setIsEntering(false));
  }, [visible]);

  return {
    cardSlideAnim,
    cardScaleAnim,
    cardFadeAnim,
    fadeAnim,
    isEntering,
    setIsEntering,
    resetAnims,
  };
};
