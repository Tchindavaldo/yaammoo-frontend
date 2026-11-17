"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import { FlashList } from "@shopify/flash-list";
import React, { useImperativeHandle, useMemo, useRef } from "react";
import { RefreshControl } from "react-native";
import { isHomeListAvailable, type HomeListHandle } from "@/modules/home-list";
import { Theme } from "@/src/theme";
import type { AppBanner, FastFood, Menu } from "@/src/types";
import { NativeHomeList } from "../components/NativeHomeList";
import { PageRevealGateProvider } from "../context/PageRevealGate";
import { ShopRevealProvider } from "../context/ShopRevealContext";
import { useHomeListData } from "../hooks/useHomeListData";
import { useHomeListRenderers } from "../hooks/useHomeListRenderers";
import { toLegacyGridRows, type DishGridRow } from "./dishGrid";
import type { CategoryListRef } from "./NativeCategoryList";

/**
 * REPLI des tabs categorie quand la build n'embarque pas la liste categorie
 * native (`isCategoryListAvailable` faux : build anterieure, mise a jour OTA).
 * Les donnees restent celles du tab (`useCategoryFeed`), jamais celles de « Tout ».
 * - liste native du home presente : une instance A PART de `NativeHomeList`,
 *   recreee a chaque tab (`key`) : squelettes + attente de la grille a chaque bascule ;
 * - aucune liste native (Expo Go, web) : FlashList a part.
 * A retirer une fois toutes les builds en circulation dotees de la liste categorie.
 */

interface Props {
  listRef: React.Ref<CategoryListRef>;
  feedKey: string;
  rows: DishGridRow[];
  banners: AppBanner[];
  loading: boolean;
  hasMore: boolean;
  refreshing: boolean;
  ghostCount: number;
  prefetchDistance: number;
  bottomInset: number;
  footerText: string | null;
  footerIsEmpty: boolean;
  onRefresh: () => void;
  onEndReached: () => void;
  onMenuPress: (menu: Menu) => void;
  onBannerPress: (banner: AppBanner) => void;
}

export const CategoryListFallback: React.FC<Props> = (props) => {
  const legacyRows = useMemo(() => toLegacyGridRows(props.rows), [props.rows]);
  if (isHomeListAvailable) return <LegacyNativeGrid {...props} legacyRows={legacyRows} />;
  return <FlashGrid {...props} legacyRows={legacyRows} />;
};

type InnerProps = Props & { legacyRows: FastFood[] };

const LegacyNativeGrid: React.FC<InnerProps> = (p) => {
  const nativeRef = useRef<HomeListHandle>(null);
  useImperativeHandle(p.listRef, () => ({ scrollToTop: () => void nativeRef.current?.scrollToTop() }), []);
  return (
    <NativeHomeList
      key={p.feedKey}
      listRef={nativeRef}
      fastFoods={p.legacyRows}
      banners={p.banners}
      loading={p.loading}
      hasMore={p.hasMore}
      refreshing={p.refreshing}
      bottomInset={p.bottomInset}
      sidePadding={Theme.design.horizontalPadding}
      footerText={p.footerText}
      footerIsEmpty={p.footerIsEmpty}
      ghostCount={p.ghostCount}
      prefetchDistance={p.prefetchDistance}
      onRefresh={p.onRefresh}
      onEndReached={p.onEndReached}
      onMenuPress={p.onMenuPress}
      onBannerPress={p.onBannerPress}
      onEdgeChange={() => {}}
    />
  );
};

const FlashGrid: React.FC<InnerProps> = (p) => {
  const listRef = useRef<any>(null);
  useImperativeHandle(
    p.listRef,
    () => ({ scrollToTop: () => listRef.current?.scrollToOffset({ offset: 0, animated: true }) }),
    [],
  );
  const { firstScreenUris, listData, drawDistance } = useHomeListData({
    fastFoods: p.legacyRows,
    banners: p.banners,
    hasMore: p.hasMore,
    loading: p.loading,
  });
  const { listFooter, renderItem, keyExtractor, getItemType } = useHomeListRenderers({
    banners: p.banners,
    loading: p.loading,
    hasMore: p.hasMore,
    fastFoodsCount: p.legacyRows.length,
    searchQuery: "",
    onBannerPress: p.onBannerPress,
    onMenuClick: p.onMenuPress,
  });
  return (
    <ShopRevealProvider key={p.feedKey} expect={firstScreenUris}>
      {/* Verrou de page de « Tout » NON partage. */}
      <PageRevealGateProvider value={null}>
        <FlashList
          ref={listRef}
          data={listData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemType={getItemType}
          drawDistance={drawDistance}
          onEndReached={p.onEndReached}
          onEndReachedThreshold={0.5}
          contentContainerStyle={{
            paddingBottom: p.bottomInset,
            paddingHorizontal: Theme.design.horizontalPadding,
          }}
          refreshControl={
            <RefreshControl
              refreshing={p.refreshing}
              onRefresh={p.onRefresh}
              tintColor={Theme.colors.primary}
              colors={[Theme.colors.primary]}
            />
          }
          ListFooterComponent={listFooter}
        />
      </PageRevealGateProvider>
    </ShopRevealProvider>
  );
};
