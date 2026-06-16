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
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Commande, Menu } from "@/src/types";
import { useOrders } from "@/src/features/orders/hooks/useOrders";
import { OrderHeader } from "@/src/features/orders/components/OrderHeader";
import { ClientOrderCard } from "@/src/features/orders/components/ClientOrderCard";
import { OrderTrackingHeader } from "@/src/features/orders/components/OrderTrackingHeader";
import { Theme } from "@/src/theme";
import { BlurView } from "expo-blur";
import { BonusScreen } from "@/src/features/bonus/components/BonusScreen";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator } from "@/src/components/CustomActivityIndicator";
import { useTabBarHeight } from "@/src/hooks/useTabBarHeight";
import { Loader } from "@/src/components/Loader";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { Toast } from "@/src/components/Toast";
import { CartCheckoutSheet } from "@/src/features/checkout/components/CartCheckoutSheet";
import { useCartPayment } from "@/src/features/payment/hooks/useCartPayment";
import { sanitizeOrder } from "@/src/features/orders/utils/sanitizeOrder";
import { CartPaymentOverlay } from "@/src/features/payment/components/CartPaymentOverlay";
import { useFastFoods } from "@/src/features/restaurants/hooks/useFastFoods";
import { OrderBottomSheet } from "@/src/features/orders/components/OrderBottomSheet";
import { useLocalSearchParams } from "expo-router";

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
export default function OrdersScreen() {
  const {
    loading,
    orders,
    pendingToBuy,
    pending,
    active,
    finished,
    delivered,
    refresh,
    deleteOrder,
    updateQuantity,
    updateLocalOrder,
    buyOrders,
    stats,
  } = useOrders();
  const { userData } = useAuth();

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
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Commande | null>(null);
  const [selectedGroupOrders, setSelectedGroupOrders] = useState<Commande[]>([]);
  const [detailVisible, setDetailVisible] = useState(false);

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

  // Après succès complet (success_created, 5s) : rafraîchir + revenir au repos.
  useEffect(() => {
    if (paymentState === "success_created") {
      const timer = setTimeout(() => {
        resetPayment();
        refresh();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [paymentState, resetPayment, refresh]);

  // Toast d'erreur paiement.
  useEffect(() => {
    if (paymentError) {
      setToast({ message: paymentError, type: 'error' });
      setPaymentError(null);
    }
  }, [paymentError, setPaymentError]);

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
  const [trackingHeaderHeight, setTrackingHeaderHeight] = useState(100);

  // Générer les dates disponibles (Aujourd'hui + dates des commandes existantes)
  const availableDates = useMemo(() => {
    const dates = [new Date()];
    [...pending, ...active, ...finished, ...delivered].forEach((o) => {
      if (o.delivery?.date) {
        dates.push(new Date(o.delivery.date));
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

  // Deep-link via query param `?section=...` (notifications → cart)
  const { section } = useLocalSearchParams<{ section?: string }>();
  useEffect(() => {
    if (!section) return;
    if (section === "bonus") {
      setCurrentTab("bonus");
      return;
    }
    if (section === "cart") {
      setCurrentTab("cart");
      return;
    }
    if (section === "pending" || section === "active" || section === "finished" || section === "delivered") {
      setCurrentTab("status");
      setActiveStatus(section);
    }
  }, [section]);

  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

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
  // Récupère la date "métier" d'une commande (livraison.date ou delivery.date), fallback createdAt
  const getOrderDate = (o: any): Date | null => {
    const raw = o?.livraison?.date || o?.delivery?.date || o?.createdAt;
    if (!raw) return null;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  };

  const statusList: Commande[] = useMemo(() => {
    switch (activeStatus) {
      case "pending": return pending;
      case "active": return active;
      case "finished": return finished;
      case "delivered": return delivered;
      default: return [];
    }
  }, [activeStatus, pending, active, finished, delivered]);

  const filteredOrders = useMemo(() => {
    if (currentTab === "cart") return pendingToBuy;
    return statusList.filter((o: any) => {
      const d = getOrderDate(o);
      if (!d) return isSameDay(new Date(), selectedDate);
      return isSameDay(d, selectedDate);
    });
  }, [currentTab, selectedDate, pendingToBuy, statusList]);

  // Sections passées non traitées (seulement pending/active, et seulement
  // quand aujourd'hui est la date sélectionnée).
  const isShowingTodayDefault = useMemo(() => {
    return (
      isSameDay(selectedDate, new Date()) &&
      (activeStatus === "pending" || activeStatus === "active")
    );
  }, [selectedDate, activeStatus]);

  const pastSections = useMemo(() => {
    if (!isShowingTodayDefault) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Récupère toutes les dates passées (avant aujourd'hui) où il reste des commandes pending/active
    const byDate = new Map<string, Commande[]>();
    statusList.forEach((o: any) => {
      const d = getOrderDate(o);
      if (!d) return;
      if (d.getTime() >= today.getTime()) return; // aujourd'hui et futur exclus
      const key = d.toISOString().substring(0, 10);
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key)!.push(o);
    });
    // Tri desc (plus récent en premier)
    return Array.from(byDate.entries())
      .sort(([a], [b]) => (a > b ? -1 : a < b ? 1 : 0))
      .map(([iso, orders]) => ({ iso, orders }));
  }, [isShowingTodayDefault, statusList]);

  const formatPastDateLabel = (iso: string) => {
    try {
      const d = new Date(iso);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (isSameDay(d, yesterday)) return "Hier";
      return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
    } catch {
      return iso;
    }
  };

  const handleDelete = async (id: string) => {
    const success = await deleteOrder(id);
    if (!success) Alert.alert("Erreur", "Impossible de retirer cet article");
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

  const { fastFoods } = useFastFoods();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedPastSection, setExpandedPastSection] = useState<string | null>(null);

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const togglePastSection = (iso: string) => {
    setExpandedPastSection(prev => (prev === iso ? null : iso));
  };

  // Groupe une liste de commandes par fastFood (utilisé pour la liste principale et les sections passées)
  const groupByFastFood = (orders: Commande[]) => {
    const groups: Record<string, { name: string; orders: Commande[] }> = {};
    orders.forEach((o) => {
      const ffId = o.fastFoodId;
      if (!ffId) return;
      if (!groups[ffId]) {
        const ff = fastFoods.find((f) => f.id === ffId);
        groups[ffId] = {
          name: ff?.nom || (ff as any)?.name || "Boutique",
          orders: [],
        };
      }
      groups[ffId].orders.push(o);
    });
    return Object.entries(groups).map(([id, data]) => ({ id, ...data }));
  };

  const groupedOrders = useMemo(() => {
    if (currentTab !== "status") return null;
    const result = groupByFastFood(filteredOrders);

    // Auto-expand first group if nothing is expanded
    if (result.length > 0 && Object.keys(expandedGroups).length === 0) {
      setExpandedGroups({ [result[0].id]: true });
    }

    return result;
  }, [filteredOrders, currentTab, fastFoods]);

  const onManualRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };
  
  if (
    (loading && orders.length === 0) ||
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

  const renderFastFoodGroup = (group: { id: string; name: string; orders: Commande[] }, keyPrefix = "") => {
    const groupKey = `${keyPrefix}${group.id}`;
    const isExpanded = !!expandedGroups[groupKey];
    return (
      <View key={groupKey} style={{ marginBottom: 15 }}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => toggleGroup(groupKey)}
          style={styles.groupHeader}
        >
          <View style={styles.groupHeaderLeft}>
            <Ionicons
              name={isExpanded ? "chevron-down" : "chevron-forward"}
              size={12}
              color="#888780"
            />
            <Text style={styles.groupTitle} numberOfLines={1}>{group.name}</Text>
            <View style={styles.groupCountBadge}>
              <Text style={styles.groupCountText}>
                {group.orders.length} commande{group.orders.length > 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={{ gap: 2 }}>
            {group.orders.map((order) => {
              const isFinished = order.status === 'finished' || order.status === 'delivered';
              return (
                <ClientOrderCard
                  key={order.id}
                  order={order}
                  onUpdateQuantity={handleUpdateQty}
                  showActions={false}
                  hideRanking={isFinished}
                  onPress={() => {
                    setSelectedOrderDetails(order);
                    setSelectedGroupOrders(group.orders);
                    setDetailVisible(true);
                  }}
                />
              );
            })}
          </View>
        )}
      </View>
    );
  };

  const renderStatusGroups = () => {
    const hasMain = groupedOrders && groupedOrders.length > 0;
    const hasPast = pastSections.length > 0;

    if (!hasMain && !hasPast) {
      return (
        <View style={[styles.centered, { paddingTop: 100 }]}>
          <Ionicons name="receipt-outline" size={60} color={Theme.colors.gray[200]} />
          <Text style={styles.emptyText}>Aucune commande pour cette date</Text>
        </View>
      );
    }

    return (
      <View style={{ paddingHorizontal: 16 }}>
        {hasMain ? (
          groupedOrders!.map((g) => renderFastFoodGroup(g))
        ) : (
          <View style={[styles.centered, { paddingTop: 40, paddingBottom: 20 }]}>
            <Ionicons name="receipt-outline" size={50} color={Theme.colors.gray[200]} />
            <Text style={styles.emptyText}>Aucune commande pour aujourd'hui</Text>
          </View>
        )}

        {hasPast && (
          <View style={{ marginTop: 24 }}>
            <Text style={styles.pastSectionLabel}>Commandes des jours précédents</Text>
            {pastSections.map((section) => {
              const sectionKey = `past_${section.iso}`;
              const isOpen = expandedPastSection === section.iso;
              const groups = groupByFastFood(section.orders);
              return (
                <View key={sectionKey} style={{ marginBottom: 15 }}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => togglePastSection(section.iso)}
                    style={styles.groupHeader}
                  >
                    <View style={styles.groupHeaderLeft}>
                      <Ionicons
                        name={isOpen ? "chevron-down" : "chevron-forward"}
                        size={12}
                        color="#888780"
                      />
                      <Text style={styles.groupTitle}>{formatPastDateLabel(section.iso)}</Text>
                      <View style={styles.groupCountBadge}>
                        <Text style={styles.groupCountText}>
                          {section.orders.length} commande{section.orders.length > 1 ? 's' : ''}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                  {isOpen && (
                    <View style={{ marginTop: 6 }}>
                      {groups.map((g) => renderFastFoodGroup(g, `${sectionKey}_`))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

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
        <View
          style={{ position: 'absolute', top: HEADER_HEIGHT - 10, left: 0, right: 0, zIndex: 999 }}
          onLayout={(e) => setTrackingHeaderHeight(e.nativeEvent.layout.height)}
        >
          <OrderTrackingHeader
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            availableDates={availableDates}  
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

      <View style={{ flex: 1, paddingTop: (currentTab === "status" ? HEADER_HEIGHT + trackingHeaderHeight : HEADER_HEIGHT) }}>
        {currentTab === "bonus" ? (
          <BonusScreen />
        ) : currentTab === "status" ? (
          <ScrollView
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: tabBarHeight + 100 },
            ]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onManualRefresh}
                tintColor={Theme.colors.primary}
                colors={[Theme.colors.primary]}
              />
            }
          >
            {renderStatusGroups()}
          </ScrollView>
        ) : (
          <FlatList
            data={filteredOrders}
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
              { paddingBottom: tabBarHeight + 100 },
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
              <View style={[styles.centered, { paddingTop: 100 }]}>
                <Ionicons
                  name="cart-outline"
                  size={60}
                  color={Theme.colors.gray[200]}
                />
                <Text style={styles.emptyText}>Votre panier est vide</Text>
              </View>
            }
          />
        )}
      </View>

      {/* Capsule de confirmation de SUPPRESSION (mode séparé du paiement) */}
      {currentTab === "cart" && pendingToBuy.length > 0 && orderToDelete && (
        <Animated.View style={[
            styles.payFooterCapsule,
            { bottom: tabBarHeight + 10 },
        ]}>
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

      {/* Capsule de PAIEMENT global du panier (total → réseau → input → étapes) */}
      {currentTab === "cart" && pendingToBuy.length > 0 && !orderToDelete && (
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

      <OrderBottomSheet
        isVisible={detailVisible}
        onClose={() => {
            setDetailVisible(false);
            setSelectedOrderDetails(null);
            setSelectedGroupOrders([]);
        }}
        order={selectedOrderDetails}
        allOrders={selectedGroupOrders}
        boutique={fastFoods.find(f => f.id === selectedOrderDetails?.fastFoodId)}
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
    paddingVertical: 1,
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
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 4,
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  groupCountBadge: {
    backgroundColor: '#FFF',
    borderWidth: 0.5,
    borderColor: '#D3D1C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  groupCountText: {
    fontSize: 10,
    color: '#5F5E5A',
    fontWeight: '500',
  },
  pastSectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888780',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
});
