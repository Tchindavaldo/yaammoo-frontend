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

/**
 * Mise a jour PARTIELLE de la liste (`updateRows`) : seules les rangees a partir
 * de `start` sont envoyees, la liste est ramenee a `total`. L'etat de fin de
 * liste voyage dans le meme appel que les rangees qu'il encadre.
 */
export type HomeListRowsUpdate = {
  start: number;
  rows: HomeListRow[];
  total: number;
  hasMore: boolean;
  ghostCount: number;
  footerText: string | null;
  footerIsEmpty: boolean;
};

export type HomeListViewProps = ViewProps & {
  banners: HomeListBanner[];
  bannerLoading: boolean;
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
  /** Sonde de fluidite : `kind: "scroll"` (par geste) ou `"apply"` (par page). */
  onDiagnostics: (e: Event<Record<string, any>>) => void;
};

export type HomeListHandle = {
  scrollToTop: () => Promise<void>;
};

/**
 * Methodes de la vue native. ⚠️ Les boutiques passent par `updateRows`, jamais
 * par une prop : une prop renvoie toute la liste a chaque page et le natif la
 * decode sur le fil de l'ecran (accrocs croissants avec la longueur de liste).
 */
export type HomeListNativeHandle = HomeListHandle & {
  updateRows: (update: HomeListRowsUpdate) => Promise<void>;
};

export const isHomeListAvailable =
  Platform.OS === "ios" && requireOptionalNativeModule("HomeList") != null;

export const HomeListView: ComponentType<
  HomeListViewProps & { ref?: Ref<HomeListNativeHandle> }
> | null = isHomeListAvailable ? requireNativeView("HomeList") : null;
