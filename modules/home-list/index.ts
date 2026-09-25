import { requireNativeView, requireOptionalNativeModule } from "expo";
import type { ComponentType, Ref } from "react";
import { Platform, type ViewProps } from "react-native";

/**
 * Liste native (UICollectionView) du home — iOS uniquement.
 *
 * ⚠️ Le module n'existe que dans un build natif qui l'embarque. Sur un
 * dev client plus ancien (ou Android), `isHomeListAvailable` vaut `false` et
 * le home garde sa FlashList : aucune erreur, aucun ecran vide.
 */

export type HomeListMenu = {
  id: string;
  title: string;
  image: string | null;
  fallbackImage: string | null;
  price: string;
  stock: number;
  rating: string;
  votes: number;
  feeLabel: string;
  metaFeeLabel: string;
};

export type HomeListRow = {
  id: string;
  design: number;
  name: string;
  avatar: string | null;
  avatarFallback: string | null;
  orders: number;
  votes: number;
  deliveryTime: string;
  menus: HomeListMenu[];
};

export type HomeListBanner = {
  id: string;
  imageUrl: string;
  title: string | null;
  tappable: boolean;
};

export type HomeListIcons = {
  fontFamily: string | null;
  glyphs: Record<string, string>;
};

type Event<T> = { nativeEvent: T };

export type HomeListViewProps = ViewProps & {
  rows: HomeListRow[];
  banners: HomeListBanner[];
  bannerLoading: boolean;
  hasMore: boolean;
  ghostCount: number;
  footerText: string | null;
  footerIsEmpty: boolean;
  prefetchDistance: number;
  bottomInset: number;
  sidePadding: number;
  refreshing: boolean;
  icons: HomeListIcons;
  onMenuPress: (e: Event<{ shopId: string; menuId: string }>) => void;
  onBannerPress: (e: Event<{ id: string }>) => void;
  onEndReached: (e: Event<Record<string, never>>) => void;
  onRefresh: (e: Event<Record<string, never>>) => void;
  onEdgeChange: (e: Event<{ atTop: boolean; nearBottom: boolean }>) => void;
};

export type HomeListHandle = {
  scrollToTop: () => Promise<void>;
};

export const isHomeListAvailable =
  Platform.OS === "ios" && requireOptionalNativeModule("HomeList") != null;

export const HomeListView: ComponentType<
  HomeListViewProps & { ref?: Ref<HomeListHandle> }
> | null = isHomeListAvailable ? requireNativeView("HomeList") : null;
