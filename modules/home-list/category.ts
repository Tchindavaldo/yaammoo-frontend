import { requireNativeView, requireOptionalNativeModule } from "expo";
import type { ComponentType, Ref } from "react";
import { Platform, type ViewProps } from "react-native";
import type { HomeListFonts, HomeListIcons } from "./index";

/**
 * Liste native des tabs CATEGORIE du home (Poulet, Burger, Pizza, Autre) :
 * UICollectionView (iOS), RecyclerView (Android). SEPAREE de la liste « Tout »
 * (`HomeListView`) : autre vue native, autre etat, autres cellules.
 *
 * ⚠️ N'existe que dans un build natif qui l'embarque. Sur une build plus
 * ancienne, `isCategoryListAvailable` vaut `false` et le home garde un repli
 * (voir `CategoryHomeList.tsx`).
 */

export type CategoryListDish = {
  id: string;
  title: string;
  image: string | null;
  fallbackImage: string | null;
  price: string;
  /** Note (« 4.5 ») ou « Nouveau » sans avis. */
  rating: string;
  votes: number;
  /** Libelles du design aere, deja calcules par `aere/labels.ts`. */
  stockValue: string;
  stockUnit: string;
  stockLow: boolean;
  stockRatio: number;
  feeText: string;
  feeFree: boolean;
  eta: string;
};

/** Rangee de la grille : N plats de boutiques differentes. */
export type CategoryListRow = { id: string; dishes: CategoryListDish[] };

export type CategoryListBanner = {
  id: string;
  imageUrl: string;
  title: string | null;
  tappable: boolean;
};

/**
 * Mise a jour PARTIELLE (`updateRows`). `feedKey` change = autre tab : le natif
 * repart a zero (squelettes banniere comprise, attente avant le fondu, haut).
 */
export type CategoryListUpdate = {
  feedKey: string;
  start: number;
  rows: CategoryListRow[];
  total: number;
  hasMore: boolean;
  ghostCount: number;
  footerText: string | null;
  footerIsEmpty: boolean;
  loading: boolean;
};

type Event<T> = { nativeEvent: T };

export type CategoryListViewProps = ViewProps & {
  banners: CategoryListBanner[];
  prefetchDistance: number;
  bottomInset: number;
  sidePadding: number;
  refreshing: boolean;
  icons: HomeListIcons;
  fonts: HomeListFonts;
  onMenuPress: (e: Event<{ rowId: string; dishId: string }>) => void;
  onBannerPress: (e: Event<{ id: string }>) => void;
  onEndReached: (e: Event<Record<string, never>>) => void;
  onRefresh: (e: Event<Record<string, never>>) => void;
};

export type CategoryListHandle = {
  scrollToTop: () => Promise<void>;
  updateRows: (update: CategoryListUpdate) => Promise<void>;
};

export const isCategoryListAvailable =
  (Platform.OS === "ios" || Platform.OS === "android") &&
  requireOptionalNativeModule("CategoryList") != null;

export const CategoryListView: ComponentType<
  CategoryListViewProps & { ref?: Ref<CategoryListHandle> }
> | null = isCategoryListAvailable ? requireNativeView("CategoryList") : null;
