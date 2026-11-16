"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
// Ecran panier. Modules extraits (R4/R26) : `useCartFastFoods` (filtre
// boutique), `useCartFilters` (zone / periode / heure), `useKeyboardTracking`,
// `useCartOrderFlow` (parcours « commander » et paiement), `cartScreenUtils`,
// `CartDeleteCapsule`, `CartScreen.styles`.
import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  FlatList,
  View,
  Text,
  Platform,
  RefreshControl,
  LayoutAnimation,
  UIManager,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useOrders } from "@/src/features/orders/hooks/useOrders";
import { TabHeader } from "@/src/components/molecules/TabHeader";
import { BlurScope, BlurTarget } from "@/src/components/BlurTarget";
import { HeaderPill } from "@/src/components/molecules/HeaderPill";
import { CartOrderCard } from "@/src/features/orders/components/CartOrderCard";
import { CartOrderSkeleton } from "@/src/features/orders/components/CartOrderSkeleton";
import { CartZoneFooterBar } from "@/src/features/orders/components/CartZoneFooterBar";
import { CartFilterChipsRow } from "@/src/features/orders/components/CartFilterChipsRow";
import { CartFilterOptionsSheet } from "@/src/features/orders/components/CartFilterOptionsSheet";
import { CartFastFoodFilter } from "@/src/features/orders/components/CartFastFoodFilter";
import { CartDeleteCapsule } from "@/src/features/orders/components/CartDeleteCapsule";
import { cartScreenStyles as styles } from "@/src/features/orders/components/CartScreen.styles";
import { useCartFastFoods } from "@/src/features/orders/hooks/useCartFastFoods";
import { useCartFilters } from "@/src/features/orders/hooks/useCartFilters";
import { useKeyboardTracking } from "@/src/features/orders/hooks/useKeyboardTracking";
import { synthesizeEditMenu } from "@/src/features/orders/utils/cartScreenUtils";
import { groupCartOrdersByZone } from "@/src/features/orders/utils/groupCartOrders";
import { Theme } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import { useTabBarHeight } from "@/src/hooks/useTabBarHeight";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { useAuthGate } from "@/src/features/auth/context/AuthGateContext";
import { useRequireName } from "@/src/features/profile/hooks/useProfileNameSheet";
import { GuestGate } from "@/src/features/auth/components/GuestGate";
import { Toast } from "@/src/components/Toast";
import { reopenLockedPayment } from "@/src/services/paymentLock";
import { CartCheckoutSheet } from "@/src/features/checkout/components/CartCheckoutSheet";
import { useCartOrderFlow } from "@/src/features/payment/hooks/useCartOrderFlow";
import { CartGroupedDeliverySheet } from "@/src/features/payment/components/CartGroupedDeliverySheet";
import { computeCartTotal } from "@/src/features/checkout/utils/cartDeliveryTotal";
import { t, useLanguage } from "@/src/i18n";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function OrdersScreen() {
  const i18nLang = useLanguage();
  const {
    loading,
    // Renommé : `refreshing` est déjà pris par le pull-to-refresh local.
    refreshing: ordersRefreshing,
    orders,
    pendingToBuy: livePendingToBuy,
    refresh,
    deleteOrder,
    updateLocalOrder,
    buyOrders,
    saveOrder,
  } = useOrders();
  const { userData } = useAuth();
  const { isSignedIn } = useAuthGate();
  const requireName = useRequireName();

  // Paiement en cours : liste GELEE. Le socket sort les commandes payees de
  // `pendingToBuy` des le succes ; on les garde affichees jusqu'au retour au
  // repos (fin de la capsule, `paymentState === "total"`), puis d'un coup.
  const [freezeCart, setFreezeCart] = useState(false);
  const frozenCart = useRef(livePendingToBuy);
  if (!freezeCart) frozenCart.current = livePendingToBuy;
  const pendingToBuy = freezeCart ? frozenCart.current : livePendingToBuy;

  // Total panier (réactif) : une seule livraison facturée par zone (express)
  // ou par zone + période (heure) pour un même fastfood.
  const cartTotal = useMemo(() => computeCartTotal(pendingToBuy), [pendingToBuy]);

  const { cartFastFoods, selectedFastFoodId, setSelectedFastFoodId } =
    useCartFastFoods(pendingToBuy, i18nLang);

  // Commandes du fastfood sélectionné (le filtre pilote la liste).
  const visibleCartOrders = useMemo(
    () =>
      selectedFastFoodId
        ? pendingToBuy.filter((o: any) => o.fastFoodId === selectedFastFoodId)
        : pendingToBuy,
    [pendingToBuy, selectedFastFoodId],
  );

  // Commandes regroupées par zone + créneau.
  const zoneGroups = useMemo(
    () => groupCartOrdersByZone(visibleCartOrders),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleCartOrders, i18nLang],
  );

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const flow = useCartOrderFlow({
    pendingToBuy,
    zoneGroups,
    cartTotal,
    userData,
    refresh,
    requireName,
    setToast,
  });
  const { paymentState, paymentActive, groupedDelivery, startOrder, endPayment } = flow;

  useEffect(() => setFreezeCart(paymentState !== "total"), [paymentState]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { keyboardHeight, isKeyboardVisible } = useKeyboardTracking();
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState<any | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const itemToDelete = useMemo(() => {
    if (!orderToDelete) return null;
    return orders.find((o) => o.id === orderToDelete);
  }, [orderToDelete, orders]);

  const synthesizedEditMenu = useMemo(() => synthesizeEditMenu(orderToEdit), [orderToEdit]);

  const tabBarHeight = useTabBarHeight();
  const insets = useSafeAreaInsets();
  // Hauteur réelle du TabHeader, mesurée via onHeightChange.
  const [headerHeight, setHeaderHeight] = useState(60 + insets.top);
  const HEADER_HEIGHT = headerHeight;
  // Hauteur mesurée du filtre fastfood absolu (0 si panier vide).
  const [filterHeight, setFilterHeight] = useState(0);
  const LIST_TOP = HEADER_HEIGHT + filterHeight;
  // Hauteur mesurée du recap fixe du bas : la liste doit la réserver.
  const [filterBarHeight, setFilterBarHeight] = useState(0);

  const {
    openFilterKind,
    setOpenFilterKind,
    filteredCartOrders,
    filterChips,
    setFilterValue,
    optionsFor,
    valueFor,
  } = useCartFilters(visibleCartOrders, () => setSelectedFastFoodId(null));

  // Groupes de zone des commandes filtrées : recap du bas et paiement.
  const displayedZoneGroups = useMemo(
    () => groupCartOrdersByZone(filteredCartOrders),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredCartOrders, i18nLang],
  );

  const handleConfirmDelete = async () => {
    if (!orderToDelete) return;
    setIsSubmitting(true);
    try {
      const success = await deleteOrder(orderToDelete);
      if (success) {
        setOrderToDelete(null);
        setToast({ message: t("Article supprimé du panier"), type: "success" });
      } else {
        setToast({ message: t("Erreur lors de la suppression"), type: "error" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelDelete = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOrderToDelete(null);
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
        title={t("Votre panier vous attend")}
        subtitle={t("Connectez-vous pour ajouter des plats à votre panier et passer commande.")}
      >
        {null}
      </GuestGate>
    );
  }

  // Skeleton sous le TabHeader : premier chargement, ou RETOUR dans l'app
  // (`ordersRefreshing`). Jamais sur `loading` seul (ajout au panier : la page
  // clignoterait), ni pendant le pull-to-refresh (`refreshing`, il a son
  // indicateur), ni pendant un paiement ou un sheet ouvert (le sheet serait
  // demonte et le suivi du verdict perdu).
  const flowOpen = paymentActive || editModalVisible || groupedDelivery !== null;
  if ((loading && orders.length === 0) || (ordersRefreshing && !refreshing && !flowOpen)) {
    return (
      <View style={styles.container}>
        <BlurScope>
          <TabHeader
            title={t("Mon panier")}
            subtitle={t("Chargement...")}
            onHeightChange={setHeaderHeight}
          />
          <BlurTarget style={{ flex: 1, paddingTop: HEADER_HEIGHT }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <CartOrderSkeleton key={i} />
            ))}
          </BlurTarget>
        </BlurScope>
      </View>
    );
  }

  // Sous-titre du header : total du panier.
  const headerSubtitle = `${cartTotal.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} FCFA`;

  // Pilule de droite : lance « commander » sur tout l'affiché.
  const headerRight =
    pendingToBuy.length > 0 && !orderToDelete ? (
      <HeaderPill
        label={t("Tout commander")}
        icon="card-outline"
        onPress={() => startOrder(displayedZoneGroups)}
      />
    ) : null;

  return (
    <View style={styles.container}>
      {/* Flou Android (SDK 57) : header, recap et capsule floutent la liste
          (`BlurTarget`). Les sheets restent HORS de cette zone. */}
      <BlurScope>
      <TabHeader
        title={t("Mon panier")}
        subtitle={headerSubtitle}
        right={headerRight}
        onHeightChange={setHeaderHeight}
      />

      {/* Pas de paddingTop : le contenu passe SOUS le header (flou). */}
      <BlurTarget style={{ flex: 1 }}>
        {/* Filtre fastfood + chips colles sous le header (position absolue). */}
        <View
          style={{
            position: "absolute",
            top: HEADER_HEIGHT,
            left: 0,
            right: 0,
            zIndex: 999,
            // Opaque : les cartes defilent DESSOUS.
            backgroundColor: "#fff",
          }}
          onLayout={(e) => setFilterHeight(e.nativeEvent.layout.height)}
        >
          <CartFastFoodFilter
            fastFoods={cartFastFoods}
            selectedFastFoodId={selectedFastFoodId}
            onFastFoodPress={setSelectedFastFoodId}
          />

          {/* Un seul fastfood : le filtre boutique se masque, on ajoute de l'air. */}
          {pendingToBuy.length > 0 && (
            <View style={cartFastFoods.length <= 1 ? { paddingTop: 10 } : undefined}>
              <CartFilterChipsRow
                chips={filterChips}
                onOpen={setOpenFilterKind}
                onClear={(kind) => setFilterValue(kind, null)}
              />
            </View>
          )}
        </View>

        <FlatList
          data={filteredCartOrders}
          renderItem={({ item, index }) => (
            <CartOrderCard
              order={item as any}
              // Rang LOCAL : simple numero d'ordre dans la liste affichee.
              localRank={index + 1}
              showActions
              onPress={() => {
                if (reopenLockedPayment()) return;
                setOrderToEdit(item);
                setEditModalVisible(true);
              }}
              onDelete={(id) => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setOrderToEdit(null);
                setOrderToDelete(id);
              }}
            />
          )}
          keyExtractor={(item: any) => String(item.id)}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingTop: LIST_TOP,
              // Navbar + recap reserves, sans marge en plus (R19).
              paddingBottom: tabBarHeight + filterBarHeight + 8,
            },
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
              <Ionicons
                name={zoneGroups.length > 0 ? "funnel-outline" : "cart-outline"}
                size={60}
                color={Theme.colors.gray[200]}
              />
              <Text style={styles.emptyText}>
                {zoneGroups.length > 0
                  ? t("Aucune commande pour ce filtre")
                  : t("Votre panier est vide")}
              </Text>
            </View>
          }
        />
      </BlurTarget>

      {/* Recap du panier, FIXE au-dessus de la navbar. */}
      {pendingToBuy.length > 0 && (
        <View
          style={[styles.zoneFooterBar, { bottom: tabBarHeight }]}
          onLayout={(e) => setFilterBarHeight(e.nativeEvent.layout.height)}
        >
          <CartZoneFooterBar groups={displayedZoneGroups} onPay={startOrder} />
        </View>
      )}

      {/* Bottom sheet de l'axe de filtre ouvert (zone / periode / heure). */}
      <CartFilterOptionsSheet
        visible={openFilterKind !== null}
        kind={openFilterKind}
        options={optionsFor(openFilterKind)}
        selected={valueFor(openFilterKind)}
        onSelect={(key) => {
          if (openFilterKind) setFilterValue(openFilterKind, key);
        }}
        onClose={() => setOpenFilterKind(null)}
      />

      {pendingToBuy.length > 0 && orderToDelete && (
        <CartDeleteCapsule
          item={itemToDelete}
          bottom={tabBarHeight + 10}
          submitting={isSubmitting}
          onCancel={cancelDelete}
          onConfirm={handleConfirmDelete}
        />
      )}
      </BlurScope>

      {/* Sheet de LIVRAISON GROUPÉE : groupage, livraison commune puis paiement
          dans un seul `Modal`. La livraison validée s'applique à tout le lot. */}
      <CartGroupedDeliverySheet
        visible={!orderToDelete && groupedDelivery !== null && !flow.groupedHidden}
        onHide={() => flow.setGroupedHidden(true)}
        groups={groupedDelivery || []}
        onSplit={() => {
          flow.setGroupedDelivery(null);
          setToast({
            message:
              t("Utilisez les filtres pour isoler les commandes à livrer dans la même zone et le même créneau, ou validez-les individuellement."),
            type: "success",
          });
        }}
        fastFoodId={
          (groupedDelivery?.[0]?.entries[0]?.order as any)?.fastFoodId ||
          selectedFastFoodId ||
          undefined
        }
        /* Le paiement est le TROISIÈME calque de ce même sheet : on arme juste
           l'état, sans croiser deux Modals. */
        onValidate={flow.validateGroupedDelivery}
        onClose={endPayment}
        onError={(msg) => setToast({ message: msg, type: "error" })}
        phone={flow.paymentPhone}
        onPhoneChange={flow.setPaymentPhone}
        network={flow.paymentNetwork}
        onNetworkChange={flow.setPaymentNetwork}
        paymentState={paymentState}
        setPaymentState={flow.setPaymentState}
        ussdMessage={flow.ussdMessage}
        onConfirm={flow.confirmCartPayment}
        keyboardHeight={keyboardHeight}
        isKeyboardVisible={isKeyboardVisible}
      />

      {toast && (
        <Toast
          key={toast.message}
          message={toast.message}
          type={toast.type}
          duration={toast.type === "error" ? 10000 : undefined}
          onHide={() => setToast(null)}
        />
      )}

      {orderToEdit && (
        <CartCheckoutSheet
          key={orderToEdit.id}
          visible={editModalVisible}
          onClose={() => setEditModalVisible(false)}
          onReopen={() => setEditModalVisible(true)}
          menu={synthesizedEditMenu}
          initialOrder={orderToEdit}
          isCartMode={true}
          onChange={updateLocalOrder}
          /* Enregistrer : la commande RESTE dans le panier, le sheet reste ouvert. */
          onSave={(updatedOrder: any) => saveOrder({ ...updatedOrder, id: orderToEdit.id })}
          onConfirm={async (updatedOrder) => {
            const result = await buyOrders([{ ...updatedOrder, status: "pendingToBuy" }]);
            if (result.success) {
              setToast({ message: t("Commande validée avec succès"), type: "success" });
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
