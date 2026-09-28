import { useTabBarStyle } from "@/src/hooks/useTabBarStyle";
import { useNavigation } from "expo-router";
import { useEffect } from "react";

/**
 * Page Bonus V2 (fond blanc pur) : l'ombre montante de la tab bar cree une
 * bande grise disgracieuse. On l'adoucit tant que la modale V2 est ouverte.
 * Le reste du style vient de `useTabBarStyle`, commun a toutes les pages.
 */
export function useSettingsTabBarStyle(bonusVisible: boolean) {
  const navigation = useNavigation();
  const base = useTabBarStyle();

  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: bonusVisible
        ? {
            ...base,
            elevation: 2,
            shadowOffset: { width: 0, height: -1 },
            shadowOpacity: 0.05,
            shadowRadius: 3,
          }
        : base,
    });
  }, [bonusVisible, navigation, base]);
}
