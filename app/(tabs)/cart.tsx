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
import { Menu } from "@/src/types";
import { useOrders } from "@/src/features/orders/hooks/useOrders";
import { TabHeader } from "@/src/components/molecules/TabHeader";
import { HeaderPill } from "@/src/components/molecules/HeaderPill";
import { CartOrderCard } from "@/src/features/orders/components/CartOrderCard";
import { CartZoneFooterBar } from "@/src/features/orders/components/CartZoneFooterBar";
import {
  CartFilterChipsRow,
  type CartFilterKind,
} from "@/src/features/orders/components/CartFilterChipsRow";
import { CartFilterOptionsSheet } from "@/src/features/orders/components/CartFilterOptionsSheet";
import {
  CartFastFoodFilter,
  type CartFastFood,
} from "@/src/features/orders/components/CartFastFoodFilter";
import { useFastFoods } from "@/src/features/restaurants/hooks/useFastFoods";
import { groupCartOrdersByZone } from "@/src/features/orders/utils/groupCartOrders";
import { prefetchFastFoodDelivery } from "@/src/features/payment/hooks/useGroupedDeliveryData";
import { Theme } from "@/src/theme";
import { AppBlurView as BlurView } from "@/src/components/AppBlurView";
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
import { CartPaymentSheet } from "@/src/features/payment/components/CartPaymentSheet";
import { CartGroupedDeliverySheet } from "@/src/features/payment/components/CartGroupedDeliverySheet";
import { computeCartTotal } from "@/src/features/checkout/utils/cartDeliveryTotal";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
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

  // Creneaux et zones express des boutiques du panier chargees d'avance : a
  // l'ouverture d'un sheet de livraison, la card « Zone » est deja la. Sans ce
  // prechauffage le sheet rend une premiere fois sans elle, puis la fait
  // apparaitre a l'arrivee de la reponse.
  useEffect(() => {
    cartFastFoods.forEach((f) => prefetchFastFoodDelivery(f.id));
  }, [cartFastFoods]);

  // Sélection par défaut : le premier fastfood ; on re-sélectionne si celui en
  // cours disparaît du panier.
  useEffect(() => {
    // La hauteur du bloc collant vient uniquement de son `onLayout` : il porte
    // desormais AUSSI les chips de filtre, il ne retombe donc pas a 0 quand le
    // filtre boutique n'est pas rendu (0 ou 1 boutique).
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

  // Sheet de livraison groupée : prend TOUT le parcours quand le « commander »
  // porte sur plusieurs courses. Il porte ses TROIS étapes en interne (groupage,
  // livraison commune, paiement). `null` = fermé.
  const [groupedDelivery, setGroupedDelivery] = useState<ReturnType<
    typeof groupCartOrdersByZone
  > | null>(null);
  /**
   * Montant RÉELLEMENT envoyé au backend. En livraison groupée, une seule course
   * est facturée (la plus chère) : `amountToPay` compterait une course par zone
   * et ferait payer plus que ce que le sheet affiche.
   */
  const amountToPayEffective = React.useMemo(() => {
    if (!groupedDelivery) return amountToPay;
    const articles = groupedDelivery.reduce((s, g) => s + g.articles, 0);
    const course = groupedDelivery.reduce(
      (s, g) => Math.max(s, g.livraison),
      0,
    );
    return articles + course;
  }, [groupedDelivery, amountToPay]);

  // Livraison commune validée : écrase celle de chaque commande payée.
  const [groupedDeliveryValue, setGroupedDeliveryValue] = useState<any>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [orderToEdit, setOrderToEdit] = useState<any | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const itemToDelete = useMemo(() => {
    if (!orderToDelete) return null;
    return orders.find((o) => o.id === orderToDelete);
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
      images: orderToEdit.menu.images || [
        orderToEdit.menu.image || orderToEdit.menu.coverImage || "",
      ],
      extra: orderToEdit.extra || [],
      drink: orderToEdit.drink || [],
    } as Menu;
  }, [orderToEdit]);

  // Hauteur du clavier : la capsule de paiement du sheet remonte avec lui.
  const keyboardHeight = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (userData?.infos?.numero) {
      setPaymentPhone(userData.infos.numero.toString());
    }
  }, [userData, setPaymentPhone]);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setIsKeyboardVisible(true);
        Animated.spring(keyboardHeight, {
          toValue: e.endCoordinates.height,
          useNativeDriver: false,
          tension: 40,
          friction: 8,
        }).start();
      },
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setIsKeyboardVisible(false);
        Animated.spring(keyboardHeight, {
          toValue: 0,
          useNativeDriver: false,
          tension: 40,
          friction: 8,
        }).start();
      },
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardHeight]);

  // Verdict paiement via socket : actif tant qu'un paiement est en cours.
  const paymentActive = paymentState !== "total";
  useEffect(() => {
    if (!paymentActive) return;
    registerPaymentHandler(handlePaymentVerdict);
    return () => unregisterPaymentHandler();
  }, [
    paymentActive,
    handlePaymentVerdict,
    registerPaymentHandler,
    unregisterPaymentHandler,
  ]);

  // Fin de paiement (succès ou fermeture) : on repart en mode panier global.
  const endPayment = React.useCallback(() => {
    setPayingGroupKey(null);
    setGroupedDeliveryValue(null);
    // Le parcours groupé porte le paiement dans son propre sheet : la fin du
    // paiement le referme aussi, sinon il resterait ouvert sur le succès.
    setGroupedDelivery(null);
    resetPayment();
  }, [resetPayment]);

  /**
   * Point d'entrée unique de « commander » (récap du bas ET pilule du header).
   *
   * Plusieurs courses concernées → on ouvre le sheet de livraison groupée, qui
   * demande d'abord s'il faut une livraison unique ou des livraisons séparées.
   * Une seule course → rien à arbitrer, on ouvre directement le paiement.
   */
  const startOrder = React.useCallback(
    (groups: ReturnType<typeof groupCartOrdersByZone>) => {
      if (groups.length > 1) {
        setGroupedDelivery(groups);
        return;
      }
      setPayingGroupKey(groups.length === 1 ? groups[0].key : null);
      setPaymentState("input");
    },
    [setPaymentState],
  );

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
      setToast({ message: paymentError, type: "error" });
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

  // ── Filtres du panier : 3 axes indépendants (zone / période / heure),
  // chacun choisi dans son propre bottom sheet via les chips de tête de liste. ──
  const [openFilterKind, setOpenFilterKind] = useState<CartFilterKind | null>(
    null,
  );
  const [zoneFilter, setZoneFilter] = useState<string | null>(null);
  const [periodeFilter, setPeriodeFilter] = useState<string | null>(null);
  const [heureFilter, setHeureFilter] = useState<string | null>(null);
  // Hauteur mesurée du recap fixe du bas : la liste doit la réserver.
  const [filterBarHeight, setFilterBarHeight] = useState(0);

  /** Libellé de période d'une commande : "Express" / "Créneau" / "Sur place". */
  const periodeOf = (o: any) =>
    o?.delivery?.status !== true
      ? "Sur place"
      : o?.delivery?.type === "express"
        ? "Express"
        : "Créneau";

  /** Zone de livraison, "Retrait en boutique" à défaut. */
  const zoneOf = (o: any) =>
    o?.delivery?.status === true
      ? o?.delivery?.zone || o?.delivery?.location || "Zone inconnue"
      : "Retrait en boutique";

  /** Créneau horaire, `null` hors livraison programmée. */
  const heureOf = (o: any): string | null =>
    o?.delivery?.type === "time"
      ? o?.delivery?.time || o?.delivery?.hour || null
      : null;

  /** Compte les valeurs distinctes d'un axe sur un lot de commandes. */
  const countBy = (orders: any[], pick: (o: any) => string | null) => {
    const map = new Map<string, number>();
    orders.forEach((o) => {
      const k = pick(o);
      if (k) map.set(k, (map.get(k) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([key, count]) => ({
      key,
      label: key,
      count,
    }));
  };

  /**
   * Commandes réellement affichées : les 3 axes se composent en ET. Un axe non
   * renseigné (`null`) n'impose aucune restriction.
   */
  const filteredCartOrders = useMemo(
    () =>
      visibleCartOrders.filter((o: any) => {
        if (zoneFilter && zoneOf(o) !== zoneFilter) return false;
        if (periodeFilter && periodeOf(o) !== periodeFilter) return false;
        if (heureFilter && heureOf(o) !== heureFilter) return false;
        return true;
      }),
    [visibleCartOrders, zoneFilter, periodeFilter, heureFilter],
  );

  // Options de chaque sheet, comptées sur le panier visible (avant filtrage,
  // pour que choisir une valeur n'efface pas les autres choix possibles).
  const zoneOptions = useMemo(
    () => countBy(visibleCartOrders, zoneOf),
    [visibleCartOrders],
  );
  const periodeOptions = useMemo(
    () => countBy(visibleCartOrders, periodeOf),
    [visibleCartOrders],
  );
  const heureOptions = useMemo(
    () => countBy(visibleCartOrders, heureOf),
    [visibleCartOrders],
  );

  const filterChips = useMemo(
    () => [
      { kind: "zone" as CartFilterKind, value: zoneFilter },
      { kind: "periode" as CartFilterKind, value: periodeFilter },
      { kind: "heure" as CartFilterKind, value: heureFilter },
    ],
    [zoneFilter, periodeFilter, heureFilter],
  );

  const setFilterValue = (kind: CartFilterKind, value: string | null) => {
    if (kind === "zone") setZoneFilter(value);
    else if (kind === "periode") setPeriodeFilter(value);
    else setHeureFilter(value);
  };

  const optionsFor = (kind: CartFilterKind | null) =>
    kind === "zone"
      ? zoneOptions
      : kind === "periode"
        ? periodeOptions
        : kind === "heure"
          ? heureOptions
          : [];

  const valueFor = (kind: CartFilterKind | null) =>
    kind === "zone"
      ? zoneFilter
      : kind === "periode"
        ? periodeFilter
        : kind === "heure"
          ? heureFilter
          : null;

  // Groupes de zone des commandes filtrées : ne servent plus qu'au recap du bas
  // et au paiement (la liste, elle, est désormais plate).
  const displayedZoneGroups = useMemo(
    () => groupCartOrdersByZone(filteredCartOrders),
    [filteredCartOrders],
  );

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
      if (!d || !d.status || d.type === "aucune") continue;
      const menuName =
        (order.menu as any)?.name || (order.menu as any)?.titre || "Commande";
      if (!d.location) return `"${menuName}" : adresse de livraison requise`;
      if (!d.phone && !order.userData?.phoneNumber)
        return `"${menuName}" : numéro de contact requis`;
      if (d.type === "time" && !d.time)
        return `"${menuName}" : période de livraison requise`;
    }
    return null;
  };

  /**
   * Convertit la `Livraison` composée dans le sheet de livraison groupée vers
   * le format `delivery` d'une commande du panier (celui que lit
   * `sanitizeOrder` : `location` / `zone` / `time`, pas `address` /
   * `expressLieu` / `hour`).
   */
  const toOrderDelivery = (d: any) => {
    if (!d || d.type === "aucune") return { status: false, type: "aucune" };
    const express = d.type === "express";
    return {
      status: true,
      // Le panier nomme "time" ce que le checkout appelle "standard".
      type: express ? "express" : "time",
      location: d.address || "",
      zone: express ? d.expressLieu || "" : d.address || "",
      phone: d.phone || "",
      prix: Number(express ? d.expressPrix : d.prix) || 0,
      ...(d.date && { date: d.date }),
      ...(!express && d.hour && { time: d.hour }),
      ...(d.voiceNoteUri && { voiceNoteUri: d.voiceNoteUri }),
      ...(d.note && { note: d.note }),
      ...(d.bonusCode && { bonusCode: d.bonusCode }),
    };
  };

  // Valide les livraisons puis délègue le paiement au hook useCartPayment.
  const confirmCartPayment = async (phone: string) => {
    // Livraison groupée : elle a été composée et validée dans son propre sheet,
    // elle remplace celle de chaque commande — la validation par commande ne
    // s'applique donc plus (elle porterait sur les anciennes livraisons).
    if (!groupedDeliveryValue) {
      const validationErr = validateAllDeliveries();
      if (validationErr) {
        setToast({ message: validationErr, type: "error" });
        // Revenir à l'input pour corriger (sinon coincé en waiting).
        setPaymentState("input");
        return;
      }
    }
    // items = commandes payées (le panier entier, ou la seule zone choisie via
    // "Tout payer"), sanitizées EXACTEMENT comme l'envoi historique
    // (buyOrders → /order/tabs), via la fonction partagée sanitizeOrder.
    const items = ordersToPay.map((o) =>
      sanitizeOrder(
        groupedDeliveryValue ? { ...o, delivery: groupedDeliveryValue } : o,
        userData?.uid,
      ),
    );
    await handlePaymentConfirm(phone, items, amountToPayEffective);
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
        onPress={() => startOrder(displayedZoneGroups)}
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
            // Opaque : les cartes defilent DESSOUS, elles ne doivent pas
            // transparaitre derriere les chips de filtre.
            backgroundColor: "#fff",
          }}
          onLayout={(e) => setFilterHeight(e.nativeEvent.layout.height)}
        >
          <CartFastFoodFilter
            fastFoods={cartFastFoods}
            selectedFastFoodId={selectedFastFoodId}
            onFastFoodPress={setSelectedFastFoodId}
          />

          {/* Chips de filtre FIXES : dans le meme bloc absolu que le filtre
              boutique, donc mesures dans `filterHeight` et jamais scrolles. */}
          {pendingToBuy.length > 0 && (
            <CartFilterChipsRow
              chips={filterChips}
              onOpen={setOpenFilterKind}
              onClear={(kind) => setFilterValue(kind, null)}
            />
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
                setOrderToEdit(item);
                setEditModalVisible(true);
              }}
              onDelete={(id) => {
                LayoutAnimation.configureNext(
                  LayoutAnimation.Presets.easeInEaseOut,
                );
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
              // Reserve la navbar, la barre de chips ET le recap pose dessus.
              paddingBottom: tabBarHeight + filterBarHeight + 100,
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
                  ? "Aucune commande pour ce filtre"
                  : "Votre panier est vide"}
              </Text>
            </View>
          }
        />
      </View>

      {/* Recap du panier, FIXE au-dessus de la navbar : la barre de chips du
          bas a ete remplacee par les 3 chips de filtre en tete de liste. */}
      {pendingToBuy.length > 0 && (
        <View
          style={[styles.zoneFooterBar, { bottom: tabBarHeight }]}
          onLayout={(e) => setFilterBarHeight(e.nativeEvent.layout.height)}
        >
          <CartZoneFooterBar
            groups={displayedZoneGroups}
            /* Plusieurs zones = on demande d'abord le groupage des livraisons ;
               une seule = paiement direct de cette zone. */
            onPay={startOrder}
          />
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

      {/* Capsule de confirmation de SUPPRESSION (mode séparé du paiement) */}
      {pendingToBuy.length > 0 && orderToDelete && (
        <Animated.View
          style={[styles.payFooterCapsule, { bottom: tabBarHeight + 10 }]}
        >
          <BlurView
            intensity={80}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          <TouchableOpacity style={styles.closeCircle} onPress={cancelDelete}>
            <Ionicons name="close" size={16} color="white" />
          </TouchableOpacity>
          <View style={styles.deleteMsgWrapper}>
            <Text style={styles.deleteMenuTitle} numberOfLines={1}>
              {(itemToDelete as any)?.menu?.titre ||
                (itemToDelete as any)?.menu?.name ||
                "Article"}{" "}
              -{" "}
              {(itemToDelete as any)?.total ||
                (itemToDelete as any)?.prixTotal ||
                0}{" "}
              FCFA
            </Text>
            <Text style={styles.deleteMsg}>
              Voulez-vous vraiment supprimer ?
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.payerBtnHome,
              { backgroundColor: "#ef4444" },
              isSubmitting && { opacity: 0.7 },
            ]}
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

      {/* Sheet de LIVRAISON GROUPÉE — s'intercale AVANT le paiement quand
          « commander » porte sur plusieurs courses. Il porte SES DEUX ÉTAPES
          en interne (choix du groupage — écran 02 du design — puis composition
          de la livraison commune) : un seul `Modal`, donc pas d'attente entre
          les deux. La livraison validée est appliquée à toutes les commandes du
          lot au moment de construire les `items` du paiement. */}
      <CartGroupedDeliverySheet
        visible={!orderToDelete && groupedDelivery !== null}
        groups={groupedDelivery || []}
        onSplit={() => setGroupedDelivery(null)}
        fastFoodId={
          (groupedDelivery?.[0]?.entries[0]?.order as any)?.fastFoodId ||
          selectedFastFoodId ||
          undefined
        }
        /* Le paiement est le TROISIÈME calque de ce même sheet : on arme juste
           l'état, sans fermer ni ouvrir de Modal (deux Modals qui se croisent
           et la seconde ne s'affiche pas). */
        onValidate={(d) => {
          setGroupedDeliveryValue(toOrderDelivery(d));
          // Lot entier : pas de zone unique à cibler, on paie tout l'affiché.
          setPayingGroupKey(null);
          setPaymentState("input");
        }}
        onClose={endPayment}
        onError={(msg) => setToast({ message: msg, type: "error" })}
        /* Pas de `totalAmount` : le sheet le déduit du lot (articles + la
           course unique), comme `amountToPayEffective` côté envoi. */
        phone={paymentPhone}
        onPhoneChange={setPaymentPhone}
        network={paymentNetwork}
        onNetworkChange={setPaymentNetwork}
        paymentState={paymentState}
        setPaymentState={setPaymentState}
        ussdMessage={ussdMessage}
        onConfirm={confirmCartPayment}
        keyboardHeight={keyboardHeight}
        isKeyboardVisible={isKeyboardVisible}
      />

      {/* Sheet de PAIEMENT global du panier — ouvert par le bouton « commander »
          du recap du bas ET par la pilule « Tout commander » du header.

          ⚠️ NE PAS conditionner à `pendingToBuy.length` : dès que le paiement
          aboutit, les commandes quittent le panier (socket) et le sheet serait
          démonté avant d'avoir affiché succès. `paymentState !== "total"` suffit
          — c'est exactement « un paiement est en cours ».
          Monté en permanence, piloté par `visible` : le démonter directement
          couperait l'animation de sortie. */}
      <CartPaymentSheet
        /* Panier à une seule course : le parcours groupé porte SON PROPRE
           calque de paiement, ce sheet ne doit pas doubler le sien. */
        visible={
          !orderToDelete && paymentState !== "total" && groupedDelivery === null
        }
        /* Recap du sheet : la zone payee si le paiement porte sur un seul
           groupe, sinon tout ce qui est affiche. */
        groups={payingGroup ? [payingGroup] : displayedZoneGroups}
        totalAmount={amountToPay}
        phone={paymentPhone}
        onPhoneChange={setPaymentPhone}
        network={paymentNetwork}
        onNetworkChange={setPaymentNetwork}
        paymentState={paymentState}
        setPaymentState={setPaymentState}
        ussdMessage={ussdMessage}
        onConfirm={confirmCartPayment}
        onClose={endPayment}
        onError={(msg) => setToast({ message: msg, type: "error" })}
        keyboardHeight={keyboardHeight}
        isKeyboardVisible={isKeyboardVisible}
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
          /* Enregistrer : persiste les modifs locales, la commande RESTE dans le
             panier et le sheet reste ouvert (le toast est affiché par le sheet). */
          onSave={(updatedOrder: any) =>
            saveOrder({ ...updatedOrder, id: orderToEdit.id })
          }
          onConfirm={async (updatedOrder) => {
            const result = await buyOrders([
              { ...updatedOrder, status: "pendingToBuy" },
            ]);
            if (result.success) {
              setToast({
                message: "Commande validée avec succès",
                type: "success",
              });
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
  // Recap du panier, pose juste au-dessus de la navbar.
  zoneFooterBar: {
    position: "absolute",
    left: 0,
    right: 0,
    // Fond transparent : le blur est porte par CartZoneFooterBar lui-meme.
    overflow: "hidden",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
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
    // Pas de padding horizontal ni de gap : les CartOrderCard portent leur
    // propre marge interne et se touchent, comme dans le suivi des commandes.
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
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    alignSelf: "center",
    zIndex: 1000,
    left: "2%",
  },
  closeCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
  },
  payerBtnHome: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ec4913",
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    minWidth: 40,
  },
  deleteMsgWrapper: {
    flex: 1,
    paddingLeft: 12,
    justifyContent: "center",
  },
  deleteMenuTitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 2,
  },
  deleteMsg: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
});
