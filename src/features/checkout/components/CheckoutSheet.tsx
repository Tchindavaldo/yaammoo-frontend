import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from "react-native";
import { Toast } from "../../../components/Toast";
import { Ionicons } from "@expo/vector-icons";
import { Menu } from "@/src/types";
import { useCheckout } from "../hooks/useCheckout";
import { styles } from "./CheckoutSheet.styles";
import axios from "axios";
import { Config } from "@/src/api/config";
import { useFastFoods } from "@/src/features/restaurants/hooks/useFastFoods";

// Shared Components
import { TabChip } from "./shared/TabChip";

// Tabs
import { DetailTab } from "./tabs/DetailTab";
import { ExtrasTab } from "./tabs/ExtrasTab";
import { DrinksTab } from "./tabs/DrinksTab";
import { DeliveryTab } from "./tabs/DeliveryTab";

// Footer
import { CheckoutFooter } from "./CheckoutFooter";

// Overlay
import { CheckoutLocationOverlay } from "./CheckoutLocationOverlay";
import { CheckoutContactOverlay } from "./CheckoutContactOverlay";
import { CheckoutPeriodOverlay } from "./CheckoutPeriodOverlay";
import { CheckoutExpressOverlay } from "./CheckoutExpressOverlay";
import { CheckoutVoiceNoteOverlay } from "./CheckoutVoiceNoteOverlay";
import { CheckoutPaymentOverlay } from "./CheckoutPaymentOverlay";
import { CheckoutPaymentTopOverlay } from "./CheckoutPaymentTopOverlay";

interface CheckoutSheetProps {
  visible: boolean;
  onClose: () => void;
  menu: Menu | null;
  onConfirm: (order: any) => void;
}

type CheckoutStep = "detail" | "extra" | "drink" | "delivery";

