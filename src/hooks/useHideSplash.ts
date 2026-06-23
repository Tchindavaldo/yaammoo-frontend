import { useCallback, useRef } from "react";
import * as SplashScreen from "expo-splash-screen";

// Vrai une fois que le splash natif a été caché (1re fois). Sert à savoir si on
// est encore "sous le splash" (boot) : tant que c'est faux, les bascules de
// groupe de navigation se font sous le splash et ne doivent PAS être animées.
let splashHidden = false;
export const isSplashHidden = () => splashHidden;

// Abonnés notifiés une fois quand le splash se cache (pour re-render réactif).
const splashListeners = new Set<() => void>();
export const onSplashHidden = (cb: () => void) => {
  if (splashHidden) {
    cb();
    return () => {};
  }
  splashListeners.add(cb);
  return () => splashListeners.delete(cb);
};

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
      splashHidden = true;
      SplashScreen.hideAsync().catch(() => {});
      splashListeners.forEach((cb) => cb());
      splashListeners.clear();
    });
  }, []);
}
