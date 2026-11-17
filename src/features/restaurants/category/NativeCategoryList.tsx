"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useCallback, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { StyleSheet } from "react-native";
import type { HomeListFonts, HomeListIcons } from "@/modules/home-list";
import {
  CategoryListView,
  type CategoryListBanner,
  type CategoryListHandle,
  type CategoryListRow,
} from "@/modules/home-list/category";
import { useLanguage } from "@/src/i18n";
import { fontFor } from "@/src/theme/fonts";
import type { AppBanner } from "@/src/types";
import { afterPaint } from "@/src/utils/afterPaint";
import { createCategoryRowCache } from "./categoryRows";
import { dishIdOf, type DishGridRow, type GridDish } from "./dishGrid";

/**
 * Pont JS de la liste NATIVE des tabs categorie (`modules/home-list/category.ts`,
 * iOS et Android). Copie dediee (R16) du pont de « Tout » (`NativeHomeList`) :
 * autre vue native, autres donnees, rien de partage avec la liste « Tout ».
 */

/** Seule icone de la carte : l'etoile de la note (Ionicons, changeable par OTA). */
const ICONS: HomeListIcons = {
  fontFamily: Ionicons.getFontFamily?.() ?? null,
  glyphs: { star: String.fromCodePoint(Ionicons.glyphMap.star as number) },
};

/** Police du theme (`src/theme/fonts.ts`), noms PostScript ; `null` = systeme. */
const FONTS: HomeListFonts = {
  w600: fontFor(600),
  w700: fontFor(700),
  w800: fontFor(800),
  w900: fontFor(900),
};

export type CategoryListRef = { scrollToTop: () => void };

type SentState = {
  feedKey: string;
  rows: CategoryListRow[];
  ghostCount: number;
  hasMore: boolean;
  footerText: string | null;
  footerIsEmpty: boolean;
  loading: boolean;
};

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
  sidePadding: number;
  footerText: string | null;
  footerIsEmpty: boolean;
  onRefresh: () => void;
  onEndReached: () => void;
  onDishPress: (dish: GridDish) => void;
  onBannerPress: (banner: AppBanner) => void;
  /** Rangees du tab `feedKey` posees a l'ecran par le natif (le loader peut partir). */
  onApplied?: (feedKey: string) => void;
}

export const NativeCategoryList: React.FC<Props> = ({
  listRef,
  feedKey,
  rows,
  banners,
  loading,
  hasMore,
  refreshing,
  ghostCount,
  prefetchDistance,
  bottomInset,
  sidePadding,
  footerText,
  footerIsEmpty,
  onRefresh,
  onEndReached,
  onDishPress,
  onBannerPress,
  onApplied,
}) => {
  const lang = useLanguage();
  const cacheRef = useRef(createCategoryRowCache());
  // Nouveau tab : les records de l'ancien ne serviront plus.
  const cachedKeyRef = useRef(feedKey);
  if (cachedKeyRef.current !== feedKey) {
    cachedKeyRef.current = feedKey;
    cacheRef.current.clear();
  }
  const records = useMemo(
    () => rows.map(cacheRef.current.rowFor),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, lang],
  );

  const viewRef = useRef<CategoryListHandle>(null);
  useImperativeHandle(
    listRef,
    () => ({ scrollToTop: () => void viewRef.current?.scrollToTop() }),
    [],
  );

  // Envoi PARTIEL : a partir de la premiere rangee qui differe de ce que le
  // natif a deja. Nouveau tab (`feedKey`) : tout repart de la rangee 0.
  const sentRef = useRef<SentState | null>(null);
  const onAppliedRef = useRef(onApplied);
  onAppliedRef.current = onApplied;
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    // Premiere page en cours : RIEN n'est envoye, le natif garde l'ancien tab
    // (cache sous le loader). Un appel natif part avant que React pose le
    // loader a l'ecran : les squelettes se voyaient une image avant lui (flash
    // au changement de tab, vu image par image). Tab neuf : squelettes natifs
    // par defaut, montes dans le meme rendu que le loader.
    if (loading) return;
    const prev = sentRef.current?.feedKey === feedKey ? sentRef.current : null;
    let start = 0;
    if (prev) {
      const n = Math.min(prev.rows.length, records.length);
      while (start < n && prev.rows[start] === records[start]) start++;
    }
    const same =
      !!prev &&
      start === records.length &&
      prev.rows.length === records.length &&
      prev.ghostCount === ghostCount &&
      prev.hasMore === hasMore &&
      prev.footerText === footerText &&
      prev.footerIsEmpty === footerIsEmpty &&
      prev.loading === loading;
    if (same) return;
    sentRef.current = { feedKey, rows: records, ghostCount, hasMore, footerText, footerIsEmpty, loading };
    view
      .updateRows({
        feedKey,
        start,
        rows: records.slice(start),
        total: records.length,
        hasMore,
        ghostCount,
        footerText,
        footerIsEmpty,
        loading,
      })
      // Le natif peut poser les rangees APRES que React retire le loader
      // (gros tab, ex. « Autres ») : l'ancien tab se voyait une image. Le
      // loader attend donc cette confirmation, plus une image a l'ecran.
      .then(() => afterPaint(() => onAppliedRef.current?.(feedKey)))
      .catch((error) => {
        // Etat natif inconnu : le prochain envoi repartira de la rangee 0.
        sentRef.current = null;
        console.warn("[NATIVE] categorie : updateRows a echoue", error);
        onAppliedRef.current?.(feedKey);
      });
  }, [feedKey, records, ghostCount, hasMore, footerText, footerIsEmpty, loading]);

  const nativeBanners = useMemo<CategoryListBanner[]>(
    () =>
      (banners ?? []).map((b) => ({
        id: String(b.id),
        imageUrl: b.imageUrl,
        title: (b as any).title ?? null,
        tappable: b.type === "bonus",
      })),
    [banners],
  );

  // Refs : les handlers natifs restent stables, les donnees sont lues a l'appel.
  const dataRef = useRef({ rows, banners });
  dataRef.current = { rows, banners };

  const handleMenuPress = useCallback(
    (e: { nativeEvent: { rowId: string; dishId: string } }) => {
      const { rowId, dishId } = e.nativeEvent;
      const row = dataRef.current.rows.find((r) => r.id === rowId);
      const dish = row?.dishes.find((d) => dishIdOf(d) === dishId);
      if (dish) onDishPress(dish);
    },
    [onDishPress],
  );

  const handleBannerPress = useCallback(
    (e: { nativeEvent: { id: string } }) => {
      const b = dataRef.current.banners.find((x) => String(x.id) === e.nativeEvent.id);
      if (b) onBannerPress(b);
    },
    [onBannerPress],
  );

  if (!CategoryListView) return null;

  return (
    <CategoryListView
      ref={viewRef}
      style={styles.list}
      banners={nativeBanners}
      prefetchDistance={prefetchDistance}
      bottomInset={bottomInset}
      sidePadding={sidePadding}
      refreshing={refreshing}
      icons={ICONS}
      fonts={FONTS}
      onMenuPress={handleMenuPress}
      onBannerPress={handleBannerPress}
      onEndReached={() => onEndReached()}
      onRefresh={() => onRefresh()}
    />
  );
};

const styles = StyleSheet.create({
  list: { flex: 1 },
});
