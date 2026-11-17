"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import { useNavigation } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { isCategoryListAvailable } from "@/modules/home-list/category";
import { t, useLanguage } from "@/src/i18n";
import { Theme } from "@/src/theme";
import { DS } from "@/src/theme/ds";
import type { AppBanner, Menu } from "@/src/types";
import { useFastFoodContext } from "../context/FastFoodContext";
import { CategoryListFallback } from "./CategoryListFallback";
import { CategoryLoadingScreen } from "./CategoryLoadingScreen";
import { dishToMenu, type GridDish } from "./dishGrid";
import { NativeCategoryList, type CategoryListRef } from "./NativeCategoryList";
import { useCategoryFeed } from "./useCategoryFeed";
import { useCategoryLoader } from "./useCategoryLoader";

/** Rangees squelettes : premiere page, puis queue de la page suivante. */
const GHOST_ROWS = 3;

interface Props {
  /** Valeur API du tab (`categoryApiValue`), jamais « Tout ». */
  category: string;
  bottomInset: number;
  /** Hauteur de la navbar : le loader se centre au-dessus. */
  tabBarHeight: number;
  onMenuPress: (menu: Menu) => void;
  onBannerPress: (banner: AppBanner) => void;
}

/**
 * Tabs categorie du home (Poulet, Burger, Pizza, Autre) : posee PAR-DESSUS la
 * liste « Tout », qui reste montee dessous (rechargee au retour, cf.
 * `useToutLoader`). Donnees propres (`useCategoryFeed`),
 * liste native propre (`NativeCategoryList`) ; repli `CategoryListFallback`
 * sur une build qui ne l'embarque pas encore.
 */
export const CategoryHomeList: React.FC<Props> = ({
  category,
  bottomInset,
  tabBarHeight,
  onMenuPress,
  onBannerPress,
}) => {
  useLanguage();
  const { banners, homeSettings } = useFastFoodContext();
  const feed = useCategoryFeed(category);
  // Requete du tab : loader, puis squelettes seulement s'il y a des plats.
  const baseLoader = useCategoryLoader(feed.loading, feed.rows.length);
  // Liste native : le loader reste tant qu'elle n'a pas confirme avoir pose
  // les plats du tab (`onApplied`) ; filet de securite `APPLY_TIMEOUT_MS`.
  const [appliedKey, setAppliedKey] = useState<string | null>(null);
  // Nouvelle requete (meme tab revisite) : confirmation a refaire.
  if (feed.loading && appliedKey !== null) setAppliedKey(null);
  const waitingNative =
    isCategoryListAvailable && !feed.loading && feed.rows.length > 0 && appliedKey !== feed.feedKey;
  useEffect(() => {
    if (!waitingNative) return;
    const key = feed.feedKey;
    const timer = setTimeout(() => setAppliedKey(key), APPLY_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [waitingNative, feed.feedKey]);
  const loader = baseLoader || waitingNative;
  const empty = !feed.loading && feed.rows.length === 0;
  const footerText = feed.loading
    ? null
    : empty
      ? feed.error
        ? t("Connection internet indisponible, vérifiez votre réseau")
        : t("Aucun plat dans cette catégorie")
      : !feed.hasMore
        ? t("Vous avez vu tous les plats")
        : null;

  // Tap sur l'onglet Home deja affiche : la grille remonte (pas « Tout », dessous).
  const listRef = useRef<CategoryListRef>(null);
  const navigation = useNavigation();
  useEffect(() => {
    const unsubscribe = (navigation as any).addListener("tabPress", () => {
      if ((navigation as any).isFocused()) listRef.current?.scrollToTop();
    });
    return unsubscribe;
  }, [navigation]);

  const handleDishPress = useCallback((d: GridDish) => onMenuPress(dishToMenu(d)), [onMenuPress]);
  const loadMore = feed.loadMore;
  const refresh = feed.refresh;
  const onEndReached = useCallback(() => loadMore(), [loadMore]);
  const onRefresh = useCallback(() => void refresh(), [refresh]);

  const common = {
    listRef,
    feedKey: feed.feedKey,
    rows: feed.rows,
    banners,
    loading: feed.loading,
    hasMore: feed.hasMore,
    refreshing: feed.refreshing,
    ghostCount: GHOST_ROWS,
    prefetchDistance: homeSettings.prefetchDistance,
    bottomInset,
    footerText,
    footerIsEmpty: empty,
    onRefresh,
    onEndReached,
    onBannerPress,
  };

  return (
    <View style={[StyleSheet.absoluteFill, styles.cover]}>
      {/* Grille MASQUEE (opacite 0) tant que le loader est la : ses squelettes
          se voyaient avec lui a l'entree du tab (flash). `collapsable`
          garde la meme vue native (pas d'aplatissement a chaque bascule). */}
      <View collapsable={false} style={[styles.fill, loader && styles.hidden]}>
        {isCategoryListAvailable ? (
          <NativeCategoryList
            {...common}
            sidePadding={Theme.design.horizontalPadding}
            onDishPress={handleDishPress}
            onApplied={setAppliedKey}
          />
        ) : (
          <CategoryListFallback {...common} onMenuPress={onMenuPress} />
        )}
      </View>
      {loader && <CategoryLoadingScreen bottomInset={tabBarHeight} />}
    </View>
  );
};

/** Confirmation native absente : le loader part quand meme apres ce delai. */
const APPLY_TIMEOUT_MS = 800;

const styles = StyleSheet.create({
  // Fond plein : « Tout », dessous, ne transparait jamais.
  cover: { backgroundColor: DS.bg },
  fill: { flex: 1 },
  hidden: { opacity: 0 },
});
