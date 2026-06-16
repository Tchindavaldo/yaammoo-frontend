import React, { useState, useMemo } from "react";
import {
  StyleSheet,
  FlatList,
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  Alert,
  Platform,
  RefreshControl,
} from "react-native";
import { Toast } from "@/src/components/Toast";
import { useFastFoods } from "@/src/features/restaurants/hooks/useFastFoods";
import { RestaurantHeader } from "@/src/features/restaurants/components/RestaurantHeader";
import { RestaurantCard } from "@/src/features/restaurants/components/RestaurantCard";
import { CategoryList } from "@/src/features/restaurants/components/CategoryList";
import { Theme } from "@/src/theme";
import { useOrders } from "@/src/features/orders/hooks/useOrders";
import { useTabBarHeight } from "@/src/hooks/useTabBarHeight";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActivityIndicator } from "@/src/components/CustomActivityIndicator";

const CATEGORIES = [
  { name: "All", icon: "grid-outline" },
  { name: "Fast Food", icon: "fast-food-outline" },
  { name: "Pizza", icon: "pizza-outline" },
  { name: "Burger", icon: "nutrition-outline" },
  { name: "Drinks", icon: "beer-outline" },
  { name: "Rice", icon: "restaurant-outline" },
];

import { DesignRouter } from "@/src/features/restaurants/components/DesignRouter";
import { HeroBanner } from "@/src/features/restaurants/components/HeroBanner";
import { CheckoutSheet } from "@/src/features/checkout/components/CheckoutSheet";
import { Menu } from "@/src/types";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/src/features/auth/context/AuthContext";
import { useHideSplash } from "@/src/hooks/useHideSplash";

export default function HomeScreen() {
  const onLayoutRootView = useHideSplash();
  const { userData } = useAuth();
  const {
    fastFoods,
    loading,
    refresh,
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

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const onManualRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const listHeader = useMemo(() => <HeroBanner />, []);

  const handleMenuClick = (menu: Menu) => {
    setSelectedMenu(menu);
    setCheckoutVisible(true);
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  const handleConfirmOrder = async (order: any) => {
    try {
      const result = await addOrder(order);
      if (result.success) {
        showToast(order.status === 'pending' ? "Commande envoyée au marchand ! 🚀" : "Article ajouté au panier ! ✨", "success");
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

  const renderHeader = () => (
    <>
      <RestaurantHeader
        userName={userData?.infos?.nom || "Utilisateur"}
        userPhoto={
          (userData as any)?.photoUrl || (userData as any)?.photo || ""
        }
        location="Banganté, Cameroun"
        searchVisible={searchOpen}
        onSearchToggle={() => setSearchOpen(!searchOpen)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categories={CATEGORIES}
        selectedCategory={selectedCategory}
        onCategorySelect={setSelectedCategory}
      />
      <HeroBanner />
    </>
  );

  if ((loading && fastFoods.length === 0) || forceLoading) {
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


      return (
        <View style={styles.container} onLayout={onLayoutRootView}>
          <RestaurantHeader
            userName={userData?.infos?.nom || "Utilisateur"}
            userPhoto={
              (userData as any)?.photoUrl || (userData as any)?.photo || ""
            }
            location="Banganté, Cameroun"
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
                { paddingBottom: tabBarHeight + 20, paddingHorizontal: Theme.design.horizontalPadding },
              ]}
              refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onManualRefresh}
                    tintColor={Theme.colors.primary}
                    colors={[Theme.colors.primary]}
                  />
                }
              ListEmptyComponent={
                <View style={styles.centered}>
                  <Ionicons
                    name="search-outline"
                    size={60}
                    color={Theme.colors.gray[200]}
                  />
                  <Text style={styles.emptyText}>
                    Aucun restaurant trouvé pour "{searchQuery || selectedCategory}"
                  </Text>
                </View>
              }
            />
          </View>
      <CheckoutSheet
        key={selectedMenu?.id || 'checkout'}
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
    backgroundColor: '#ffffff',
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
  emptyText: {
    color: Theme.colors.gray[500],
    fontSize: 16,
    textAlign: "center",
    marginTop: 10,
    paddingHorizontal: 40,
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
