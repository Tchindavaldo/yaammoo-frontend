// Animation de MerchantAdhesionSheet (copie dediee de useSheetAnimation, R16) :
// voile en FONDU, sheet qui MONTE du bas, et l'inverse a la fermeture (R28).
// Difference : l'entree demarre a `onShow` de la Modal. Lancee au montage
// (sheet affichee des l'ouverture du home), l'animation partait avant que la
// Modal soit a l'ecran : voile absent, sheet blanche confondue avec le home.
import { useEffect, useRef, useState } from "react";
import { trackBoot } from "@/src/services/netTelemetry";
import { Animated, Easing, LayoutChangeEvent } from "react-native";

export function useAdhesionSheetAnimation(visible: boolean) {
  const progress = useRef(new Animated.Value(0)).current;
  // Voile pilote en JS (pas natif) : sous Fabric, l'opacite native du voile
  // restait a 0 dans la Modal (sheet montee, voile invisible, vu sur iPhone).
  const veil = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);
  const [sheetH, setSheetH] = useState(800);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      return;
    }
    Animated.timing(veil, { toValue: 0, duration: 220, useNativeDriver: false }).start();
    Animated.timing(progress, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() =>
      setMounted(false),
    );
  }, [visible, progress, veil]);

  const onShow = () => {
    progress.setValue(0);
    veil.setValue(0);
    Animated.timing(veil, { toValue: 1, duration: 320, useNativeDriver: false }).start(r =>
      trackBoot("adhesion voile fin", { finished: r.finished, veil: (veil as any).__getValue?.() }),
    );
    Animated.timing(progress, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  };

  return {
    mounted,
    onShow,
    backdropStyle: { opacity: veil },
    sheetStyle: { transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [sheetH, 0] }) }] },
    onSheetLayout: (e: LayoutChangeEvent) => setSheetH(e.nativeEvent.layout.height),
  };
}
