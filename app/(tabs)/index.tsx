import { ActivityIndicator } from "@/src/components/CustomActivityIndicator";
import { Toast } from "@/src/components/Toast";
import { useOrders } from "@/src/features/orders/hooks/useOrders";
import { useFastFoods } from "@/src/features/restaurants/hooks/useFastFoods";
import { useShopSearchDeepLink } from "@/src/features/restaurants/hooks/useShopSearchDeepLink";
import { useTabBarHeight } from "@/src/hooks/useTabBarHeight";
import { Theme } from "@/src/theme";
import { FlashList } from "@shopify/flash-list";
import React, { useCallback, useEffect, useState } from "react";
import { Animated, RefreshControl, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CheckoutSheet } from "@/src/features/checkout/components/CheckoutSheet";
import { ShopRevealProvider } from "@/src/features/restaurants/context/ShopRevealContext";
import { PageRevealGateProvider } from "@/src/features/restaurants/context/PageRevealGate";
import { HomeHeader } from "@/src/features/restaurants/components/home/HomeHeader";
import {
  HomeErrorScreen,
  HomeLoadingScreen,
} from "@/src/features/restaurants/components/home/HomeFullScreenStates";
import { homeStyles as styles } from "@/src/features/restaurants/components/home/homeScreenStyles";
import { useHomeCheckout } from "@/src/features/restaurants/hooks/useHomeCheckout";
import { useHomeHeartbeat } from "@/src/features/restaurants/hooks/useHomeHeartbeat";
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
import { useRouter } from "expo-router";

/**
 * Home client : en-tete, banniere + boutiques paginees (liste NATIVE iOS quand
 * le build l'embarque, FlashList sinon), commande d'un menu.
 *
 * La logique vit dans `src/features/restaurants/` : `hooks/useHome*` (scroll,
 * donnees, rendu des cellules, commande, sonde), `hooks/usePageRevealLock`
 * (verrou de page) et `components/home/` (en-tete, ecrans plein, styles).
 * Voir architecture/restaurants.md.
 */
