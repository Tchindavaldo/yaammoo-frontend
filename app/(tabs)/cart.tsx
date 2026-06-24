import React, { useState, useMemo, useEffect } from "react";
import {
  StyleSheet,
  FlatList,
  View,
  Text,
  TouchableOpacity,
  Alert,
  Platform,
  RefreshControl,
  LayoutAnimation,
  UIManager,
  Animated,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Commande, Menu } from "@/src/types";
import { useOrders } from "@/src/features/orders/hooks/useOrders";
import { TabHeader } from "@/src/components/molecules/TabHeader";
import { HeaderPill } from "@/src/components/molecules/HeaderPill";
import { ClientOrderCard } from "@/src/features/orders/components/ClientOrderCard";
import { Theme } from "@/src/theme";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator } from "@/src/components/CustomActivityIndicator";
import { useTabBarHeight } from "@/src/hooks/useTabBarHeight";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { Toast } from "@/src/components/Toast";
import { CartCheckoutSheet } from "@/src/features/checkout/components/CartCheckoutSheet";
import { useCartPayment } from "@/src/features/payment/hooks/useCartPayment";
import { sanitizeOrder } from "@/src/features/orders/utils/sanitizeOrder";
import { CartPaymentOverlay } from "@/src/features/payment/components/CartPaymentOverlay";
import { useFastFoods } from "@/src/features/restaurants/hooks/useFastFoods";

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function OrdersScreen() {
  const {
    loading,
    orders,
    pendingToBuy,
    refresh,
    deleteOrder,
    updateQuantity,
    updateLocalOrder,
    buyOrders,
  } = useOrders();
  const { userData } = useAuth();
  const { appleReviewMode } = useFastFoods();

  // Total panier (réactif) — calculé tôt pour alimenter le hook de paiement.
  const cartTotal = useMemo(() => {
    const t = pendingToBuy.reduce((acc, o) => acc + (Number(o.total) || 0), 0);
    return isNaN(t) ? 0 : t;
  }, [pendingToBuy]);

  // Paiement global du panier (logique propre, isolée de useCheckout).
  const {
    paymentPhone,
    setPaymentPhone,
    paymentNetwork,
    setPaymentNetwork,
    paymentState,
    setPaymentState,
    paymentError,
    setPaymentError,
    ussdMessage,
    resetPayment,
    handlePaymentConfirm,
    handleReviewOrder,
    handlePaymentVerdict,
    registerPaymentHandler,
    unregisterPaymentHandler,
  } = useCartPayment(cartTotal);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [orderToEdit, setOrderToEdit] = useState<any | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const itemToDelete = useMemo(() => {
    if (!orderToDelete) return null;
    return orders.find(o => o.id === orderToDelete);
  }, [orderToDelete, orders]);

  const synthesizedEditMenu = useMemo(() => {
    if (!orderToEdit) return null;
    const p = orderToEdit.menu.prices || [];
    return {
      id: orderToEdit.menu.id,
      fastFoodId: orderToEdit.fastFoodId,
      titre: orderToEdit.menu.titre || orderToEdit.menu.name || "",
      prix1: p[0]?.price || 0,
      prix2: p[1]?.price || 0,
      prix3: p[2]?.price || 0,
      optionPrix1: p[0]?.description || "Standard",
      optionPrix2: p[1]?.description || "Medium",
      optionPrix3: p[2]?.description || "Large",
      image: orderToEdit.menu.image || orderToEdit.menu.coverImage || "",
      disponibilite: "active",
      images: orderToEdit.menu.images || [orderToEdit.menu.image || orderToEdit.menu.coverImage || ""],
      extra: orderToEdit.extra || [],
      drink: orderToEdit.drink || [],
    } as Menu;
  }, [orderToEdit]);

  // UI states
  const keyboardHeight = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (userData?.infos?.numero) {
      setPaymentPhone(userData.infos.numero.toString());
    }
  }, [userData]);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setIsKeyboardVisible(true);
        Animated.spring(keyboardHeight, {
          toValue: e.endCoordinates.height,
          useNativeDriver: false,
          tension: 40,
          friction: 8,
        }).start();
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
        Animated.spring(keyboardHeight, {
          toValue: 0,
          useNativeDriver: false,
          tension: 40,
          friction: 8,
        }).start();
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Verdict paiement via socket : actif tant qu'un paiement est en cours.
  const paymentActive = paymentState !== "total";
  useEffect(() => {
    if (!paymentActive) return;
    registerPaymentHandler(handlePaymentVerdict);
    return () => unregisterPaymentHandler();
  }, [paymentActive, handlePaymentVerdict, registerPaymentHandler, unregisterPaymentHandler]);

  // Après succès complet (success_created) : rafraîchir + revenir au repos.
  useEffect(() => {
    if (paymentState === "success_created") {
      // En review : repos quasi-immédiat (~300ms). Sinon flux normal (5s).
      const timer = setTimeout(() => {
        resetPayment();
        refresh();
      }, appleReviewMode ? 300 : 5000);
      return () => clearTimeout(timer);
    }
  }, [paymentState, resetPayment, refresh, appleReviewMode]);

  // Toast d'erreur paiement.
  useEffect(() => {
    if (paymentError) {
      setToast({ message: paymentError, type: 'error' });
      setPaymentError(null);
    }
  }, [paymentError, setPaymentError]);

  const tabBarHeight = useTabBarHeight();
  const insets = useSafeAreaInsets();
  // Hauteur réelle du TabHeader, mesurée via onHeightChange.
  const [headerHeight, setHeaderHeight] = useState(60 + insets.top);
  const HEADER_HEIGHT = headerHeight;

  // For testing: force loader to persist
  const [forceLoading] = useState(false);

  const handleConfirmDelete = async () => {
    if (!orderToDelete) return;
    setIsSubmitting(true);
    try {
      const success = await deleteOrder(orderToDelete);
      if (success) {
        setOrderToDelete(null);
        setToast({ message: "Article supprimé du panier", type: "success" });
      } else {
        setToast({ message: "Erreur lors de la suppression", type: "error" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelDelete = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOrderToDelete(null);
  };

  const handleUpdateQty = async (id: string, qty: number) => {
    const success = await updateQuantity(id, qty);
    if (!success)
      Alert.alert("Erreur", "Impossible de mettre à jour la quantité");
  };

  const validateAllDeliveries = (): string | null => {
    for (const order of pendingToBuy) {
      const d = order.delivery as any;
      if (!d || !d.status || d.type === 'aucune') continue;
      const menuName = (order.menu as any)?.name || (order.menu as any)?.titre || 'Commande';
      if (!d.location) return `"${menuName}" : adresse de livraison requise`;
      if (!d.phone && !(order.userData?.phoneNumber)) return `"${menuName}" : numéro de contact requis`;
      if (d.type === 'time' && !d.time) return `"${menuName}" : période de livraison requise`;
    }
    return null;
  };

  // Valide les livraisons puis délègue le paiement au hook useCartPayment.
  const confirmCartPayment = async (phone: string) => {
    const validationErr = validateAllDeliveries();
    if (validationErr) {
      setToast({ message: validationErr, type: 'error' });
      // Revenir à l'input pour corriger (sinon coincé en waiting).
      setPaymentState('input');
      return;
    }
    // items = commandes du panier, sanitizées EXACTEMENT comme l'envoi historique
    // (buyOrders → /order/tabs), via la fonction partagée sanitizeOrder.
    const items = pendingToBuy.map((o) => sanitizeOrder(o, userData?.uid));
    await handlePaymentConfirm(phone, items);
  };

  const onManualRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  if ((loading && orders.length === 0) || forceLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
          <Text style={styles.loadingText}>Chargement de vos commandes...</Text>
        </View>
      </View>
    );
  }

  // Sous-titre du header : total du panier.
  const headerSubtitle = `${cartTotal.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} FCFA`;

  // Pilule de droite : payer / commander (review).
  const headerRight =
    pendingToBuy.length > 0 && !orderToDelete ? (
      <HeaderPill
        label={appleReviewMode ? "Commander" : "Tout payer"}
        icon={appleReviewMode ? "checkmark-circle-outline" : "card-outline"}
        loading={appleReviewMode && paymentState !== "total"}
        onPress={() => {
          if (appleReviewMode) {
            // Mode review : commande directe du panier, sans overlay de saisie.
            const validationErr = validateAllDeliveries();
            if (validationErr) {
              setToast({ message: validationErr, type: "error" });
              return;
            }
            const items = pendingToBuy.map((o) => sanitizeOrder(o, userData?.uid));
            handleReviewOrder(items);
            return;
          }
          setPaymentState("network_select");
        }}
      />
    ) : null;

  return (
    <View style={styles.container}>
      <TabHeader
        title="Mon panier"
        subtitle={headerSubtitle}
        right={headerRight}
        onHeightChange={setHeaderHeight}
      />

      {/* Pas de paddingTop ici : le contenu s'étend SOUS le header pour que le
          BlurView du TabHeader floute la liste qui scrolle dessous. */}
      <View style={{ flex: 1 }}>
        <FlatList
          data={pendingToBuy}
          renderItem={({ item }) => (
            <ClientOrderCard
              order={item}
              onPress={() => {
                setOrderToEdit(item);
                setEditModalVisible(true);
              }}
              onDelete={(id) => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setOrderToEdit(null);
                setOrderToDelete(id);
              }}
              onUpdateQuantity={handleUpdateQty}
              showActions={true}
            />
          )}
          keyExtractor={(item, index) =>
            (item as any).id?.toString() || (item as any).idCmd?.toString() || index.toString()
          }
          contentContainerStyle={[
            styles.listContent,
            { paddingTop: HEADER_HEIGHT, paddingBottom: tabBarHeight + 100 },
          ]}
          scrollIndicatorInsets={{ top: HEADER_HEIGHT }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onManualRefresh}
              progressViewOffset={HEADER_HEIGHT}
              tintColor={Theme.colors.primary}
              colors={[Theme.colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={[styles.centered, { paddingTop: 100 }]}>
              <Ionicons name="cart-outline" size={60} color={Theme.colors.gray[200]} />
              <Text style={styles.emptyText}>Votre panier est vide</Text>
            </View>
          }
        />
      </View>

      {/* Capsule de confirmation de SUPPRESSION (mode séparé du paiement) */}
      {pendingToBuy.length > 0 && orderToDelete && (
        <Animated.View style={[styles.payFooterCapsule, { bottom: tabBarHeight + 10 }]}>
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          <TouchableOpacity style={styles.closeCircle} onPress={cancelDelete}>
            <Ionicons name="close" size={16} color="white" />
          </TouchableOpacity>
          <View style={styles.deleteMsgWrapper}>
            <Text style={styles.deleteMenuTitle} numberOfLines={1}>
              {((itemToDelete as any)?.menu?.titre || (itemToDelete as any)?.menu?.name || "Article")} - {((itemToDelete as any)?.total || (itemToDelete as any)?.prixTotal || 0)} FCFA
            </Text>
            <Text style={styles.deleteMsg}>Voulez-vous vraiment supprimer ?</Text>
          </View>
          <TouchableOpacity
            style={[styles.payerBtnHome, { backgroundColor: '#ef4444' }, isSubmitting && { opacity: 0.7 }]}
            onPress={handleConfirmDelete}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="checkmark" size={16} color="white" />
            )}
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Capsule de PAIEMENT global du panier — ouverte par la pilule "Tout payer"
          du header (masquée à l'état "total" au repos et en mode review). */}
      {pendingToBuy.length > 0 && !orderToDelete && paymentState !== "total" && !appleReviewMode && (
        <CartPaymentOverlay
          phone={paymentPhone}
          onPhoneChange={setPaymentPhone}
          onConfirm={confirmCartPayment}
          totalAmount={cartTotal}
          paymentState={paymentState}
          setPaymentState={setPaymentState}
          network={paymentNetwork}
          onNetworkChange={setPaymentNetwork}
          ussdMessage={ussdMessage}
          onClose={resetPayment}
          onError={(msg) => setToast({ message: msg, type: 'error' })}
          isKeyboardVisible={isKeyboardVisible}
          bottom={Animated.add(keyboardHeight, isKeyboardVisible ? 5 : tabBarHeight + 10)}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onHide={() => setToast(null)}
        />
      )}

      {orderToEdit && (
        <CartCheckoutSheet
          key={orderToEdit.id}
          visible={editModalVisible}
          onClose={() => {
            setEditModalVisible(false);
          }}
          menu={synthesizedEditMenu}
          initialOrder={orderToEdit}
          isCartMode={true}
          onChange={updateLocalOrder}
          onConfirm={async (updatedOrder) => {
            const result = await buyOrders([{ ...updatedOrder, status: 'pendingToBuy' }]);
            if (result.success) {
              setToast({ message: "Commande validée avec succès", type: "success" });
              setEditModalVisible(false);
              setOrderToEdit(null);
            }
            return result;
          }}
        />
      )}
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
    paddingVertical: 1,
  },
  emptyText: {
    marginTop: 10,
    color: Theme.colors.gray[400],
    fontSize: 16,
    textAlign: "center",
  },
  payFooterCapsule: {
    position: "absolute",
    width: "96%",
    height: 70,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 80,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    alignSelf: 'center',
    zIndex: 1000,
    left: '2%',
  },
  closeCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payerBtnHome: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ec4913",
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    minWidth: 40,
  },
  deleteMsgWrapper: {
    flex: 1,
    paddingLeft: 12,
    justifyContent: 'center',
  },
  deleteMenuTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  deleteMsg: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});
