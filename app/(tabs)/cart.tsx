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
  TextInput,
  LayoutAnimation,
  UIManager,
  Animated,
  Keyboard,
  Dimensions,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Commande, Menu } from "@/src/types";
import { useOrders } from "@/src/features/orders/hooks/useOrders";
import { OrderHeader } from "@/src/features/orders/components/OrderHeader";
import { ClientOrderCard } from "@/src/features/orders/components/ClientOrderCard";
import { OrderTrackingHeader } from "@/src/features/orders/components/OrderTrackingHeader";
import { Theme } from "@/src/theme";
import { PaymentSheet } from "@/src/features/payment/components/PaymentSheet";
import { BlurView } from "expo-blur";
import { BonusScreen } from "@/src/features/bonus/components/BonusScreen";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator } from "@/src/components/CustomActivityIndicator";
import { useTabBarHeight } from "@/src/hooks/useTabBarHeight";
import { Loader } from "@/src/components/Loader";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { Toast } from "@/src/components/Toast";
import { CartCheckoutSheet } from "@/src/features/checkout/components/CartCheckoutSheet";
import { useFastFoods } from "@/src/features/restaurants/hooks/useFastFoods";
import { OrderBottomSheet } from "@/src/features/orders/components/OrderBottomSheet";

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
  
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isPaying, setIsPaying] = useState(false);
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
  const fadeAnim = React.useRef(new Animated.Value(1)).current;
  const keyboardHeight = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (userData?.infos?.numero) {
      setPhoneNumber(userData.infos.numero.toString());
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

  const handlePayerPress = () => {
    if (isKeyboardVisible) {
      Keyboard.dismiss();
    } else if (isPaying) {
      handlePaymentSuccess();
    } else {
      togglePaying();
    }
  };

  const togglePaying = () => {
    // Fade out
    Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
    }).start(() => {
        setIsPaying(!isPaying);
        // Fade in
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
        }).start();
    });

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };
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

  const calculateCartTotal = () => {
    const totalValue = pendingToBuy.reduce((acc, o) => {
        const itemTotal = o.total || 0;
        return acc + (Number(itemTotal) || 0);
    }, 0);
    return isNaN(totalValue) ? 0 : totalValue;
  };

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
  const filteredOrders = useMemo(() => {
    if (currentTab === "cart") return pendingToBuy;

    let list: Commande[] = [];
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

  const handlePaymentSuccess = async () => {
    const validationErr = validateAllDeliveries();
    if (validationErr) {
      setToast({ message: validationErr, type: 'error' });
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await buyOrders(pendingToBuy);
      if (result.success) {
        Alert.alert("Succès ✨", "Votre commande a été validée avec succès !");
        setCurrentTab("status");
        setActiveStatus("pending");
        setIsPaying(false);
      } else {
        Alert.alert(
          "Attention",
          result.message || "Une erreur est survenue lors de la validation de la commande.",
        );
        refresh();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const { fastFoods } = useFastFoods();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const groupedOrders = useMemo(() => {
    if (currentTab !== "status") return null;
    const groups: Record<string, { name: string; orders: Commande[] }> = {};
    
    filteredOrders.forEach(o => {
      const ffId = o.fastFoodId;
      if (!ffId) return;
      if (!groups[ffId]) {
        const ff = fastFoods.find(f => f.id === ffId);
        groups[ffId] = {
          name: ff?.nom || (ff as any)?.name || "Boutique",
          orders: []
        };
      }
      groups[ffId].orders.push(o);
    });
    
    const result = Object.entries(groups).map(([id, data]) => ({ id, ...data }));
    
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

  const renderStatusGroups = () => {
    if (!groupedOrders || groupedOrders.length === 0) {
      return (
        <View style={[styles.centered, { paddingTop: 100 }]}>
          <Ionicons name="receipt-outline" size={60} color={Theme.colors.gray[200]} />
          <Text style={styles.emptyText}>Aucune commande pour cette date</Text>
        </View>
      );
    }

    return (
      <View style={{ paddingHorizontal: 16 }}>
        {groupedOrders.map((group) => {
          const isExpanded = !!expandedGroups[group.id];
          return (
            <View key={group.id} style={{ marginBottom: 15 }}>
              <TouchableOpacity 
                activeOpacity={0.7} 
                onPress={() => toggleGroup(group.id)}
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
                  {group.orders.map(order => {
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
        })}
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

      {currentTab === "cart" && pendingToBuy.length > 0 && (
        <Animated.View style={[
            styles.payFooterCapsule, 
            { 
                bottom: Animated.add(keyboardHeight, isKeyboardVisible ? 5 : tabBarHeight + 10),
            }
        ]}>
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          
          {orderToDelete ? (
            <TouchableOpacity style={styles.closeCircle} onPress={cancelDelete}>
               <Ionicons name="close" size={16} color="white" />
            </TouchableOpacity>
          ) : isPaying ? (
            !isKeyboardVisible && (
              <TouchableOpacity style={styles.closeCircle} onPress={togglePaying}>
                <Ionicons name="close" size={16} color="white" />
              </TouchableOpacity>
            )
          ) : (
            <View style={styles.totalIconCircle}>
               <Ionicons name="card-outline" size={16} color="white" />
            </View>
          )}

          {orderToDelete ? (
            <View style={styles.deleteMsgWrapper}>
              <Text style={styles.deleteMenuTitle} numberOfLines={1}>
                {((itemToDelete as any)?.menu?.titre || (itemToDelete as any)?.menu?.name || "Article")} - {((itemToDelete as any)?.total || (itemToDelete as any)?.prixTotal || 0)} FCFA
              </Text>
              <Text style={styles.deleteMsg}>Voulez-vous vraiment supprimer ?</Text>
            </View>
          ) : isPaying ? (
            <Animated.View style={[styles.inputWrapper, { opacity: fadeAnim }]}>
              <Ionicons name="call-outline" size={16} color="white" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                placeholder="Numéro de paiement"
                placeholderTextColor="rgba(255,255,255,0.5)"
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                autoFocus
              />
            </Animated.View>
          ) : (
            <Animated.View style={[styles.totalInfo, { opacity: fadeAnim }]}>
              <Text style={styles.totalTitle}>Total à payer</Text>
              <Text style={styles.totalAmount}>{calculateCartTotal()} FCFA</Text>
            </Animated.View>
          )}

          <TouchableOpacity
            style={[styles.payerBtnHome, isSubmitting && { opacity: 0.7 }, orderToDelete && { backgroundColor: '#ef4444' }]}
            onPress={orderToDelete ? handleConfirmDelete : handlePayerPress}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons
                name={orderToDelete ? "checkmark" : (isKeyboardVisible ? "chevron-down" : "arrow-forward-outline")}
                size={isKeyboardVisible ? 18 : 16}
                color="white"
              />
            )}
          </TouchableOpacity>
        </Animated.View>
      )}

      <PaymentSheet
        visible={paymentVisible}
        onClose={() => setPaymentVisible(false)}
        amount={calculateCartTotal()}
        onSuccess={handlePaymentSuccess}
      />

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
  totalIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalInfo: {
    flex: 1,
    marginLeft: 12,
  },
  totalTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  totalAmount: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    height: 45,
    borderRadius: 22.5,
    paddingHorizontal: 12,
    marginHorizontal: 10,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    padding: 0,
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
});
