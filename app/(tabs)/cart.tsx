import React, { useState, useMemo, useEffect } from "react";
import {
  StyleSheet,
  FlatList,
  View,
  Text,
  TouchableOpacity,
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
import { CartZoneTable } from "@/src/features/orders/components/CartZoneTable";
import {
  CartFastFoodFilter,
  type CartFastFood,
} from "@/src/features/orders/components/CartFastFoodFilter";
import { useFastFoods } from "@/src/features/restaurants/hooks/useFastFoods";
import { groupCartOrdersByZone } from "@/src/features/orders/utils/groupCartOrders";
import { Theme } from "@/src/theme";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator } from "@/src/components/CustomActivityIndicator";
import { useTabBarHeight } from "@/src/hooks/useTabBarHeight";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { useAuthGate } from "@/src/features/auth/context/AuthGateContext";
import { GuestGate } from "@/src/features/auth/components/GuestGate";
import { Toast } from "@/src/components/Toast";
import { CartCheckoutSheet } from "@/src/features/checkout/components/CartCheckoutSheet";
import { useCartPayment } from "@/src/features/payment/hooks/useCartPayment";
import { sanitizeOrder } from "@/src/features/orders/utils/sanitizeOrder";
import { CartPaymentOverlay } from "@/src/features/payment/components/CartPaymentOverlay";
import { CartPaymentTopCard } from "@/src/features/payment/components/CartPaymentTopCard";
import { computeCartTotal } from "@/src/features/checkout/utils/cartDeliveryTotal";

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
    updateLocalOrder,
    buyOrders,
    saveOrder,
  } = useOrders();
  const { userData } = useAuth();
  const { isSignedIn } = useAuthGate();

  // Total panier (réactif) — calculé tôt pour alimenter le hook de paiement.
  // Les frais de livraison sont mutualisés : une seule livraison facturée par
  // zone (express) ou par zone + période (heure) pour un même fastfood.
  const cartTotal = useMemo(
    () => computeCartTotal(pendingToBuy),
    [pendingToBuy],
  );

  // Filtre fastfood du haut de page (duplication du filtre « État des commandes »).
  const { fastFoods } = useFastFoods();
  const [selectedFastFoodId, setSelectedFastFoodId] = useState<string | null>(
    null,
  );

  // Fastfoods présents dans le panier + nombre de commandes et montant total
  // (livraison mutualisée incluse) par fastfood.
  const cartFastFoods = useMemo<CartFastFood[]>(() => {
    const map = new Map<string, CartFastFood>();
    const ordersByFf = new Map<string, any[]>();
    pendingToBuy.forEach((o: any) => {
      const ffId = o.fastFoodId;
      if (!ffId) return;
      let entry = map.get(ffId);
      if (!entry) {
        const ff: any = fastFoods.find((f: any) => f.id === ffId);
        entry = {
          id: ffId,
          name: ff?.nom || ff?.name || "Boutique",
          image: ff?.image || ff?.logo || ff?.coverImage,
          orderCount: 0,
          total: 0,
        };
        map.set(ffId, entry);
      }
      entry.orderCount += 1;
      ordersByFf.set(ffId, [...(ordersByFf.get(ffId) || []), o]);
    });
    // Total par fastfood : même calcul que le total panier (livraison mutualisée).
    map.forEach((entry, ffId) => {
      entry.total = computeCartTotal(ordersByFf.get(ffId) || []);
    });
    return Array.from(map.values());
  }, [pendingToBuy, fastFoods]);

  // Sélection par défaut : le premier fastfood ; on re-sélectionne si celui en
  // cours disparaît du panier.
  useEffect(() => {
    // 0 ou 1 fastfood : le filtre n'est pas rendu, il ne réserve aucune hauteur.
    if (cartFastFoods.length <= 1) setFilterHeight(0);
    if (cartFastFoods.length === 0) {
      if (selectedFastFoodId !== null) setSelectedFastFoodId(null);
      return;
    }
    if (!cartFastFoods.some((f) => f.id === selectedFastFoodId)) {
      setSelectedFastFoodId(cartFastFoods[0].id);
    }
  }, [cartFastFoods, selectedFastFoodId]);

  // Commandes du fastfood sélectionné (le filtre pilote la liste des tableaux).
  const visibleCartOrders = useMemo(
    () =>
      selectedFastFoodId
        ? pendingToBuy.filter((o: any) => o.fastFoodId === selectedFastFoodId)
        : pendingToBuy,
    [pendingToBuy, selectedFastFoodId],
  );

  // Commandes regroupées par zone + créneau : une card de tableau par groupe.
  const zoneGroups = useMemo(
    () => groupCartOrdersByZone(visibleCartOrders),
    [visibleCartOrders],
  );

  // Groupe (zone) en cours de paiement via "Tout payer" du pied de tableau.
  // null = paiement global du panier (pilule "Tout commander" du header).
  const [payingGroupKey, setPayingGroupKey] = useState<string | null>(null);
  const payingGroup = useMemo(
    () => zoneGroups.find((g) => g.key === payingGroupKey) || null,
    [zoneGroups, payingGroupKey],
  );
  // Commandes et montant réellement payés : le groupe choisi, sinon tout le panier.
  const ordersToPay = payingGroup
    ? payingGroup.entries.map((e) => e.order)
    : pendingToBuy;
  const amountToPay = payingGroup ? payingGroup.total : cartTotal;

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

  // Fin de paiement (succès ou fermeture) : on repart en mode panier global.
  const endPayment = React.useCallback(() => {
    setPayingGroupKey(null);
    resetPayment();
  }, [resetPayment]);

  // Après succès complet (success_created) : rafraîchir + revenir au repos.
  useEffect(() => {
    if (paymentState === "success_created") {
      const timer = setTimeout(() => {
        endPayment();
        refresh();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [paymentState, endPayment, refresh]);

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
  // Hauteur mesurée du filtre fastfood absolu (0 si panier vide).
  const [filterHeight, setFilterHeight] = useState(0);
  const LIST_TOP = HEADER_HEIGHT + filterHeight;

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

  const validateAllDeliveries = (): string | null => {
    for (const order of ordersToPay) {
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
    // items = commandes payées (le panier entier, ou la seule zone choisie via
    // "Tout payer"), sanitizées EXACTEMENT comme l'envoi historique
    // (buyOrders → /order/tabs), via la fonction partagée sanitizeOrder.
    const items = ordersToPay.map((o) => sanitizeOrder(o, userData?.uid));
    await handlePaymentConfirm(phone, items, amountToPay);
  };

  const onManualRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  // Invité : le panier est lié au compte → on demande la connexion.
  if (!isSignedIn) {
    return (
      <GuestGate
        icon="cart-outline"
        title="Votre panier vous attend"
        subtitle="Connectez-vous pour ajouter des plats à votre panier et passer commande."
      >
        {null}
      </GuestGate>
    );
  }

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

  // Pilule de droite : ouvre l'overlay de paiement du panier.
  const headerRight =
    pendingToBuy.length > 0 && !orderToDelete ? (
      <HeaderPill
        label="Tout commander"
        icon="card-outline"
        onPress={() => {
          setPayingGroupKey(null);
          setPaymentState("input");
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
        {/* Filtre fastfood collé sous le header (position absolue), comme sur
            la page « État des commandes » : il ne scrolle pas avec la liste. */}
        <View
          style={{
            position: "absolute",
            top: HEADER_HEIGHT,
            left: 0,
            right: 0,
            zIndex: 999,
          }}
          onLayout={(e) => setFilterHeight(e.nativeEvent.layout.height)}
        >
          <CartFastFoodFilter
            fastFoods={cartFastFoods}
            selectedFastFoodId={selectedFastFoodId}
            onFastFoodPress={setSelectedFastFoodId}
          />
        </View>

        <FlatList
          data={zoneGroups}
          renderItem={({ item }) => (
            <CartZoneTable
              groups={[item]}
              onSelect={(entry) => {
                setOrderToEdit(entry.order);
                setEditModalVisible(true);
              }}
              onDelete={(id) => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setOrderToEdit(null);
                setOrderToDelete(id);
              }}
              onPayGroup={(group) => {
                setPayingGroupKey(group.key);
                setPaymentState("input");
              }}
            />
          )}
          keyExtractor={(item) => item.key}
          contentContainerStyle={[
            styles.listContent,
            { paddingTop: LIST_TOP, paddingBottom: tabBarHeight + 100 },
          ]}
          scrollIndicatorInsets={{ top: LIST_TOP }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onManualRefresh}
              progressViewOffset={LIST_TOP}
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

      {/* Sheet de PAIEMENT global du panier — ouvert par la pilule "Tout commander"
          du header (masqué à l'état "total" au repos). Un seul bloc blanc,
          posé au-dessus de la nav bar comme le sheet de commande individuelle :
          la card de récap en haut, la capsule DEDANS en bas.

          ⚠️ NE PAS conditionner à `pendingToBuy.length` : dès que le paiement
          aboutit, les commandes quittent le panier (socket) et le sheet serait
          démonté avant d'avoir affiché succès. `paymentState !== "total"` suffit
          — c'est exactement « un paiement est en cours ». */}
      {/* Monté en permanence, piloté par `visible` : le démonter directement
          couperait l'animation de sortie, le sheet disparaîtrait d'un coup au
          lieu de redescendre. */}
      <CartPaymentTopCard
        visible={!orderToDelete && paymentState !== "total"}
        /* Le sheet est dans un Modal : il descend jusqu'au bas de l'écran et
           recouvre la nav bar. Il ne bouge PAS à l'ouverture du clavier —
           seule la capsule remonte (comme au home). */
        bottom={0}
        keyboardHeight={keyboardHeight}
        isKeyboardVisible={isKeyboardVisible}
        network={paymentNetwork}
        onNetworkChange={setPaymentNetwork}
      >
          <CartPaymentOverlay
            phone={paymentPhone}
            onPhoneChange={setPaymentPhone}
            onConfirm={confirmCartPayment}
            totalAmount={amountToPay}
            paymentState={paymentState}
            setPaymentState={setPaymentState}
            network={paymentNetwork}
            onNetworkChange={setPaymentNetwork}
            ussdMessage={ussdMessage}
            onClose={endPayment}
            onError={(msg) => setToast({ message: msg, type: 'error' })}
            isKeyboardVisible={isKeyboardVisible}
            /* Ancrée sur le bas du SHEET (son parent). C'est elle SEULE qui
               remonte avec le clavier, la card du haut ne bouge pas.

               La capsule est ancrée sur la hauteur du clavier + le même
               collage que le home (`paddingBottom: 2`). Le `translateY: -100`
               du home n'a PAS d'équivalent ici : là-bas la capsule est ancrée
               au bas de l'ÉCRAN et ces 100px la remontent vers le clavier —
               ici elle est déjà posée dessus. */
            bottom={Animated.add(keyboardHeight, 2)}
          />
      </CartPaymentTopCard>

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
          /* Enregistrer : persiste les modifs locales, la commande RESTE dans le
             panier et le sheet reste ouvert (le toast est affiché par le sheet). */
          onSave={(updatedOrder: any) =>
            saveOrder({ ...updatedOrder, id: orderToEdit.id })
          }
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
    paddingHorizontal: 12,
    gap: 12,
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