export default function HomeScreen() {
  const onLayoutRootView = useHideSplash();
  const { ensureProfileRefreshed } = useAuth();
  const { unreadCount, ensureLoaded: ensureNotificationsLoaded } =
    useNotifications();
  const { ensureLoaded: ensureOrdersLoaded } = useOrders();

  // Tout ce qui n'est pas indispensable a l'affichage part d'ICI, une fois
  // l'app a l'ecran : sous le splash, seules `/fastFood/all` et
  // `/settings/app-version` ont le droit de partir. Les badges panier et
  // notifications tiennent sur leur cache en attendant ces reponses.
  useHomeHeartbeat();
  useEffect(() => {
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
  } = useFastFoods();
  const tabBarHeight = useTabBarHeight();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 100 + insets.top;

  const [searchOpen, setSearchOpen] = useState(false);
  // Tap sur une annonce de boutique : recherche ouverte sur son nom.
  useShopSearchDeepLink(() => setSearchOpen(true));
  const checkout = useHomeCheckout();

  // For testing: force loader to persist
  const [forceLoading] = useState(false);
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
      // Une bannière `bonus` ouvre la sheet Bonus (Settings → Bonus et parrainage).
      if (banner.type === "bonus") {
        router.push("/(tabs)/settings?section=bonus");
      }
    },
    [router],
  );

  const { firstScreenUris, listData, drawDistance } = useHomeListData({
    fastFoods,
    banners,
    hasMore,
    loading,
  });
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
  if ((loading && fastFoods.length === 0 && !searchQuery) || forceLoading) {
    return <HomeLoadingScreen onLayout={onLayoutRootView} />;
  }

  // Échec du chargement initial : page entière remplacée (voir HomeErrorScreen).
  if (error && fastFoods.length === 0 && !loading) {
    return <HomeErrorScreen onLayout={onLayoutRootView} onRetry={refresh} />;
  }

  return (
    <View style={styles.container} onLayout={onLayoutRootView}>
      <HomeHeader
        unreadCount={unreadCount}
        searchOpen={searchOpen}
        onSearchToggle={() => setSearchOpen(!searchOpen)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategorySelect={setSelectedCategory}
      />
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
          {/* ⚠️ FlashList, pas FlatList : elle RECYCLE les vues natives au lieu
              de les detruire en sortie d'ecran et d'en recreer en entree. C'est
              ce qui supprime definitivement la micro-pause au scroll (63-90 ms
              de commit natif repayes a chaque remontage, cf. sonde `[ROW]` et
              `architecture/restaurants.md`). Le recyclage est pilote par
              `getItemType` : sans lui, une rangee serait reutilisee vers une
              variante de hauteur differente. */}
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
                    ? `Aucun restaurant trouvé pour "${searchQuery}"`
                    : "Aucun restaurant disponible pour le moment"
                  : !hasMore && !loading && fastFoods.length > 0
                    ? "Vous avez vu toutes les boutiques"
                    : null
              }
              footerIsEmpty={fastFoods.length === 0 && !loading}
              onRefresh={onManualRefresh}
              onEndReached={() => loadMoreRef.current()}
              onMenuPress={checkout.onMenuClickStable}
              onBannerPress={handleBannerPress}
              onEdgeChange={(top, near) => handleNativeEdgeChange(top, near)}
            />
          ) : (
          <FlashList
            ref={listRef}
            data={listData}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            getItemType={getItemType}
            onScroll={handleScroll}
            scrollEventThrottle={64}
            onMomentumScrollEnd={handleMomentumEnd}
            contentContainerStyle={[
              styles.listContent,
              {
                // Marge large : le loader independant flotte au-dessus de la
                // navbar, il ne doit coller ni la masquer la derniere rangee.
                paddingBottom: tabBarHeight + 60,
                paddingHorizontal: Theme.design.horizontalPadding,
              },
            ]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onManualRefresh}
                tintColor={Theme.colors.primary}
                colors={[Theme.colors.primary]}
              />
            }
            // ⚠️ `initialNumToRender`, `maxToRenderPerBatch` et `windowSize` ont
            // ete RETIRES : ce sont des reglages propres a FlatList, ignores par
            // FlashList, qui dimensionne sa fenetre elle-meme a partir des tailles
            // reellement mesurees.
            //
            // Ils reglaient un probleme que le recyclage supprime a la racine :
            // a `windowSize={5}` les rangees sortant de l'ecran etaient detruites
            // puis recreees au retour (63-90 ms de commit natif repayes a chaque
            // passage, cf. sonde `[ROW]`). Elargir a 15 ne faisait que repousser
            // le seuil au prix de la memoire. FlashList, elle, REUTILISE la vue :
            // le cout n'est plus paye qu'une fois par type de cellule.
            //
            // ⚠️ Ne pas les reintroduire en pensant « regler » un souci de scroll :
            // sur FlashList ils n'ont aucun effet.
            // ⚠️ Pas de `onEndReached` : il partait en avance (seuil 0.1), fetch
            // termine avant l'arrivee, ni loader ni gel visibles. Le fetch est
            // declenche par la transition `atBottom` dans `handleScroll`.
            onEndReached={undefined}
            // Libere le verrou de page quand le contenu GRANDIT vraiment
            // (commit + layout), pas a l'insertion logique.
            onContentSizeChange={handleContentSizeChange}
            // Pre-rendu modere : les rangees proches se montent en avance, mais
            // une page ajoutee pendant qu'on lit le haut ne se monte pas (pas
            // de pause d'insertion). 3200 montait tout, y compris hors regard.
            drawDistance={drawDistance}
            // ⚠️ SCROLL FIGE une fois le bas atteint, tant que la page suivante
            // charge. On ne bride pas le rebond (ni `bounces`, ni
            // `contentInset` negatif, ni reclampage depuis `onScroll`) : ces
            // trois pistes ont ete testees et laissaient toutes le defilement
            // continuer, le reclampage JS produisant en plus un saut visuel au
            // contact du bas (a `scrollEventThrottle={64}`, le doigt a deja
            // tire bien au-dela quand JS reagit).
            //
            // Ici la liste est simplement rendue non defilante le temps du
            // chargement : plus aucun mouvement possible vers le bas, le loader
            // reste ou il est. Le geste en cours s'arrete net, ce qui est
            // exactement l'effet voulu.
            //
            // La condition porte `atBottom` : figer des le depart de la requete
            // bloquerait aussi un chargement declenche AVANT le bas
            // (`onEndReachedThreshold`), alors que l'utilisateur defile encore
            // normalement au milieu de la liste.
            // Verrou d'insertion : scroll fige pendant le montage + layout des
            // nouvelles rangees, libere par `notifyPageLaidOut` (ou securite
            // 2 s). Jamais de scroll sur des cellules en cours de montage.
            scrollEnabled={!insertLock}
            ListFooterComponent={listFooter}
          />
          )}
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
