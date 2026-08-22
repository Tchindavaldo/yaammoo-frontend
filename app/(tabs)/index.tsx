import { ActivityIndicator } from "@/src/components/CustomActivityIndicator";
import { Toast } from "@/src/components/Toast";
import { useOrders } from "@/src/features/orders/hooks/useOrders";
import { RestaurantHeader } from "@/src/features/restaurants/components/RestaurantHeader";
import { useFastFoods } from "@/src/features/restaurants/hooks/useFastFoods";
import { useTabBarHeight } from "@/src/hooks/useTabBarHeight";
import { Theme } from "@/src/theme";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CheckoutSheet } from "@/src/features/checkout/components/CheckoutSheet";
import { DesignRouter } from "@/src/features/restaurants/components/DesignRouter";
import { HeroBanner } from "@/src/features/restaurants/components/HeroBanner";
import { AppBanner, Menu } from "@/src/types";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/src/features/auth/context/AuthContext";
import { useAuthGate } from "@/src/features/auth/context/AuthGateContext";
import { useNotifications } from "@/src/features/notifications/hooks/useNotifications";
import { useHideSplash } from "@/src/hooks/useHideSplash";
import { useRouter } from "expo-router";

const CATEGORIES = [
  { name: "All", icon: "grid-outline" },
  { name: "Fast Food", icon: "fast-food-outline" },
  { name: "Pizza", icon: "pizza-outline" },
  { name: "Burger", icon: "nutrition-outline" },
  { name: "Drinks", icon: "beer-outline" },
  { name: "Rice", icon: "restaurant-outline" },
];


