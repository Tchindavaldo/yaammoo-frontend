"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import { ActivityIndicator } from "@/src/components/CustomActivityIndicator";
import { Toast } from "@/src/components/Toast";
import { useOrders } from "@/src/features/orders/hooks/useOrders";
import { useFastFoods } from "@/src/features/restaurants/hooks/useFastFoods";
import { useShopSearchDeepLink } from "@/src/features/restaurants/hooks/useShopSearchDeepLink";
import { useTabBarHeight } from "@/src/hooks/useTabBarHeight";
import { Theme } from "@/src/theme";
import React, { useCallback, useEffect, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CheckoutSheet } from "@/src/features/checkout/components/CheckoutSheet";
import { ShopRevealProvider } from "@/src/features/restaurants/context/ShopRevealContext";
import { PageRevealGateProvider } from "@/src/features/restaurants/context/PageRevealGate";
import { HomeHeader } from "@/src/features/restaurants/components/home/HomeHeader";
import {
  HomeErrorScreen,
  HomeLoadingScreen,
} from "@/src/features/restaurants/components/home/HomeFullScreenStates";
import { HomeLocationRequired } from "@/src/features/restaurants/components/home/HomeLocationRequired";
import { useFastFoodContext } from "@/src/features/restaurants/context/FastFoodContext";
import { HomeLocationBanner } from "@/src/features/restaurants/components/home/HomeLocationBanner";
import { HomeFlashList } from "@/src/features/restaurants/components/home/HomeFlashList";
import { useLocationAccess } from "@/src/features/location/hooks/useLocationAccess";
import { SHOW_LOCATION_BANNER } from "@/src/features/location/config";
import { homeStyles as styles } from "@/src/features/restaurants/components/home/homeScreenStyles";
import { useCityChangeLoader } from "@/src/features/restaurants/hooks/useCityChangeLoader";
import { useHomeCheckout } from "@/src/features/restaurants/hooks/useHomeCheckout";
import { categoryApiValue } from "@/src/features/restaurants/category/categoryApi";
import { CategoryHomeList } from "@/src/features/restaurants/category/CategoryHomeList";
import { useHomeListData } from "@/src/features/restaurants/hooks/useHomeListData";
import { useHomeListRenderers } from "@/src/features/restaurants/hooks/useHomeListRenderers";
import { useHomeListScroll } from "@/src/features/restaurants/hooks/useHomeListScroll";
import { usePageRevealLock } from "@/src/features/restaurants/hooks/usePageRevealLock";
import { AppBanner } from "@/src/types";
import { NativeHomeList } from "@/src/features/restaurants/components/NativeHomeList";
import { isHomeListAvailable } from "@/modules/home-list";

import { useAuth } from "@/src/features/auth/context/AuthContext";
import { useNotifications } from "@/src/features/notifications/hooks/useNotifications";
import { useHideSplash } from "@/src/hooks/useHideSplash";
import { useMerchantMode } from "@/src/features/merchant/context/MerchantModeContext";
import { MerchantHome } from "@/src/features/profile/components/shop-hero/MerchantHome";
import { useFocusEffect, useNavigation, useRouter } from "expo-router";
import { useTabBarStyle } from "@/src/hooks/useTabBarStyle";
import {
  clearVisibleShops,
  setShopImpressionsPaused,
  setVisibleShops,
} from "@/src/services/analytics/shopImpressions";
import { homePageOf } from "@/src/services/analytics/homePages";
import { track } from "@/src/services/analytics/analytics";
import { t, useLanguage } from "@/src/i18n";
import { trackBoot } from "@/src/services/netTelemetry";

const seenBanners = new Set<string>();

/**
 * Home client : en-tete, banniere + boutiques paginees (liste NATIVE iOS quand
 * le build l'embarque, FlashList sinon), commande d'un menu.
 *
 * La logique vit dans `src/features/restaurants/` : `hooks/useHome*` (scroll,
 * donnees, rendu des cellules, commande, sonde), `hooks/usePageRevealLock`
 * (verrou de page) et `components/home/` (en-tete, ecrans plein, styles).
 * Voir architecture/restaurants.md.
 */
