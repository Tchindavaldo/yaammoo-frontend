// Animation de MerchantAdhesionSheet (copie dediee de useSheetAnimation, R16) :
// voile en FONDU, sheet qui MONTE du bas, et l'inverse a la fermeture (R28).
// Difference : l'entree demarre a `onShow` de la Modal. Lancee au montage
// (sheet affichee des l'ouverture du home), l'animation partait avant que la
// Modal soit a l'ecran : voile absent, sheet blanche confondue avec le home.
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, LayoutChangeEvent } from "react-native";

export function useAdhesionSheetAnimation(visible: boolean) {
  const progress = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);
  const [sheetH, setSheetH] = useState(800);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      return;
    }
    Animated.timing(progress, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() =>
      setMounted(false),
    );
  }, [visible, progress]);

  const onShow = () => {
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  };

  return {
    mounted,
    onShow,
    backdropStyle: { opacity: progress },
    sheetStyle: { transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [sheetH, 0] }) }] },
    onSheetLayout: (e: LayoutChangeEvent) => setSheetH(e.nativeEvent.layout.height),
  };
}