export default function HomeScreen() {
  const onLayoutRootView = useHideSplash();
  const { user, userData } = useAuth();
  const { requireAuth } = useAuthGate();
  const { unreadCount } = useNotifications();
  const router = useRouter();
  const {
    fastFoods,
    loading,
    error,
    loadingMore,
    hasMore,
    loadMore,
    refresh,
    banners,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
  } = useFastFoods();
  const { addOrder } = useOrders();
  const tabBarHeight = useTabBarHeight();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 100 + insets.top;

  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
  const [checkoutVisible, setCheckoutVisible] = useState(false);



  // For testing: force loader to persist
  const [forceLoading, setForceLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const onManualRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleBannerPress = useCallback(
    (banner: AppBanner) => {
      // Une bannière `bonus` ouvre la sheet Bonus (Settings → Bonus et parrainage).
      if (banner.type === "bonus") {
        router.push("/(tabs)/settings?section=bonus");
      }
    },
    [router],
  );

  const listHeader = useMemo(
    () => (
      <HeroBanner
        banners={banners}
        onBonusPress={handleBannerPress}
        loading={loading}
      />
    ),
    [banners, handleBannerPress, loading],
  );

  // Pied de liste : indicateur pendant le chargement de la page suivante.
  // `hasMore` évite de laisser un espace vide en bas quand tout est chargé.
  const listFooter = useMemo(
    () =>
      loadingMore && hasMore ? (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={Theme.colors.primary} />
        </View>
      ) : null,
    [loadingMore, hasMore],
  );

  const handleMenuClick = (menu: Menu) => {
    // Ouvrir le menu mène à la commande (CheckoutSheet = action liée au compte).
    // Pour un invité, on ouvre la sheet d'auth au lieu du checkout.
    requireAuth(() => {
      setSelectedMenu(menu);
      setCheckoutVisible(true);
    });
  };

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
  };

  const handleConfirmOrder = async (order: any) => {
    try {
      const result = await addOrder(order);
      if (result.success) {
        showToast(
          order.status === "pending"
            ? "Commande envoyée au marchand ! 🚀"
            : "Article ajouté au panier ! ✨",
          "success",
        );
        return true;
      } else {
        showToast(result.message || "Une erreur est survenue.", "error");
        return false;
      }
    } catch (error) {
      showToast("Une erreur est survenue.", "error");
      return false;
    }
  };

  // Écran de chargement plein — RÉSERVÉ au tout premier affichage.
  // ⚠️ `!searchQuery` est indispensable : une recherche vide la liste et
  // repasse `loading` à true. Sans cette garde, l'écran plein remplacerait la
  // home et ferait disparaître la barre de recherche, empêchant l'utilisateur
  // de corriger sa saisie.
  if ((loading && fastFoods.length === 0 && !searchQuery) || forceLoading) {
    return (
      <SafeAreaView style={styles.container} onLayout={onLayoutRootView}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
          <Text style={styles.loadingText}>
            Recherche des meilleurs plats...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Échec du chargement initial : la page entière est remplacée par un message
  // centré et un bouton de relance. Rien d'autre n'est affiché — ni header, ni
  // liste : il n'y a aucune donnée à montrer, et un contenu partiel donnerait
  // l'impression d'une page cassée plutôt que d'un réseau indisponible.
  if (error && fastFoods.length === 0 && !loading) {
    return (
      <SafeAreaView style={styles.container} onLayout={onLayoutRootView}>
        <View style={styles.centered}>
          <Ionicons
            name="cloud-offline-outline"
            size={54}
            color={Theme.colors.gray[300]}
          />
          <Text style={styles.errorTitle}>Connexion indisponible</Text>
          <Text style={styles.errorText}>
            Impossible de charger le contenu. Vérifiez votre connexion.
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            activeOpacity={0.8}
            onPress={refresh}
          >
            <Ionicons name="refresh" size={17} color={Theme.colors.white} />
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container} onLayout={onLayoutRootView}>
      <RestaurantHeader
        userName={
          [userData?.infos?.prenom, userData?.infos?.nom]
            .filter(Boolean)
            .join(" ") ||
          user?.displayName ||
          "Utilisateur"
        }
        userPhoto={
          (userData as any)?.photoUrl || (userData as any)?.photo || ""
        }
        location="Banganté, Cameroun"
        unreadCount={unreadCount}
        onNotifPress={() => router.push("/(tabs)/notifications")}
        onProfilePress={() => router.push("/(tabs)/settings")}
        onCartPress={() => router.push("/(tabs)/cart")}
        onOrdersPress={() => router.push("/(tabs)/settings?section=pending")}
        searchVisible={searchOpen}
        onSearchToggle={() => setSearchOpen(!searchOpen)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categories={CATEGORIES}
        selectedCategory={selectedCategory}
        onCategorySelect={setSelectedCategory}
      />
      <View style={{ flex: 1, paddingTop: HEADER_HEIGHT }}>
        <FlatList
          data={fastFoods}
          ListHeaderComponent={listHeader}
          renderItem={({ item }) => (
            <DesignRouter fastFood={item} onMenuClick={handleMenuClick} />
          )}
          keyExtractor={(item, index) => item.id || index.toString()}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingBottom: tabBarHeight + 20,
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
          // Pagination : la page suivante part avant d'atteindre le bas, pour
          // que les boutiques soient là quand l'utilisateur y arrive.
          // ⚠️ Par défaut `initialNumToRender` vaut 10 : la première passe de
          // rendu montait la bannière ET dix boutiques (header + rangée de
          // menus chacune). Le squelette de la bannière n'était peint qu'à la
          // fin de cette passe — d'où son apparition en retard alors que les
          // cartes, elles, étaient déjà là. On ne rend que ce qui tient à
          // l'écran ; le reste suit à la passe suivante.
          initialNumToRender={2}
          maxToRenderPerBatch={3}
          windowSize={5}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={listFooter}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons
                name="search-outline"
                size={60}
                color={Theme.colors.gray[200]}
              />
              <Text style={styles.emptyText}>
                {searchQuery
                  ? `Aucun restaurant trouvé pour "${searchQuery}"`
                  : "Aucun restaurant disponible pour le moment"}
              </Text>
            </View>
          }
        />
      </View>
      <CheckoutSheet
        key={selectedMenu?.id || "checkout"}
        visible={checkoutVisible}
        onClose={() => setCheckoutVisible(false)}
        menu={selectedMenu}
        onConfirm={handleConfirmOrder}
      />


      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onHide={() => setToast(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: Theme.colors.gray[500],
    fontSize: 14,
  },
  listContent: {
    // paddingBottom géré dynamiquement avec useTabBarHeight
  },
  footerLoader: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyText: {
    color: Theme.colors.gray[500],
    fontSize: 16,
    textAlign: "center",
    marginTop: 10,
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Theme.colors.dark,
  },
  errorText: {
    fontSize: 14,
    color: Theme.colors.gray[500],
    textAlign: "center",
    paddingHorizontal: 40,
    marginTop: -4,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 10,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: Theme.borderRadius.pill,
    backgroundColor: Theme.colors.primary,
  },
  retryText: {
    color: Theme.colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    gap: 12,
  },
  loadingOverlayText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
