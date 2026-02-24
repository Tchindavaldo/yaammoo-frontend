import React, { useState } from "react";
import {
  StyleSheet,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  View,
  Text,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useFastFoods } from "@/src/features/restaurants/hooks/useFastFoods";
import { RestaurantHeader } from "@/src/features/restaurants/components/RestaurantHeader";
import { RestaurantCard } from "@/src/features/restaurants/components/RestaurantCard";
import { CategoryList } from "@/src/features/restaurants/components/CategoryList";
import { Theme } from "@/src/theme";
import { useOrders } from "@/src/features/orders/hooks/useOrders";
import { AppLoader } from "@/src/components/AppLoader";
import { useTabBarHeight } from "@/src/hooks/useTabBarHeight";

const CATEGORIES = [
  { name: "Fast Food", icon: "fast-food-outline" },
  { name: "Pizza", icon: "pizza-outline" },
  { name: "Burger", icon: "nutrition-outline" },
  { name: "Drinks", icon: "beer-outline" },
];

import { DesignRouter } from "@/src/features/restaurants/components/DesignRouter";
import { CheckoutSheet } from "@/src/features/checkout/components/CheckoutSheet";
import { Menu } from "@/src/types";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/src/features/auth/context/AuthContext";

export default function HomeScreen() {
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

  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const handleMenuClick = (menu: Menu) => {
    setSelectedMenu(menu);
    setCheckoutVisible(true);
  };

  const handleConfirmOrder = async (order: any) => {
    try {
      setIsAdding(true);
      const success = await addOrder(order);
      if (success) {
        setCheckoutVisible(false);
        Alert.alert(
          "Succès ✨",
          "Article ajouté au panier !",
          [
            { text: "Continuer mes achats" },
            { text: "Voir le panier", onPress: () => {} },
          ], // On pourrait rediriger ici
        );
      } else {
        Alert.alert(
          "Erreur",
          "Impossible d’ajouter au panier. Vérifiez votre connexion.",
        );
      }
    } catch (error) {
      Alert.alert("Erreur", "Une erreur est survenue.");
    } finally {
      setIsAdding(false);
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
      />
      <CategoryList
        categories={CATEGORIES}
        selectedCategory={selectedCategory}
        onSelect={setSelectedCategory}
      />
    </>
  );

  if (loading && fastFoods.length === 0) {
    return (
      <AppLoader visible={true} message="Recherche des meilleurs plats..." />
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={fastFoods}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <DesignRouter fastFood={item} onMenuClick={handleMenuClick} />
        )}
        keyExtractor={(item, index) => item.id || index.toString()}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: tabBarHeight + 20 },
        ]}
        refreshing={loading}
        onRefresh={refresh}
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
      <CheckoutSheet
        visible={checkoutVisible}
        onClose={() => setCheckoutVisible(false)}
        menu={selectedMenu}
        onConfirm={handleConfirmOrder}
      />
      {isAdding && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.loadingOverlayText}>Ajout au panier...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.white,
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
