import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  Text,
  Animated,
  Dimensions,
  Easing,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Toast } from "../../../components/Toast";
import { Ionicons } from "@expo/vector-icons";
import { Menu } from "@/src/types";
import { useCheckout } from "../hooks/useCheckout";
import { styles } from "./CartCheckoutSheet.styles";
import axios from "axios";
import { Config } from "@/src/api/config";
import { useFastFoods } from "@/src/features/restaurants/hooks/useFastFoods";
import {
  getCachedFastFood,
  prefetchFastFoodDelivery,
} from "@/src/features/payment/hooks/useGroupedDeliveryData";

// Shared Components
import { TabChip } from "./shared/TabChip";

// Tabs
import { DetailTab } from "./tabs/DetailTab";
import { ExtrasTab } from "./tabs/ExtrasTab";
import { DrinksTab } from "./tabs/DrinksTab";
import { DeliveryTab } from "./tabs/DeliveryTab";

// Footer
import { CartCheckoutFooter } from "./CartCheckoutFooter";

// Overlay
import { CheckoutLocationOverlay } from "./CheckoutLocationOverlay";
import { CheckoutContactOverlay } from "./CheckoutContactOverlay";
import { CheckoutPeriodOverlay } from "./CheckoutPeriodOverlay";
import { CheckoutExpressOverlay } from "./CheckoutExpressOverlay";
import { CheckoutVoiceNoteOverlay } from "./CheckoutVoiceNoteOverlay";
import { CheckoutPaymentOverlay } from "./CheckoutPaymentOverlay";
import { CheckoutPaymentTopOverlay } from "./CheckoutPaymentTopOverlay";
import { extractPeriodDate } from "../utils/periodDate";

interface CheckoutSheetProps {
  visible: boolean;
  onClose: () => void;
  menu: Menu | null;
  initialOrder?: any | null;
  onConfirm: (order: any) => void;
  /**
   * Enregistre les modifications locales sans quitter le sheet ni changer le
   * statut (la commande reste dans le panier). Sans cette prop, le bouton
   * Enregistrer n'est pas affiché.
   */
  onSave?: (order: any) => Promise<{ success: boolean; message?: string }>;
  onChange?: (order: any) => void;
  isCartMode?: boolean;
}

type CheckoutStep = "detail" | "extra" | "drink" | "delivery";

