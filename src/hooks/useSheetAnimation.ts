// Animation des bottom sheets (R28) : voile en FONDU, sheet qui MONTE du bas a
// l'ouverture et REDESCEND a la fermeture. La Modal est en animationType="none".
// Meme mecanique que AccountSheet. `visible` a false => animation de sortie puis
// demontage (mounted = false).
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, LayoutChangeEvent } from "react-native";

export function useSheetAnimation(visible: boolean) {
  const progress = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);
  const [sheetH, setSheetH] = useState(600);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.setValue(0);
      Animated.timing(progress, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    } else {
      Animated.timing(progress, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => setMounted(false));
    }
  }, [visible, progress]);

  return {
    mounted,
    backdropStyle: { opacity: progress },
    sheetStyle: { transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [sheetH, 0] }) }] },
    onSheetLayout: (e: LayoutChangeEvent) => setSheetH(e.nativeEvent.layout.height),
  };
}
