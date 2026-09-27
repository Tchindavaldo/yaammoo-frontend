import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { useFastFoods } from "./useFastFoods";

/**
 * Deep-link `/(tabs)?shop=<nom>` (tap sur une annonce de boutique) : ouvre la
 * recherche du home sur le nom de la boutique, puis retire le paramètre pour
 * qu'un retour sur le home ne relance pas la recherche.
 *
 * @param openSearch affiche le champ de recherche (état propre à l'écran).
 */
export const useShopSearchDeepLink = (openSearch: () => void) => {
  const { shop } = useLocalSearchParams<{ shop?: string }>();
  const { setSearchQuery } = useFastFoods();

  useEffect(() => {
    if (!shop) return;
    openSearch();
    setSearchQuery(String(shop));
    router.setParams({ shop: undefined });
    // `openSearch` / `setSearchQuery` changent de référence à chaque rendu :
    // seul un NOUVEAU paramètre doit relancer la recherche.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop]);
};
