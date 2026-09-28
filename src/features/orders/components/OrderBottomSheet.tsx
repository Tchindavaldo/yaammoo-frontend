import { Commande, FastFood } from "@/src/types";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
// Safe-area basse : source unique (R19), cf. blur-safe-area.md §4.
import { useSheetSafeInsets as useSafeAreaInsets } from "@/src/hooks/usePageBottomInset";
import { SafeAreaDebugBand } from "@/src/components/SafeAreaDebugBand";
import { MontantTab } from "../../merchant/components/MerchantOrderMontantTab";
import { buildOrderItems } from "../utils/buildOrderItems";
import { DriverInfoTab } from "./DriverInfoTab";
import { OrderCommandesTab } from "./OrderCommandesTab";
import { OrderLivraisonTab } from "./OrderLivraisonTab";
import { OrderSheetHeader } from "./OrderSheetHeader";
import { OrderSheetTab, OrderSheetTabBar } from "./OrderSheetTabBar";
import { OrderTrackingTab } from "./OrderTrackingTab";
import { RateMenuTab } from "./RateMenuTab";

// `OrderItem` reste importable d'ici (type historique du sheet).
export type { OrderItem } from "../utils/buildOrderItems";

/**
 * Détail d'une commande côté CLIENT. Assemble l'en-tête (`OrderSheetHeader`),
 * la barre d'onglets (`OrderSheetTabBar`) et un onglet parmi Livraison,
 * Commandes, Montant, Suivi, Livreur, Noter. Voir orders-client.md.
 */

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const SHEET_HEIGHT = 450;

type Props = {
  order: Commande | null;
  isVisible: boolean;
  onClose: () => void;
  boutique?: FastFood | null;
  allOrders?: Commande[];
};

