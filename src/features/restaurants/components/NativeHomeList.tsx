import {
  HomeListView,
  type HomeListBanner,
  type HomeListHandle,
  type HomeListIcons,
  type HomeListRow,
} from "@/modules/home-list";
import { AppBanner, FastFood, Menu } from "@/src/types";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Image, StyleSheet } from "react-native";
import { PAGE_SIZE } from "../context/FastFoodContext";
import { V4_BACKGROUNDS, V5_BACKGROUNDS, deliveryFeeLabelFor } from "./designs/item/config";
import { designNumberFor } from "../utils/designCycle";
import { getNextDeliveryTime } from "../utils/deliveryUtils";

/**
 * Pont JS de la liste NATIVE du home (`modules/home-list`, iOS).
 *
 * Prepare des donnees deja pretes a afficher (prix formates, heure de
 * livraison, frais, images de secours resolues en URL) : le Swift n'embarque
 * aucune regle metier. Recoit en retour les evenements (appui menu/banniere,
 * fin de liste, rafraichissement, bords) et les traduit pour le home.
 */

const uri = (asset: number) => Image.resolveAssetSource(asset)?.uri ?? null;

// Images locales de secours, resolues UNE fois (URL du bundle ou de Metro).
const FALLBACK_V7 = uri(require("@/assets/images/burger1-nobackground1.webp"));
const FALLBACK_V4 = V4_BACKGROUNDS.map(uri);
const FALLBACK_V5 = V5_BACKGROUNDS.map(uri);
const AVATAR_FALLBACK = uri(require("@/assets/blur3.jpg"));

const ICON_NAMES = ["flash", "star", "receipt-outline", "people-outline"] as const;

const ICONS: HomeListIcons = {
  fontFamily: Ionicons.getFontFamily?.() ?? null,
  glyphs: Object.fromEntries(
    ICON_NAMES.map((n) => [n, String.fromCodePoint(Ionicons.glyphMap[n] as number)]),
  ),
};

/** Frais de la ligne sous la carte du variant 4 (`ItemMeta`). */
const metaFeeLabelFor = (i: number) =>
  i % 3 === 0 ? "gratuite" : i % 3 === 1 ? "300F" : "1000F";

const menuIdOf = (ff: FastFood, m: any, i: number) => String(m?.id ?? `${ff.id}_${i}`);

const fallbackFor = (design: number, i: number) =>
  design === 4 ? FALLBACK_V4[i % FALLBACK_V4.length]
    : design === 5 ? FALLBACK_V5[i % FALLBACK_V5.length]
      : FALLBACK_V7;

const toRow = (ff: FastFood): HomeListRow => {
  const f = ff as any;
  const design = designNumberFor(ff.designIndex);
  return {
    id: String(ff.id),
    design,
    name: ff.nom ?? "",
    avatar: ff.image || null,
    avatarFallback: AVATAR_FALLBACK,
    orders: Math.round(f?.stats?.orders ?? 0),
    votes: Math.round(f?.stats?.votes ?? 0),
    deliveryTime: getNextDeliveryTime(f?.deliveryHours, f?.orderLeadTime ?? 0),
    menus: (ff.menu ?? []).map((m: any, i: number) => ({
      id: menuIdOf(ff, m, i),
      title: m?.titre ?? "",
      image: m?.image || null,
      fallbackImage: fallbackFor(design, i),
      price: `${m?.prix1 ?? 0} F`,
      stock: Math.round(m?.stock ?? 0),
      rating: String(m?.rating ?? 4.5),
      votes: Math.round(m?.votes ?? 0),
      feeLabel: deliveryFeeLabelFor(i),
      metaFeeLabel: metaFeeLabelFor(i),
    })),
  };
};

interface Props {
  listRef: React.Ref<HomeListHandle>;
  fastFoods: FastFood[];
  banners: AppBanner[];
  loading: boolean;
  hasMore: boolean;
  refreshing: boolean;
  bottomInset: number;
  sidePadding: number;
  footerText: string | null;
  footerIsEmpty: boolean;
  onRefresh: () => void;
  onEndReached: () => void;
  onMenuPress: (menu: Menu) => void;
  onBannerPress: (banner: AppBanner) => void;
  onEdgeChange: (atTop: boolean, nearBottom: boolean) => void;
}

export const NativeHomeList: React.FC<Props> = ({
  listRef,
  fastFoods,
  banners,
  loading,
  hasMore,
  refreshing,
  bottomInset,
  sidePadding,
  footerText,
  footerIsEmpty,
  onRefresh,
  onEndReached,
  onMenuPress,
  onBannerPress,
  onEdgeChange,
}) => {
  // L'heure de prochaine livraison avance avec le temps : recalcul chaque
  // minute et au retour au premier plan (comme `useNextDeliveryTime`).
  const [minute, setMinute] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setMinute((n) => n + 1), 60_000);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") setMinute((n) => n + 1);
    });
    return () => {
      clearInterval(t);
      sub.remove();
    };
  }, []);

  // Police Ionicons : deja chargee par l'app en general ; au cas ou, on la
  // charge (le natif retombe sinon sur des SF Symbols).
  useEffect(() => {
    Ionicons.loadFont?.().catch(() => {});
  }, []);

  const rows = useMemo(
    () => fastFoods.map(toRow),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fastFoods, minute],
  );

  const nativeBanners = useMemo<HomeListBanner[]>(
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
  const dataRef = useRef({ fastFoods, banners });
  dataRef.current = { fastFoods, banners };

  const handleMenuPress = useCallback(
    (e: { nativeEvent: { shopId: string; menuId: string } }) => {
      const { shopId, menuId } = e.nativeEvent;
      const ff: any = dataRef.current.fastFoods.find((f) => String(f.id) === shopId);
      if (!ff) return;
      const idx = (ff.menu ?? []).findIndex((m: any, i: number) => menuIdOf(ff, m, i) === menuId);
      if (idx < 0) return;
      // Meme enrichissement que `DesignRouter.handleMenuClick` : infos de
      // livraison du fastfood parent, deja presentes dans `GET /fastFood/all`.
      onMenuPress({
        ...ff.menu[idx],
        deliveryHours: ff.deliveryHours,
        orderLeadTime: ff.orderLeadTime,
        advanceDays: ff.advanceDays,
        deliveryOffer: ff.deliveryOffer ?? null,
        pickupAllowed: ff.pickupAllowed,
      } as Menu);
    },
    [onMenuPress],
  );

  const handleBannerPress = useCallback(
    (e: { nativeEvent: { id: string } }) => {
      const b = dataRef.current.banners.find((x) => String(x.id) === e.nativeEvent.id);
      if (b) onBannerPress(b);
    },
    [onBannerPress],
  );

  if (!HomeListView) return null;

  return (
    <HomeListView
      ref={listRef}
      style={styles.list}
      rows={rows}
      banners={nativeBanners}
      bannerLoading={loading && nativeBanners.length === 0}
      hasMore={hasMore}
      ghostCount={PAGE_SIZE}
      footerText={footerText}
      footerIsEmpty={footerIsEmpty}
      prefetchDistance={1200}
      bottomInset={bottomInset}
      sidePadding={sidePadding}
      refreshing={refreshing}
      icons={ICONS}
      onMenuPress={handleMenuPress}
      onBannerPress={handleBannerPress}
      onEndReached={() => onEndReached()}
      onRefresh={() => onRefresh()}
      onEdgeChange={(e) => onEdgeChange(e.nativeEvent.atTop, e.nativeEvent.nearBottom)}
    />
  );
};

const styles = StyleSheet.create({
  list: { flex: 1 },
});
