import React, { useState, useMemo, useEffect } from "react";
import {
  StyleSheet,
  FlatList,
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
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
    }

    return list.filter((o) => {
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
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
          <Text style={styles.loadingText}>Chargement de vos commandes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
        <OrderTrackingHeader
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          availableDates={availableDates}
          totalOrders={filteredOrders.length}
          totalAmount={filteredOrders.reduce((acc, o) => acc + o.prixTotal, 0)}
          activeStatus={activeStatus}
          onStatusChange={setActiveStatus}
          counts={{
            pending: pending.length,
            processing: active.length,
            finished: finished.length,
            delivered: delivered.length,
          }}
        />
      )}

      {currentTab === "bonus" ? (
        <BonusScreen />
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
              item.idCmd?.toString() || index.toString()
            }
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: tabBarHeight + 20 },
            ]}
            refreshing={loading}
            onRefresh={refresh}
            ListEmptyComponent={
              <View style={styles.centered}>
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
                {currentTab === "cart" && (
                  <TouchableOpacity style={styles.browseBtn} onPress={() => {}}>
                    <Text style={styles.browseBtnText}>
                      Parcourir les menus
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            }
          />
          {currentTab === "cart" && pendingToBuy.length > 0 && (
            <View style={styles.payFooterCapsule}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    // paddingBottom géré dynamiquement avec useTabBarHeight
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
    borderColor: "darkred",
  },
  browseBtnText: {
    color: "darkred",
    fontWeight: "bold",
  },
  // La capsule flottante conforme au SCSS original
  payFooterCapsule: {
    position: "absolute",
    bottom: 10,
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
  },
  totalChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2dd36f", // success color
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
    backgroundColor: "darkred",
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