export default function HomeTab() {
  const { isMerchant, isMerchantMode } = useMerchantMode();
  // Home client TOUJOURS monte et mis en page en plein ecran, meme en mode
  // marchand (recouvert par le home marchand). Le demonter / le masquer a
  // chaque bascule laissait la liste native des boutiques sans images
  // (squelettes figes jusqu'au pull-to-refresh).
  return (
    <View style={{ flex: 1 }}>
      <View
        style={{ flex: 1 }}
        pointerEvents={isMerchantMode ? "none" : "auto"}
        importantForAccessibility={isMerchantMode ? "no-hide-descendants" : "auto"}
        accessibilityElementsHidden={isMerchantMode}
      >
        <HomeScreen />
      </View>
      {/* Home marchand garde monte lui aussi (masque en mode client) : header
          et sections stables d'une bascule a l'autre. */}
      {isMerchant && (
        <View style={[StyleSheet.absoluteFill, { display: isMerchantMode ? "flex" : "none" }]}>
          <MerchantHome />
        </View>
      )}
    </View>
  );
}

function HomeScreen() {
  useLanguage();
  const onLayoutRootView = useHideSplash();
  const { ensureProfileRefreshed } = useAuth();
  const { unreadCount, ensureLoaded: ensureNotificationsLoaded } =
    useNotifications();
  const { ensureLoaded: ensureOrdersLoaded } = useOrders();

  // Tout ce qui n'est pas indispensable a l'affichage part d'ICI, une fois
  // l'app a l'ecran : sous le splash, seules `/fastFood/all` et
  // `/settings/app-version` ont le droit de partir. Les badges panier et
  // notifications tiennent sur leur cache en attendant ces reponses.
  useEffect(() => {
    trackBoot("home monte");
    void ensureProfileRefreshed();
    ensureNotificationsLoaded();
    ensureOrdersLoaded();
  }, [ensureProfileRefreshed, ensureNotificationsLoaded, ensureOrdersLoaded]);
  const router = useRouter();
  const {
    fastFoods,
    loading,
    error,
    loadingMore,
    hasMore,
    loadMore,
    refresh,
    resetToFirstPage,
    notifyUserScroll,
    cancelPendingLoadMore,
    setListAtBottom,
    notifyPageLaidOut,
    insertLock,
    banners,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    homeSettings,
  } = useFastFoods();
  // Tab categorie : liste A PART posee sur « Tout » (CategoryHomeList), qui
  // reste montee et intacte. Boutiques de « Tout » recouvertes : non comptees.
  const category = categoryApiValue(selectedCategory);
  const { isMerchantMode } = useMerchantMode();
  useEffect(() => {
    setShopImpressionsPaused(isMerchantMode || !!category);
  }, [isMerchantMode, category]);
  const locationAccess = useLocationAccess();
  const { homeCity } = useFastFoodContext();
  // Sans localisation ni ville choisie a la main : pas de boutiques, ecran
  // d'activation (+ choix d'une ville). Marchand : ville de sa boutique.
  const needsLocation =
    locationAccess.state === "blocked" && !homeCity.manual && !homeCity.isMerchant;
  // Localisation accordee (bouton, reglages) : ville par defaut recalculee
  // avec la vraie position.
  const prevAccess = React.useRef(locationAccess.state);
  useEffect(() => {
    if (prevAccess.current === "blocked" && locationAccess.state === "granted" && !homeCity.manual) {
      void homeCity.resetToMyLocation();
    }
    prevAccess.current = locationAccess.state;
  }, [locationAccess.state, homeCity]);
  const tabBarHeight = useTabBarHeight();
  const tabBarStyle = useTabBarStyle();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 100 + insets.top;

  const [searchOpen, setSearchOpen] = useState(false);
  // Tap sur une annonce de boutique : recherche ouverte sur son nom.
  useShopSearchDeepLink(() => setSearchOpen(true));
  const checkout = useHomeCheckout();

  // For testing: force loader to persist
  // Changement de ville : loader plein ecran visible au moins un instant.
  const cityChanging = useCityChangeLoader(homeCity.city);
  const forceLoading = cityChanging || homeCity.resolving;
  const [refreshing, setRefreshing] = useState(false);

  const onManualRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  // Verrou de page (FlashList) puis defilement : cet ordre garde celui des
  // effets d'avant le decoupage.
  const {
    revealGate,
    onListTouchStart,
    onListTouchEnd,
    handleContentSizeChange,
  } = usePageRevealLock({ fastFoods, insertLock, notifyPageLaidOut });
  const {
    loaderOpacity,
    listRef,
    nativeListRef,
    loadMoreRef,
    listLengthRef,
    handleScroll,
    handleMomentumEnd,
    handleNativeEdgeChange,
  } = useHomeListScroll({
    loadMore,
    setListAtBottom,
    loadingMore,
    hasMore,
    notifyUserScroll,
    cancelPendingLoadMore,
    resetToFirstPage,
  });

  const handleBannerPress = useCallback(
    (banner: AppBanner) => {
      track("banner_click", { bannerId: String(banner.id) });
      // Une bannière `bonus` ouvre la sheet Bonus (Settings → Bonus et parrainage).
      if (banner.type === "bonus") {
        router.push("/(tabs)/settings?section=bonus");
      }
    },
    [router],
  );

  // Statistiques (FlashList) : boutiques visibles a 50 %, rang = index - banniere.
  const shopCountRef = React.useRef(0);
  shopCountRef.current = fastFoods.length;
  const pageSizeRef = React.useRef(homeSettings.pageSize);
  pageSizeRef.current = homeSettings.pageSize;
  const handleViewableShops = useCallback(
    ({ viewableItems }: { viewableItems: { item: any; index: number | null }[] }) => {
      const shops = viewableItems.filter(
        (v) => v.index != null && v.index >= 1 && v.index - 1 < shopCountRef.current && v.item?.id,
      );
      setVisibleShops(
        shops.map((v) => String(v.item.id)),
        shops.map((v) => (v.index as number) - 1),
        (p) => homePageOf(p, pageSizeRef.current),
      );
    },
    [],
  );
  // Bannière affichée en tête du carrousel : une vue par bannière et par lancement
  // (les suivantes ne sont vues qu'au glissé, que la liste ne signale pas).
  const firstBannerId = banners[0]?.id;
  useEffect(() => {
    if (firstBannerId == null || seenBanners.has(String(firstBannerId))) return;
    seenBanners.add(String(firstBannerId));
    track("banner_view", { bannerId: String(firstBannerId) });
  }, [firstBannerId]);
  // Home quitte (autre onglet) : les boutiques visibles sont closes.
  useFocusEffect(useCallback(() => clearVisibleShops, []));

  const { firstScreenUris, listData, drawDistance } = useHomeListData({
    fastFoods,
    banners,
    hasMore,
    loading,
  });
  listLengthRef.current = listData.length;
  const { listFooter, renderItem, keyExtractor, getItemType } =
    useHomeListRenderers({
      banners,
      loading,
      hasMore,
      fastFoodsCount: fastFoods.length,
      searchQuery,
      onBannerPress: handleBannerPress,
      onMenuClick: checkout.onMenuClickStable,
    });

  // Écran de chargement plein — RÉSERVÉ au tout premier affichage.
  // ⚠️ `!searchQuery` est indispensable : une recherche vide la liste et
  // repasse `loading` à true. Sans cette garde, l'écran plein remplacerait la
  // home et ferait disparaître la barre de recherche, empêchant l'utilisateur
  // de corriger sa saisie.
  const fullLoading =
    (loading && fastFoods.length === 0 && !searchQuery) || forceLoading;

  // En-tete et navbar restent visibles pendant le chargement plein : seul le
  // contenu (sous l'en-tete) est remplace par le loader.
  useEffect(() => {
    navigation.setOptions({ tabBarStyle });
  }, [navigation, tabBarStyle]);

  const header = (
    <HomeHeader
      unreadCount={unreadCount}
      searchOpen={searchOpen}
      onSearchToggle={() => setSearchOpen(!searchOpen)}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      selectedCategory={selectedCategory}
      onCategorySelect={setSelectedCategory}
    />
  );

  if (needsLocation || locationAccess.state === "checking") {
    return (
      <View style={styles.container} onLayout={onLayoutRootView}>
        {header}
        <View style={{ flex: 1, paddingTop: HEADER_HEIGHT, paddingBottom: tabBarHeight }}>
          {needsLocation ? (
            <HomeLocationRequired
              homeCity={homeCity}
              canAskAgain={locationAccess.canAskAgain}
              requesting={locationAccess.requesting}
              onEnable={locationAccess.enable}
            />
          ) : (
            <HomeLoadingScreen />
          )}
        </View>
      </View>
    );
  }

  if (fullLoading) {
    return (
      <View style={styles.container} onLayout={onLayoutRootView}>
        {header}
        <View style={{ flex: 1, paddingTop: HEADER_HEIGHT, paddingBottom: tabBarHeight }}>
          <HomeLoadingScreen />
        </View>
      </View>
    );
  }

  // Échec du chargement initial : page entière remplacée (voir HomeErrorScreen).
  if (error && fastFoods.length === 0 && !loading) {
    return <HomeErrorScreen onLayout={onLayoutRootView} onRetry={refresh} />;
  }

  return (
    <View style={styles.container} onLayout={onLayoutRootView}>
      {header}
      {/* ⚠️ Groupe de revelation partage par la BANNIERE et la PREMIERE
          boutique uniquement (cf. DesignRouter) : les deux sortent a la meme
          frame. La boutique 0 n'attend rien de plus qu'avant — seule la
          banniere patiente le temps de sortir avec elle. Les boutiques
          suivantes gardent leur propre groupe : les mettre ici ferait attendre
          la boutique 0 derriere elles, et c'est ce qui avait rajoute de la
          latence a l'arrivee sur le home. */}
      <ShopRevealProvider expect={firstScreenUris}>
       <PageRevealGateProvider value={revealGate.gate}>
        <View
          style={{ flex: 1, paddingTop: HEADER_HEIGHT }}
          onTouchStart={onListTouchStart}
          onTouchEnd={onListTouchEnd}
          onTouchCancel={onListTouchEnd}
        >
          {/* Localisation non accordée : bandeau d'activation au-dessus des
              boutiques, le home reste utilisable (voir useLocationAccess). */}
          {SHOW_LOCATION_BANNER && locationAccess.state === "blocked" && (
            <HomeLocationBanner
              canAskAgain={locationAccess.canAskAgain}
              requesting={locationAccess.requesting}
              onEnable={locationAccess.enable}
            />
          )}
          {/* Liste « Tout » (native, ou FlashList en repli), TOUJOURS montee ;
              un tab categorie pose sa propre liste par-dessus. */}
          <View style={{ flex: 1 }}>
          {isHomeListAvailable ? (
            <NativeHomeList
              listRef={nativeListRef}
              fastFoods={fastFoods}
              banners={banners}
              loading={loading}
              hasMore={hasMore}
              refreshing={refreshing}
              bottomInset={tabBarHeight + 60}
              sidePadding={Theme.design.horizontalPadding}
              footerText={
                fastFoods.length === 0 && !loading
                  ? searchQuery
                    ? t("Aucun restaurant trouvé pour \"{{a}}\"", { a: searchQuery })
                    : t("Aucun restaurant disponible pour le moment")
                  : !hasMore && !loading && fastFoods.length > 0
                    ? t("Vous avez vu toutes les boutiques")
                    : null
              }
              footerIsEmpty={fastFoods.length === 0 && !loading}
              ghostCount={homeSettings.pageSize}
              prefetchDistance={homeSettings.prefetchDistance}
              onRefresh={onManualRefresh}
              onEndReached={() => loadMoreRef.current()}
              onMenuPress={checkout.onMenuClickStable}
              onBannerPress={handleBannerPress}
              onEdgeChange={(top, near) => handleNativeEdgeChange(top, near)}
            />
          ) : (
            <HomeFlashList
              listRef={listRef}
              data={listData}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              getItemType={getItemType}
              onScroll={handleScroll}
              onMomentumScrollEnd={handleMomentumEnd}
              onViewableItemsChanged={handleViewableShops}
              bottomPadding={tabBarHeight + 60}
              refreshing={refreshing}
              onRefresh={onManualRefresh}
              onContentSizeChange={handleContentSizeChange}
              drawDistance={drawDistance}
              scrollEnabled={!insertLock}
              listFooter={listFooter}
            />
          )}
          {category && (
            <CategoryHomeList
              category={category}
              bottomInset={tabBarHeight + 60}
              onMenuPress={checkout.onMenuClickStable}
              onBannerPress={handleBannerPress}
            />
          )}
          </View>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.bottomLoader,
              { bottom: tabBarHeight + 5, opacity: loaderOpacity },
            ]}
          >
            <ActivityIndicator size="large" color={Theme.colors.primary} />
          </Animated.View>
        </View>
       </PageRevealGateProvider>
      </ShopRevealProvider>
      <CheckoutSheet
        key={checkout.selectedMenu?.id || "checkout"}
        visible={checkout.checkoutVisible}
        onClose={checkout.closeCheckout}
        menu={checkout.selectedMenu}
        onReopen={checkout.reopenCheckout}
        onConfirm={checkout.handleConfirmOrder}
      />

      {checkout.toast && (
        <Toast
          message={checkout.toast.message}
          type={checkout.toast.type}
          onHide={checkout.hideToast}
        />
      )}
    </View>
  );
}
