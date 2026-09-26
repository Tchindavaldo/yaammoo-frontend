import { isNativeBlurAvailable } from "@/src/components/AppBlurView";
import { TAB_BAR_INSET_RATIO } from "@/src/hooks/useTabBarHeight";
import { useNavigation } from "expo-router";
import { useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Page Bonus V2 (fond blanc pur) : l'ombre montante de la tab bar crée une
 * bande grise disgracieuse. On la retire tant que la modale V2 est ouverte,
 * puis on restaure le style par défaut à la fermeture (navbar inchangée sinon).
 */
export function useSettingsTabBarStyle(bonusVisible: boolean) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    // MEME calcul que `app/(tabs)/_layout.tsx` / `useTabBarHeight` : la navbar
    // ne doit pas changer de hauteur d'un onglet a l'autre.
    const bottomInset = insets.bottom * TAB_BAR_INSET_RATIO;
    const base = {
      height: 64 + bottomInset,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      // MEME regle que `_layout.tsx` : sans flou natif (Android < 12), un fond
      // semi-transparent laisse voir le contenu au travers -> blanc opaque.
      backgroundColor: isNativeBlurAvailable
        ? "rgba(255, 255, 255, 0.7)"
        : "#ffffff",
      borderTopWidth: 0,
      position: "absolute" as const,
      bottom: 0,
      left: 0,
      right: 0,
      paddingBottom: bottomInset,
      paddingTop: 8,
    };
    navigation.setOptions({
      tabBarStyle: bonusVisible
        ? {
            ...base,
            elevation: 2,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -1 },
            shadowOpacity: 0.05,
            shadowRadius: 3,
          }
        : {
            ...base,
            elevation: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
          },
    });
  }, [bonusVisible, navigation, insets.bottom]);
}
