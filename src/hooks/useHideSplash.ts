import { useCallback, useRef } from "react";
import * as SplashScreen from "expo-splash-screen";

/**
 * Cache le splash natif UNE SEULE FOIS, depuis l'écran de destination, via son
 * `onLayout`. Garantit que l'écran cible (home / login) est réellement monté et
 * peint avant que le splash disparaisse → aucune page blanche intermédiaire.
 *
 * Usage :
 *   const onLayoutRootView = useHideSplash();
 *   return <View onLayout={onLayoutRootView} style={{ flex: 1 }}>...</View>;
 */
export function useHideSplash() {
  const hidden = useRef(false);

  return useCallback(() => {
    if (hidden.current) return;
    hidden.current = true;
    // Laisse une frame supplémentaire pour que le contenu soit dessiné, puis cache.
    requestAnimationFrame(() => {
      SplashScreen.hideAsync().catch(() => {});
    });
  }, []);
}
