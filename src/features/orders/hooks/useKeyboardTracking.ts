// Hauteur du clavier (animee) + visibilite, pour la capsule de paiement du
// panier qui remonte avec lui. Extrait de `cart.tsx` pour R4.
import React, { useEffect, useState } from "react";
import { Animated, Keyboard, Platform } from "react-native";

export const useKeyboardTracking = () => {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const keyboardHeight = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (toValue: number) =>
      Animated.spring(keyboardHeight, { toValue, useNativeDriver: false, tension: 40, friction: 8 }).start();
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setIsKeyboardVisible(true);
        animate(e.endCoordinates.height);
      },
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setIsKeyboardVisible(false);
        animate(0);
      },
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardHeight]);

  return { keyboardHeight, isKeyboardVisible };
};