export const CheckoutSheet: React.FC<CheckoutSheetProps> = ({
  visible,
  onClose,
  menu,
  onConfirm,
}) => {
  const [activeTab, setActiveTab] = useState<CheckoutStep>("detail");
  const [isLocationPopupVisible, setIsLocationPopupVisible] = useState(false);
  const [isContactPopupVisible, setIsContactPopupVisible] = useState(false);
  const [isPeriodPopupVisible, setIsPeriodPopupVisible] = useState(false);
  const [isExpressPopupVisible, setIsExpressPopupVisible] = useState(false);
  const [isVoiceNotePopupVisible, setIsVoiceNotePopupVisible] = useState(false);
  const [isPaymentPopupVisible, setIsPaymentPopupVisible] = useState(false);
  const [paymentKey, setPaymentKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [menuWithDeliveryHours, setMenuWithDeliveryHours] =
    useState<Menu | null>(menu);

  // Animation d'ouverture/fermeture : seul le VOILE noir fait un fade, le sheet
  // (et son contenu) fait un slide-up net — jamais d'opacité sur le contenu.
  const SHEET_HEIGHT = 384;
  const sheetTranslate = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  // Garde le Modal monté le temps de l'animation de sortie.
  const [modalMounted, setModalMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setModalMounted(true);
      Animated.parallel([
        Animated.spring(sheetTranslate, {
          toValue: 0,
          useNativeDriver: true,
          tension: 70,
          friction: 12,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(sheetTranslate, {
          toValue: SHEET_HEIGHT,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setModalMounted(false);
      });
    }
  }, [visible, sheetTranslate, backdropOpacity]);

  const {
    quantity,
    setQuantity,
    selectedPriceIndex,
    setSelectedPriceIndex,
    selectedPackaging,
    setSelectedPackaging,
    selectedDrinks,
    setSelectedDrinks,
    drinkQuantities,
    setDrinkQuantity,
    delivery,
    setDelivery,
    paymentPhone,
    setPaymentPhone,
    paymentNetwork,
    setPaymentNetwork,
    paymentState,
    setPaymentState,
    paymentError,
    setPaymentError,
    ussdCode,
    ussdMessage,
    handlePaymentConfirm,
    handleReviewOrder,
    handlePaymentVerdict,
    registerPaymentHandler,
    unregisterPaymentHandler,
    availablePackaging,
    availableDrinks,
    total,
    menuPrice,
    extrasPrice,
    drinksPrice,
    deliveryPrice,
    createOrder,
    resetCheckout,
    validateDelivery,
    validateStock,
  } = useCheckout(menuWithDeliveryHours);
  const [sheetToast, setSheetToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const { appleReviewMode } = useFastFoods();
  // Mode review : commande directe via le bouton « order » (loader dans le btn).
  const [reviewOrdering, setReviewOrdering] = useState(false);

  // En review, écouter le verdict socket pendant l'envoi de la commande (sans
  // ouvrir l'overlay de paiement). Sur success_created, l'effet de fermeture
  // ci-dessous ferme le sheet.
  useEffect(() => {
    if (reviewOrdering) {
      registerPaymentHandler(handlePaymentVerdict);
      return () => unregisterPaymentHandler();
    }
  }, [
    reviewOrdering,
    handlePaymentVerdict,
    registerPaymentHandler,
    unregisterPaymentHandler,
  ]);

  const showError = (message: string) =>
    setSheetToast({ message, type: "error" });

  // Enregistrer le handler de verdict paiement quand l'overlay est visible
  useEffect(() => {
    if (isPaymentPopupVisible) {
      registerPaymentHandler(handlePaymentVerdict);
      return () => {
        unregisterPaymentHandler();
      };
    }
  }, [
    isPaymentPopupVisible,
    handlePaymentVerdict,
    registerPaymentHandler,
    unregisterPaymentHandler,
  ]);

  // Fermer l'overlay automatiquement après 5s en état success_created
  useEffect(() => {
    if (paymentState === "success_created") {
      // En review : fermeture quasi-immédiate (~500ms). Sinon flux normal (5s).
      const timer = setTimeout(
        () => {
          setIsPaymentPopupVisible(false);
          setReviewOrdering(false);
          onClose();
        },
        appleReviewMode ? 300 : 5000,
      );
      return () => clearTimeout(timer);
    }
  }, [paymentState, onClose, appleReviewMode]);

  // Mode review : si la transaction échoue (retour à 'input'), couper le loader
  // du bouton order (le toast d'erreur s'affiche déjà via paymentError).
  useEffect(() => {
    if (reviewOrdering && paymentState === "input") {
      setReviewOrdering(false);
    }
  }, [reviewOrdering, paymentState]);

  // En cas d'erreur paiement : NE PAS fermer les overlays. On reste sur l'état
  // `input` (le toast d'erreur s'affiche, l'utilisateur peut ressaisir).
  // Seul `success_created` déclenche la fermeture (effet ci-dessus).

  // Réinitialiser l'état quand la bottomsheet s'ouvre
  useEffect(() => {
    if (visible) {
      setActiveTab("detail");
      setIsLocationPopupVisible(false);
      setIsContactPopupVisible(false);
      setIsPeriodPopupVisible(false);
      setIsExpressPopupVisible(false);
      setIsVoiceNotePopupVisible(false);
      setIsPaymentPopupVisible(false);
    } else {
      // Reset à la fermeture pour éviter le flash d'anciennes valeurs au prochain menu
      resetCheckout();
    }
  }, [visible]);

  // Enrichir le menu avec les deliveryHours de la boutique
  useEffect(() => {
    if (!menu || !(menu as any).fastFoodId) {
      setMenuWithDeliveryHours(menu);
      return;
    }

    const fetchDeliveryHours = async () => {
      try {
        const response = await axios.get(
          `${Config.apiUrl}/fastfood/${(menu as any).fastFoodId}`,
          {
            headers: { "ngrok-skip-browser-warning": "true" },
          },
        );
        if (
          response.data?.data?.deliveryHours ||
          response.data?.data?.orderLeadTime
        ) {
          setMenuWithDeliveryHours({
            ...menu,
            deliveryHours: response.data.data.deliveryHours,
            orderLeadTime: response.data.data.orderLeadTime,
            advanceDays: response.data.data.advanceDays,
          } as any);
        } else {
          setMenuWithDeliveryHours(menu);
        }
      } catch {
        setMenuWithDeliveryHours(menu);
      }
    };

    fetchDeliveryHours();
  }, [menu]);

  if (!menu) return null;

  const rawHours = (menuWithDeliveryHours as any)?.deliveryHours || [];
  const orderLeadTime = (menuWithDeliveryHours as any)?.orderLeadTime || 0;
  const advanceDays = (menuWithDeliveryHours as any)?.advanceDays;

  const handleConfirm = () => {
    const order = createOrder();
    if (order) onConfirm(order);
  };

  return (
    <>
      <Modal visible={modalMounted} transparent animationType="none">
        <View style={styles.overlay}>
          {/* Voile noir animé en fade (séparé du contenu pour ne pas l'estomper) */}
          <Animated.View
            style={[styles.backdrop, { opacity: backdropOpacity }]}
            pointerEvents="none"
          />
          <View style={styles.dismiss} />

          <Animated.View
            style={[
              styles.sheetContainer,
              styles.sheetLight,
              { transform: [{ translateY: sheetTranslate }] },
            ]}
          >
            <View style={{ flex: 1 }}>
              <View style={styles.tabsWrapper}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.tabsContent}
                >
                  <TabChip
                    isActive={activeTab === "detail"}
                    label="Details"
                    icon="information-circle-outline"
                    onPress={() => setActiveTab("detail")}
                  />
                  <TabChip
                    isActive={activeTab === "drink"}
                    label="Drinks"
                    icon="wine-outline"
                    onPress={() => setActiveTab("drink")}
                  />
                  <TabChip
                    isActive={activeTab === "extra"}
                    label="Extras"
                    icon="add-circle-outline"
                    onPress={() => setActiveTab("extra")}
                  />
                  <TabChip
                    isActive={activeTab === "delivery"}
                    label="Delivery"
                    icon="bicycle-outline"
                    onPress={() => setActiveTab("delivery")}
                  />
                </ScrollView>

                <TouchableOpacity style={styles.closeCircle} onPress={onClose}>
                  <Ionicons name="close" size={20} color="white" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.contentScroll}
                showsVerticalScrollIndicator={false}
              >
                {activeTab === "detail" && (
                  <DetailTab
                    menu={menu}
                    selectedPriceIndex={selectedPriceIndex}
                    setSelectedPriceIndex={setSelectedPriceIndex}
                    menuPrice={menuPrice}
                    extrasPrice={extrasPrice}
                    drinksPrice={drinksPrice}
                    deliveryPrice={deliveryPrice}
                  />
                )}

                {activeTab === "extra" && (
                  <ExtrasTab
                    availablePackaging={availablePackaging}
                    selectedPackaging={selectedPackaging}
                    setSelectedPackaging={setSelectedPackaging}
                  />
                )}

                {activeTab === "drink" && (
                  <DrinksTab
                    availableDrinks={availableDrinks}
                    selectedDrinks={selectedDrinks}
                    setSelectedDrinks={setSelectedDrinks}
                    drinkQuantities={drinkQuantities}
                    setDrinkQuantity={setDrinkQuantity}
                  />
                )}

                {activeTab === "delivery" && (
                  <DeliveryTab
                    delivery={delivery}
                    setDelivery={setDelivery}
                    onOpenLocation={() => setIsLocationPopupVisible(true)}
                    onOpenContact={() => setIsContactPopupVisible(true)}
                    onOpenPeriod={() => setIsPeriodPopupVisible(true)}
                    onOpenExpress={() => setIsExpressPopupVisible(true)}
                    onOpenVoiceNote={() => setIsVoiceNotePopupVisible(true)}
                    availableHours={rawHours}
                  />
                )}
              </ScrollView>
            </View>

            <CheckoutFooter
              total={total}
              quantity={quantity}
              setQuantity={setQuantity}
              isLoading={isSubmitting}
              onAddToCart={async () => {
                const deliveryErr = validateDelivery();
                if (deliveryErr) {
                  showError(deliveryErr);
                  return;
                }
                try {
                  setIsSubmitting(true);
                  const result = await (onConfirm(
                    createOrder("pendingToBuy"),
                  ) as any);
                  if (result === true || result?.success) {
                    onClose();
                  } else if (result?.message) {
                    showError(result.message);
                  }
                } finally {
                  setIsSubmitting(false);
                }
              }}
              reviewMode={appleReviewMode}
              isOrdering={reviewOrdering}
              onBuy={() => {
                const stockErr = validateStock();
                if (stockErr) {
                  showError(stockErr);
                  return;
                }
                const deliveryErr = validateDelivery();
                if (deliveryErr) {
                  showError(deliveryErr);
                  return;
                }
                if (appleReviewMode) {
                  // Commande directe : pas d'overlay, loader dans le bouton order.
                  setReviewOrdering(true);
                  handleReviewOrder();
                  return;
                }
                setPaymentState("network_select");
                setIsPaymentPopupVisible(true);
                setPaymentKey((prev) => prev + 1);
              }}
            />
          </Animated.View>

          {isLocationPopupVisible && (
            <CheckoutLocationOverlay
              onClose={() => setIsLocationPopupVisible(false)}
              address={delivery.address || ""}
              note={delivery.note || ""}
              onSave={(addr, note) =>
                setDelivery({ ...delivery, address: addr, note: note })
              }
            />
          )}

          {isContactPopupVisible && (
            <CheckoutContactOverlay
              onClose={() => setIsContactPopupVisible(false)}
              phone={delivery.phone || ""}
              onSelectPhone={(ph) => setDelivery({ ...delivery, phone: ph })}
            />
          )}

          {isPeriodPopupVisible && (
            <CheckoutPeriodOverlay
              onClose={() => setIsPeriodPopupVisible(false)}
              selectedPeriod={delivery.hour || "Now"}
              onSelectPeriod={(period, prix) =>
                setDelivery({
                  ...delivery,
                  hour: period,
                  prix: prix !== undefined ? prix : delivery.prix,
                })
              }
              availableHours={rawHours}
              orderLeadTime={orderLeadTime}
              advanceDays={advanceDays}
            />
          )}

          {isExpressPopupVisible && (
            <CheckoutExpressOverlay
              onClose={() => setIsExpressPopupVisible(false)}
              selectedLieu={delivery.expressLieu || ""}
              onSelectExpress={(lieu, prix) =>
                setDelivery({
                  ...delivery,
                  expressLieu: lieu,
                  expressPrix: prix !== undefined ? prix : delivery.expressPrix,
                })
              }
              availableHours={rawHours}
            />
          )}

          {isVoiceNotePopupVisible && (
            <CheckoutVoiceNoteOverlay
              onClose={() => setIsVoiceNotePopupVisible(false)}
              onSave={(uri) => setDelivery({ ...delivery, voiceNoteUri: uri })}
            />
          )}

          <CheckoutPaymentTopOverlay
            visible={isPaymentPopupVisible}
            menu={menu}
            menuPrice={menuPrice}
            extrasPrice={extrasPrice}
            drinksPrice={drinksPrice}
            deliveryPrice={deliveryPrice}
            total={total}
            paymentState={paymentState}
            network={paymentNetwork}
            onNetworkChange={setPaymentNetwork}
            ussdMessage={ussdMessage || undefined}
          />

          <CheckoutPaymentOverlay
            key={paymentKey}
            visible={isPaymentPopupVisible}
            onRequestClose={() => setIsPaymentPopupVisible(false)}
            onClose={() => setIsPaymentPopupVisible(false)}
            phone={paymentPhone}
            onPhoneChange={setPaymentPhone}
            paymentState={paymentState}
            ussdMessage={ussdMessage || undefined}
            onError={setPaymentError}
            onConfirm={handlePaymentConfirm}
          />

          {sheetToast && (
            <Toast
              message={sheetToast.message}
              type={sheetToast.type}
              onHide={() => setSheetToast(null)}
            />
          )}

          {/* Toast d'erreur paiement : DANS le Modal pour s'afficher au 1er plan
            (au-dessus du voile noir), pas masqué dessous. */}
          {paymentError && (
            <Toast
              message={paymentError}
              type="error"
              duration={7000}
              onHide={() => setPaymentError(null)}
            />
          )}
        </View>
      </Modal>
    </>
  );
};
