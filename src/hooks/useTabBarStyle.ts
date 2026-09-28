import { isNativeBlurAvailable } from "@/src/components/AppBlurView";
import { useBottomSafeArea } from "@/src/hooks/usePageBottomInset";
import { TAB_BAR_PADDING_TOP, useTabBarHeight } from "@/src/hooks/useTabBarHeight";
import { useMemo } from "react";
import type { ViewStyle } from "react-native";

/**
 * Style UNIQUE de la tab bar : `app/(tabs)/_layout.tsx` le pose par defaut, et
 * tout ecran qui ajuste la navbar (ex. Profil) part de cette base au lieu de
 * redefinir le style a la main.
 */
export function useTabBarStyle(): ViewStyle {
  const bottomInset = useBottomSafeArea();
  const tabBarHeight = useTabBarHeight();
  return useMemo(
    () => ({
      height: tabBarHeight,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      // Sans flou natif (Android < 12), un fond semi-transparent laisse voir
      // le contenu au travers -> blanc opaque.
      backgroundColor: isNativeBlurAvailable
        ? "rgba(255, 255, 255, 0.7)"
        : "#ffffff",
      borderTopWidth: 0,
      elevation: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      paddingBottom: bottomInset,
      paddingTop: TAB_BAR_PADDING_TOP,
    }),
    [tabBarHeight, bottomInset],
  );
}