export const OrderBottomSheet: React.FC<Props> = ({
  order,
  isVisible,
  onClose,
  boutique,
  allOrders,
}) => {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<OrderSheetTab>("livraison");
  const [selectedOrderIdx, setSelectedOrderIdx] = useState(0);
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  // Déterminer la commande à afficher (de façon synchrone)
  const selectedOrder = allOrders
    ? allOrders[selectedOrderIdx] || order
    : order;

  // Tab « Suivi » : carte du livreur, pendant la course seulement.
  const showTrackingTab = selectedOrder?.status === "delivering";
  // Tab « Livreur » : visible dès que la course est lancée/terminée
  // (delivering / delivered), qu'un livreur soit délégué OU que le marchand livre.
  const showDriverTab =
    selectedOrder?.status === "delivering" ||
    selectedOrder?.status === "delivered";

  // Tab « Noter » (plat) : commande livrée uniquement.
  const menuId = (selectedOrder?.menu as any)?.id || (selectedOrder as any)?.menuId;
  const showRateTab = selectedOrder?.status === "delivered" && !!menuId;
  // Onglet Montant : récap du groupe, seulement si la ligne porte ≥ 2 commandes.
  const showMontantTab = !!allOrders && allOrders.length > 1;

  const tabs = useMemo(
    () =>
      [
        { key: "livraison" as const, label: "Livraison", show: true },
        { key: "commandes" as const, label: "Commandes", show: true },
        { key: "montant" as const, label: "Montant", show: showMontantTab },
        { key: "suivi" as const, label: "Suivi", show: showTrackingTab },
        { key: "livreur" as const, label: "Livreur", show: showDriverTab },
        { key: "noter" as const, label: "Noter", show: showRateTab },
      ].filter((t) => t.show),
    [showMontantTab, showTrackingTab, showDriverTab, showRateTab],
  );

  // Livraison offerte (bonus/campagne couvert par le fastfood) ou mutualisée sur
  // un groupe de livraison : dans les deux cas, pas de prix sur cette commande.
  const offer = (selectedOrder as any)?.deliveryOffer;
  const deliveryOffered =
    offer?.active === true && offer?.coveredBy === "fastfood";
  // « Cmd groupée » n'a de sens qu'à partir de 2 commandes portant le MÊME
  // deliveryGroupId : seule une commande avec ce groupe ne mutualise rien.
  const currentGroupId = (selectedOrder as any)?.deliveryGroupId;
  const deliveryGrouped =
    !!currentGroupId &&
    (allOrders || []).filter(
      (o: any) => o.deliveryGroupId === currentGroupId,
    ).length > 1;

  const items = useMemo(() => buildOrderItems(selectedOrder), [selectedOrder]);

  useEffect(() => {
    if (isVisible && order) {
      // Animation Open — départ hors écran, pour la même raison qu'à la
      // fermeture : le contenu peut dépasser la hauteur du sheet.
      translateY.setValue(SCREEN_HEIGHT);
      overlayOpacity.setValue(0);
      setTab("livraison");
      setSelectedOrderIdx(0);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 25,
          stiffness: 180,
          mass: 0.8,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible, order]);

  // Onglet devenu invisible (autre commande, statut changé) : retour à Livraison.
  useEffect(() => {
    if (!tabs.some((t) => t.key === tab)) setTab("livraison");
  }, [tab, tabs]);

  const handleDismiss = () => {
    // `timing` et NON `spring` : un ressort traîne en fin de course, le sheet
    // paraît immobile alors que l'animation tourne encore et que `onClose()`
    // (donc le démontage) n'est pas appelé. Une durée bornée supprime ce temps
    // mort.
    Animated.parallel([
      Animated.timing(translateY, {
        // SCREEN_HEIGHT et non SHEET_HEIGHT : le contenu peut DÉBORDER au-dessus
        // du sheet (hauteur fixe, plusieurs zones / onglet Montant). Descendre
        // de SHEET_HEIGHT seul laissait cette portion excédentaire à l'écran,
        // figée, jusqu'au démontage. Translater d'un écran sort tout, quelle que
        // soit la hauteur réelle du contenu.
        toValue: SCREEN_HEIGHT,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onClose();
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 5,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 100) {
          handleDismiss();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  if (!order) return null;

  const renderTab = () => {
    if (tab === "noter" && showRateTab) {
      return (
        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: 0 }}
          showsVerticalScrollIndicator={false}
        >
          <RateMenuTab
            menuId={menuId}
            orderId={selectedOrder!.id}
            menuName={
              selectedOrder?.menu?.titre ||
              selectedOrder?.menu?.name ||
              "ce plat"
            }
            menuImage={
              selectedOrder?.menu?.image ||
              selectedOrder?.menu?.images?.[0] ||
              undefined
            }
          />
        </ScrollView>
      );
    }
    if (tab === "livreur" && showDriverTab) {
      return (
        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 0 }}
          showsVerticalScrollIndicator={false}
        >
          <DriverInfoTab order={selectedOrder!} allowRating />
        </ScrollView>
      );
    }
    if (tab === "suivi" && showTrackingTab) {
      // `key` : changer de commande repart d'un suivi vierge.
      return <OrderTrackingTab key={selectedOrder!.id} order={selectedOrder!} />;
    }
    if (tab === "montant" && showMontantTab) {
      return <MontantTab orders={allOrders!} />;
    }
    if (tab === "livraison") {
      return (
        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: 0 }}
          showsVerticalScrollIndicator={false}
        >
          <OrderLivraisonTab order={selectedOrder!} />
        </ScrollView>
      );
    }
    return (
      <OrderCommandesTab
        items={items}
        total={selectedOrder?.total || 0}
        zone={(selectedOrder?.delivery as any)?.zone || ""}
        deliveryPrice={Number((selectedOrder?.delivery as any)?.prix) || 0}
        deliveryOffered={deliveryOffered}
        deliveryGrouped={deliveryGrouped}
      />
    );
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={handleDismiss}
    >
      <View style={StyleSheet.absoluteFill} pointerEvents="auto">
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            // La barre de navigation système recouvrait le bas du sheet.
            { height: SHEET_HEIGHT + insets.bottom, paddingBottom: insets.bottom },
            { transform: [{ translateY }] },
          ]}
        >
          <OrderSheetHeader
            boutique={boutique}
            allOrders={allOrders}
            selectedOrder={selectedOrder}
            selectedOrderIdx={selectedOrderIdx}
            onSelectOrder={setSelectedOrderIdx}
            panHandlers={panResponder.panHandlers}
          />

          <OrderSheetTabBar tabs={tabs} active={tab} onChange={setTab} />

          {renderTab()}

          <SafeAreaDebugBand />
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: "#fff",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.12,
    shadowRadius: 15,
    elevation: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 0,
  },
});
