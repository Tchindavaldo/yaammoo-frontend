import React, { useState, useMemo, useEffect } from "react";
import {
  StyleSheet,
  FlatList,
  View,
  Text,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useOrders } from "@/src/features/orders/hooks/useOrders";
import { OrderHeader } from "@/src/features/orders/components/OrderHeader";
import { OrderCard } from "@/src/features/orders/components/OrderCard";
import { OrderTrackingHeader } from "@/src/features/orders/components/OrderTrackingHeader";
import { Theme } from "@/src/theme";
import { PaymentSheet } from "@/src/features/payment/components/PaymentSheet";
import { BlurView } from "expo-blur";
import { BonusScreen } from "@/src/features/bonus/components/BonusScreen";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator } from "@/src/components/CustomActivityIndicator";
import { useTabBarHeight } from "@/src/hooks/useTabBarHeight";

export default function OrdersScreen() {
  const {
    loading,
    pendingToBuy,
    pending,
    active,
    finished,
    delivered,
    refresh,
    deleteOrder,
    updateQuantity,
    buyOrders,
    stats,
  } = useOrders();
  const tabBarHeight = useTabBarHeight();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 60 + insets.top;

  // For testing: force loader to persist
  const [forceLoading, setForceLoading] = useState(false);

  const [currentTab, setCurrentTab] = useState("cart");
  const [activeStatus, setActiveStatus] = useState<
    "pending" | "active" | "finished" | "delivered"
  >("pending");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [paymentVisible, setPaymentVisible] = useState(false);

  // Générer les dates disponibles (Aujourd'hui + dates des commandes existantes)
  const availableDates = useMemo(() => {
    const dates = [new Date()];
    [...pending, ...active, ...finished, ...delivered].forEach((o) => {
      if (o.livraison?.date) {
        dates.push(new Date(o.livraison.date));
      }
    });
    // Uniq par jour
    return Array.from(new Set(dates.map((d) => d.toDateString())))
      .map((s) => new Date(s))
      .sort((a, b) => a.getTime() - b.getTime());
  }, [pending, active, finished, delivered]);

  useEffect(() => {
    // Si on switch sur l'onglet status, on s'assure d'avoir un statut sélectionné
    if (currentTab === "status" && !activeStatus) {
      setActiveStatus("pending");
    }
  }, [currentTab]);

  const calculateCartTotal = () => {
    return pendingToBuy.reduce((acc, o) => acc + o.prixTotal, 0);
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const filteredOrders = useMemo(() => {
    if (currentTab === "cart") return pendingToBuy;

    let list = [];
    switch (activeStatus) {
      case "pending":
        list = pending;
        break;
      case "active":
        list = active;
        break;
      case "finished":
        list = finished;
        break;
      case "delivered":
        list = delivered;
        break;
      default:
        list = [];
    }

    return list.filter((o: any) => {
      if (!o.livraison?.date) return isSameDay(new Date(), selectedDate);
      return isSameDay(new Date(o.livraison.date), selectedDate);
    });
  }, [
    currentTab,
    activeStatus,
    selectedDate,
    pendingToBuy,
    pending,
    active,
    finished,
    delivered,
  ]);

  const handleDelete = async (id: string) => {
    const success = await deleteOrder(id);
    if (!success) Alert.alert("Erreur", "Impossible de retirer cet article");
  };

  const handleUpdateQty = async (id: string, qty: number) => {
    const success = await updateQuantity(id, qty);
    if (!success)
      Alert.alert("Erreur", "Impossible de mettre à jour la quantité");
  };

  const handlePaymentSuccess = async () => {
    setPaymentVisible(false);
    // Transitionner les articles du panier vers le statut 'payé/pending'
    const success = await buyOrders(pendingToBuy);
    if (success) {
      Alert.alert("Succès ✨", "Votre commande a été validée avec succès !");
      setCurrentTab("status");
      setActiveStatus("pending");
    } else {
      Alert.alert(
        "Attention",
        "Le paiement a réussi mais une erreur est survenue lors de la validation de la commande.",
      );
      refresh();
    }
  };

  if (
    (loading && pendingToBuy.length === 0 && pending.length === 0) ||
    forceLoading
  ) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
          <Text style={styles.loadingText}>Chargement de vos commandes...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <OrderHeader
        activeTab={currentTab}
        onTabChange={setCurrentTab}
        counts={{
          cart: pendingToBuy.length,
          status: pending.length + active.length + finished.length,
          bonus: 0,
        }}
      />

      {currentTab === "status" && (
        <View style={{ position: 'absolute', top: HEADER_HEIGHT, left: 0, right: 0, zIndex: 999 }}>
          <OrderTrackingHeader
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            availableDates={availableDates}
            totalOrders={filteredOrders.length}
            totalAmount={filteredOrders.reduce((acc, o: any) => acc + o.prixTotal, 0)}
            activeStatus={activeStatus}
            onStatusChange={setActiveStatus}
            counts={{
              pending: pending.length,
              processing: active.length,
              finished: finished.length,
              delivered: delivered.length,
            }}
          />
        </View>
      )}

      {currentTab === "bonus" ? (
        <View style={{ paddingTop: HEADER_HEIGHT, flex: 1 }}>
          <BonusScreen />
        </View>
      ) : (
        <>
          <FlatList
            data={filteredOrders}
            renderItem={({ item }) => (
              <OrderCard
                order={item}
                onDelete={handleDelete}
                onUpdateQuantity={handleUpdateQty}
                showActions={currentTab === "cart"}
              />
            )}
            keyExtractor={(item, index) =>
              (item as any).idCmd?.toString() || index.toString()
            }
            contentContainerStyle={[
              styles.listContent,
              { paddingTop: HEADER_HEIGHT + (currentTab === "status" ? 140 : 0), paddingBottom: tabBarHeight + 80 },
            ]}
            refreshing={loading}
            onRefresh={refresh}
            ListEmptyComponent={
              <View style={[styles.centered, { paddingTop: 100 }]}>
                <Ionicons
                  name={
                    currentTab === "cart" ? "cart-outline" : "receipt-outline"
                  }
                  size={60}
                  color={Theme.colors.gray[200]}
                />
                <Text style={styles.emptyText}>
                  {currentTab === "cart"
                    ? "Votre panier est vide"
                    : "Aucune commande pour cette date"}
                </Text>
              </View>
            }
          />
          {currentTab === "cart" && pendingToBuy.length > 0 && (
            <View style={[styles.payFooterCapsule, { bottom: tabBarHeight + 10 }]}>
              <View style={styles.totalChip}>
                <Ionicons
                  name="logo-usd"
                  size={14}
                  color="white"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.totalLabel}>
                  Total {"\n"}
                  {calculateCartTotal()} fcfa
                </Text>
              </View>

              <TouchableOpacity
                style={styles.payerBtn}
                onPress={() => setPaymentVisible(true)}
              >
                <Text style={styles.payerBtnText}>PAYER</Text>
                <Ionicons
                  name="arrow-forward-outline"
                  size={14}
                  color="white"
                  style={{ marginLeft: 5 }}
                />
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      <PaymentSheet
        visible={paymentVisible}
        onClose={() => setPaymentVisible(false)}
        amount={calculateCartTotal()}
        onSuccess={handlePaymentSuccess}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  loadingText: {
    color: Theme.colors.gray[500],
    fontSize: 14,
  },
  listContent: {
    paddingVertical: 10,
  },
  emptyText: {
    marginTop: 10,
    color: Theme.colors.gray[400],
    fontSize: 16,
    textAlign: "center",
  },
  browseBtn: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(236,73,19,1.00)",
  },
  browseBtnText: {
    color: "rgba(236,73,19,1.00)",
    fontWeight: "bold",
  },
  payFooterCapsule: {
    position: "absolute",
    left: "1%",
    width: "98%",
    height: 70,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    borderRadius: 80,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 1000,
  },
  totalChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2dd36f",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    height: 45,
  },
  totalLabel: {
    color: "white",
    fontSize: 10,
    fontWeight: "900",
  },
  payerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(236,73,19,1.00)",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    height: 35,
  },
  payerBtnText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
});