export const CartCheckoutSheet: React.FC<CheckoutSheetProps> = ({
  visible,
  onClose,
  menu,
  initialOrder,
  onConfirm,
  onSave,
  isCartMode,
  onChange,
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

  // Animation d'ouverture/fermeture : voile noir en fade, sheet en slide-up net
  // (contenu jamais estompé) — identique au CheckoutSheet du home.
  const insets = useSafeAreaInsets();
  const SHEET_HEIGHT = 384;
  // Distance de sortie : un ECRAN, pas SHEET_HEIGHT. La hauteur reelle du sheet
  // depasse la constante (safe area + contenu qui deborde), donc translater de
  // SHEET_HEIGHT laissait le bas du sheet a l'ecran, fige, jusqu'au demontage —
  // d'ou l'impression de calage juste avant la fin de la fermeture.
  const EXIT_DISTANCE = Dimensions.get("window").height;
  const sheetTranslate = useRef(new Animated.Value(EXIT_DISTANCE)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [modalMounted, setModalMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setModalMounted(true);
      Animated.parallel([
        // `timing` borne et non `spring` : le depart se fait desormais d'un
        // ecran entier, un ressort mettrait visiblement plus longtemps a monter.
        Animated.timing(sheetTranslate, {
          toValue: 0,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
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
          toValue: EXIT_DISTANCE,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 320,
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
    handlePaymentVerdict,
    registerPaymentHandler,
    unregisterPaymentHandler,
    availablePackaging,
    availableDrinks,
    menuPrice,
    extrasPrice,
    drinksPrice,
    deliveryPrice,
    isDeliveryFree,
    displayDeliveryPrice,
    displayTotal,
    createOrder,
    validateDelivery,
    validateStock,
  } = useCheckout(menuWithDeliveryHours, initialOrder, onChange);
  const [sheetToast, setSheetToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const showError = (message: string) =>
    setSheetToast({ message, type: "error" });
  // Enregistrement des modifs locales : loader propre, distinct du paiement.
  const [isSaving, setIsSaving] = useState(false);
  const { fastFoods } = useFastFoods();

  // Enregistrer le handler de verdict paiement quand l'overlay est visible.
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
      const timer = setTimeout(() => {
        setIsPaymentPopupVisible(false);
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [paymentState, onClose]);

  // En cas d'erreur paiement : NE PAS fermer les overlays. On reste sur l'état
  // `input` (le toast d'erreur s'affiche, l'utilisateur peut ressaisir).
  // Seul `success_created` déclenche la fermeture (effet ci-dessus).

  // Enrichir le menu (édition d'une commande du panier). `deliveryOffer`
  // provient EXCLUSIVEMENT du contexte FastFood (chargé via `GET /fastfood/all`
  // — le seul endpoint qui le porte), retrouvé par `fastFoodId`. Les
  // `deliveryHours`/`orderLeadTime` sont récupérés via `GET /fastfood/:id`
  // (le menu d'une commande stockée peut ne pas les porter à jour).
  useEffect(() => {
    if (!menu || !(menu as any).fastFoodId) {
      setMenuWithDeliveryHours(menu);
      return;
    }

    const ffId = (menu as any).fastFoodId;
    const ctxFastFood = fastFoods.find((f) => f.id === ffId) as any;
    const deliveryOffer = ctxFastFood?.deliveryOffer ?? null;

    // Fusionne les donnees boutique dans le menu. Le cache partage evite le
    // second rendu ou la card « Zone » apparait apres coup.
    const merge = (data: any) =>
      setMenuWithDeliveryHours(
        data?.deliveryHours || data?.orderLeadTime
          ? ({
              ...menu,
              deliveryHours: data.deliveryHours,
              orderLeadTime: data.orderLeadTime,
              advanceDays: data.advanceDays,
              deliveryOffer,
            } as any)
          : ({ ...menu, deliveryOffer } as any),
      );

    const cached = getCachedFastFood(ffId);
    if (cached !== undefined) {
      merge(cached);
      return;
    }
    prefetchFastFoodDelivery(ffId).then(merge);
  }, [menu, fastFoods]);

  if (!menu) return null;

  const rawHours = (menuWithDeliveryHours as any)?.deliveryHours || [];
  const orderLeadTime = (menuWithDeliveryHours as any)?.orderLeadTime || 0;
  const advanceDays = (menuWithDeliveryHours as any)?.advanceDays;
  const deliveryOffer = (menuWithDeliveryHours as any)?.deliveryOffer || null;

  const handleConfirm = () => {
    const order = createOrder();
    if (order) onConfirm(order);
  };

  return (
    <>
      <Modal visible={modalMounted} transparent animationType="none">
        <View style={styles.overlay}>
          {/* Voile noir animé en fade (séparé du contenu) */}
          <Animated.View
            style={[styles.backdrop, { opacity: backdropOpacity }]}
            pointerEvents="none"
          />
          <View style={styles.dismiss} />

          <Animated.View
            style={[
              styles.sheetContainer,
              styles.sheetLight,
              // Hauteur augmentée de l'inset bas : sur Android la barre de
              // navigation système recouvrait le footer du sheet.
              { height: SHEET_HEIGHT + insets.bottom },
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
                    isDeliveryFree={isDeliveryFree}
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
                    deliveryOffer={deliveryOffer}
                  />
                )}
              </ScrollView>
            </View>

            <CartCheckoutFooter
              total={displayTotal}
              quantity={quantity}
              setQuantity={setQuantity}
              isLoading={isSubmitting}
              isSaving={isSaving}
              isCartMode={isCartMode}
              /* Enregistrer : persiste la commande modifiée en `pendingToBuy`
                 (elle reste dans le panier). Le sheet NE se ferme PAS — on
                 confirme par un toast pour que l'user puisse continuer à
                 éditer. */
              onAddToCart={onSave && (async () => {
                const deliveryErr = validateDelivery();
                if (deliveryErr) {
                  showError(deliveryErr);
                  return;
                }
                try {
                  setIsSaving(true);
                  const result: any = await onSave(
                    createOrder("pendingToBuy"),
                  );
                  if (result === true || result?.success) {
                    setSheetToast({
                      message: "Modifications enregistrées",
                      type: "success",
                    });
                  } else if (result?.message) {
                    showError(result.message);
                  }
                } finally {
                  setIsSaving(false);
                }
              })}
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
              selectedPeriod={delivery.hour || ""}
              onSelectPeriod={(period, prix, bonusCode) =>
                setDelivery({
                  ...delivery,
                  hour: period,
                  date: extractPeriodDate(period) ?? delivery.date,
                  prix: prix !== undefined ? prix : delivery.prix,
                  bonusCode: bonusCode ?? null,
                })
              }
              availableHours={rawHours}
              orderLeadTime={orderLeadTime}
              advanceDays={advanceDays}
              deliveryOffer={deliveryOffer}
              fastFoodId={(menu as any)?.fastFoodId}
              onError={showError}
            />
          )}

          {isExpressPopupVisible && (
            <CheckoutExpressOverlay
              onClose={() => setIsExpressPopupVisible(false)}
              selectedLieu={delivery.expressLieu || ""}
              onSelectExpress={(lieu, prix, bonusCode) =>
                setDelivery({
                  ...delivery,
                  expressLieu: lieu,
                  expressPrix: prix !== undefined ? prix : delivery.expressPrix,
                  bonusCode: bonusCode ?? null,
                })
              }
              availableHours={rawHours}
              deliveryOffer={deliveryOffer}
              fastFoodId={(menu as any)?.fastFoodId}
              onError={showError}
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
            deliveryPrice={displayDeliveryPrice}
            isDeliveryFree={isDeliveryFree}
            total={displayTotal}
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
