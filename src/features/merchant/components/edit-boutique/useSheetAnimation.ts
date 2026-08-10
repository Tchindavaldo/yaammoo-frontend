import { useEffect, useRef, useState } from "react";
import { Animated, Easing } from "react-native";

/**
 * Animation d'un bottom sheet : le fond noir apparait et disparait en fondu
 * pendant que la carte glisse depuis le bas. Le Modal reste monte le temps de
 * l'animation de sortie (d'ou `mounted`).
 */
export const useSheetAnimation = (visible: boolean, slideFrom = 340) => {
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    if (visible) setMounted(true);
    const anim = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: visible ? 260 : 200,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
    return () => anim.stop();
  }, [visible, progress]);

  const backdropOpacity = progress;
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [slideFrom, 0],
  });

  return { mounted, backdropOpacity, translateY };
};
