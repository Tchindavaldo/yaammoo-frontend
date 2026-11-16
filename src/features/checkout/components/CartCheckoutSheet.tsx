"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import { GlobalToastHost } from "@/src/components/GlobalToastHost";
import { showToast } from "@/src/services/globalToast";
import { lockPayment, unlockPayment } from "@/src/services/paymentLock";
import React, { useState, useEffect, useRef } from "react";
import { menuPriceDescription } from "../utils/menuPrices";
import {
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  StyleSheet,
  Pressable,
  Text,
  Animated,
  Dimensions,
  Easing,
} from "react-native";
import { useSheetInsets } from "../hooks/useSheetInsets";
import { Toast } from "../../../components/Toast";
import { Ionicons } from "@expo/vector-icons";
import { Menu } from "@/src/types";
import { useCheckout } from "../hooks/useCheckout";
import { styles } from "./CartCheckoutSheet.styles";
import { BlurScope, BlurTarget } from "@/src/components/BlurTarget";
import { SHEET_BLUR_TARGET } from "./sheetBlurTarget";
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
import { CartDetailTab } from "./tabs/CartDetailTab";
import { ExtrasTab } from "./tabs/ExtrasTab";
import { DrinksTab } from "./tabs/DrinksTab";
import { DeliveryTab } from "./tabs/DeliveryTab";

// Footer
import { CartCheckoutFooter } from "./CartCheckoutFooter";

// Overlay
import { CheckoutLocationOverlay } from "./CheckoutLocationOverlay";
import { CheckoutContactOverlay } from "./CheckoutContactOverlay";
import { PickupDateSheet } from "./PickupDateSheet";
import { CheckoutPeriodOverlay } from "./CheckoutPeriodOverlay";
import { CheckoutExpressOverlay } from "./CheckoutExpressOverlay";
import { CheckoutVoiceNoteOverlay } from "./CheckoutVoiceNoteOverlay";
import { CheckoutPaymentOverlay } from "./CheckoutPaymentOverlay";
import { CheckoutPaymentTopOverlay } from "./CheckoutPaymentTopOverlay";
import { extractPeriodDate } from "../utils/periodDate";
import { t, useLanguage } from "@/src/i18n";

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
  /** Rouvre ce sheet (paiement en cours, cf. `paymentLock`). */
  onReopen?: () => void;
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
  onReopen,
}) => {
  useLanguage();
  const [activeTab, setActiveTab] = useState<CheckoutStep>("detail");
  const [isLocationPopupVisible, setIsLocationPopupVisible] = useState(false);
  const [isContactPopupVisible, setIsContactPopupVisible] = useState(false);
  // Commande SANS livraison (retrait) : le numero est exige par le backend. Sans
  // numero, on ouvre l'overlay contact puis on reprend l'action demandee.
  const pendingAction = useRef<null | "cart" | "buy">(null);
  // Numero saisi pour une commande sur place, en attente du jour du retrait.
  const [pickupPhone, setPickupPhone] = useState<string | null>(null);
  const [pickupChosen, setPickupChosen] = useState(false);
  const [resumeAction, setResumeAction] = useState<null | "cart" | "buy">(null);
  const actionsRef = useRef<{ cart?: () => void; buy?: () => void }>({});
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
  const insets = useSheetInsets();
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

  // Paiement en attente de verdict : le sheet peut être fermé (toucher hors
  // zone), le paiement continue et toute ouverture rouvre CE sheet.
  const paymentInFlight =
    paymentState === "waiting" || paymentState === "ussd_sent";
  const onReopenRef = useRef(onReopen);
  onReopenRef.current = onReopen;
  const reopenRef = useRef<() => void>(() => onReopenRef.current?.());
  useEffect(() => {
    const reopen = reopenRef.current;
    if (paymentInFlight) lockPayment(reopen);
    else unlockPayment(reopen);
  }, [paymentInFlight]);
  useEffect(() => () => unlockPayment(reopenRef.current), []);

  // Verdict reçu sheet FERMÉ : toast global, verrou levé, paiement refermé.
  // Erreur déjà affichée par le toast du sheet ouvert : pas de 2e toast à la fermeture.
  const shownErrorRef = useRef<string | null>(null);
  useEffect(() => {
    if (visible && paymentError) shownErrorRef.current = paymentError;
  }, [visible, paymentError]);
  useEffect(() => {
    if (visible) return;
    if (paymentError) {
      if (shownErrorRef.current !== paymentError) showToast(paymentError, "error");
      shownErrorRef.current = null;
      setPaymentError(null);
      setIsPaymentPopupVisible(false);
    } else if (paymentState === "success") {
      showToast(t("Paiement de la commande effectué avec succès !"), "success");
    } else if (paymentState === "success_created") {
      setIsPaymentPopupVisible(false);
      setPaymentState("network_select");
    }
  }, [visible, paymentError, paymentState]);

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
    // Horaires d'ouverture : bornent l'heure de retrait sur place.
    const hoursOf = (data: any) => ({
      openTime: data?.openTime ?? ctxFastFood?.openTime,
      closeTime: data?.closeTime ?? ctxFastFood?.closeTime,
    });
    const merge = (data: any) =>
      setMenuWithDeliveryHours(
        data?.deliveryHours || data?.orderLeadTime || data?.expressZones
          ? ({
              ...menu,
              deliveryHours: data.deliveryHours,
              // Zones EXPRESS de la boutique : une liste, sans heure.
              expressZones: data.expressZones ?? [],
              orderLeadTime: data.orderLeadTime,
              advanceDays: data.advanceDays,
              deliveryOffer,
              // Retrait boutique autorisé ? (/all d'abord, sinon /:id)
              pickupAllowed: ctxFastFood?.pickupAllowed ?? data?.pickupAllowed,
              ...hoursOf(data),
            } as any)
          : ({
              ...menu,
              deliveryOffer,
              pickupAllowed: ctxFastFood?.pickupAllowed ?? data?.pickupAllowed,
              ...hoursOf(data),
            } as any),
      );

    const cached = getCachedFastFood(ffId);
    if (cached !== undefined) {
      merge(cached);
      return;
    }
    prefetchFastFoodDelivery(ffId).then(merge);
  }, [menu, fastFoods]);

  // Reprend l'action une fois le numero saisi (delivery.phone a jour).
  useEffect(() => {
    if (!resumeAction || !delivery.phone) return;
    const action = resumeAction;
    setResumeAction(null);
    actionsRef.current[action]?.();
  }, [resumeAction, delivery.phone]);

  if (!menu) return null;

  // Sur place : numero puis jour du retrait (commande possible pour un jour futur).
  const needsPickupPhone = () =>
    (!delivery.statut || delivery.type === "aucune") && (!delivery.phone || !pickupChosen);
  const askPhoneThen = (action: "cart" | "buy") => {
    pendingAction.current = action;
    if (delivery.phone) setPickupPhone(delivery.phone);
    else setIsContactPopupVisible(true);
  };

  const rawHours = (menuWithDeliveryHours as any)?.deliveryHours || [];
  // Zones EXPRESS de la boutique : une liste, sans heure (un prix par lieu).
  const expressZones = (menuWithDeliveryHours as any)?.expressZones || [];
  const orderLeadTime = (menuWithDeliveryHours as any)?.orderLeadTime || 0;
  const advanceDays = (menuWithDeliveryHours as any)?.advanceDays;
  const deliveryOffer = (menuWithDeliveryHours as any)?.deliveryOffer || null;
  // Retrait boutique autorisé ? (fusion /all + /:id dans l'effet ci-dessus)
  const pickupAllowed = (menuWithDeliveryHours as any)?.pickupAllowed;

  const handleConfirm = () => {
    const order = createOrder();
    if (order) onConfirm(order);
  };

  return (
    <>
      <Modal visible={modalMounted} transparent animationType="none">
        <View style={styles.overlay}>
          {/* Flou Android (SDK 57) : les overlays floutent le contenu du
              sheet (`BlurTarget`). */}
          <BlurScope>
          {/* Voile noir animé en fade (séparé du contenu) */}
          <Animated.View
            style={[styles.backdrop, { opacity: backdropOpacity }]}
            pointerEvents="none"
          />
          {/* Paiement en cours : toucher hors zone = retour au panier. */}
          <Pressable
            style={styles.dismiss}
            onPress={paymentInFlight ? onClose : undefined}
          />

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
            <BlurTarget style={SHEET_BLUR_TARGET}>
            <View style={{ flex: 1 }}>
              <View style={styles.tabsWrapper}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.tabsContent}
                >
                  <TabChip
                    isActive={activeTab === "detail"}
                    label={t("Détails")}
                    icon="information-circle-outline"
                    onPress={() => setActiveTab("detail")}
                  />
                  <TabChip
                    isActive={activeTab === "drink"}
                    label={t("Boissons")}
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
                    label={t("Livraison")}
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
                  <CartDetailTab
                    onOpenTab={setActiveTab}
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
                    expressZones={expressZones}
                    deliveryOffer={deliveryOffer}
                    pickupAllowed={pickupAllowed}
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
              onAddToCart={onSave && (actionsRef.current.cart = async () => {
                if (needsPickupPhone()) return askPhoneThen("cart");
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
                      message: t("Modifications enregistrées"),
                      type: "success",
                    });
                  } else if (result?.message) {
                    showError(result.message);
                  }
                } finally {
                  setIsSaving(false);
                }
              })}
              onBuy={(actionsRef.current.buy = () => {
                if (needsPickupPhone()) return askPhoneThen("buy");
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
              })}
            />
            </BlurTarget>
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
              onClose={() => {
                setIsContactPopupVisible(false);
                pendingAction.current = null;
              }}
              phone={delivery.phone || ""}
              pickup={!delivery.statut || delivery.type === "aucune"}
              onSelectPhone={(ph) => {
                // Sur place : apres le numero, demander le jour du retrait.
                if (ph && (!delivery.statut || delivery.type === "aucune")) {
                  setPickupPhone(ph);
                  return;
                }
                setDelivery({ ...delivery, phone: ph });
                if (ph && pendingAction.current) {
                  setResumeAction(pendingAction.current);
                  pendingAction.current = null;
                }
              }}
            />
          )}

          <PickupDateSheet
            visible={!!pickupPhone}
            value={delivery.date}
            maxDays={advanceDays}
            time={delivery.pickupTime}
            openTime={(menuWithDeliveryHours as any)?.openTime}
            closeTime={(menuWithDeliveryHours as any)?.closeTime}
            leadMinutes={orderLeadTime}
            onClose={() => {
              setPickupPhone(null);
              pendingAction.current = null;
            }}
            onPick={(date, pickupTime) => {
              setDelivery({ ...delivery, phone: pickupPhone || delivery.phone, date, pickupTime });
              setPickupPhone(null);
              setPickupChosen(true);
              if (pendingAction.current) {
                setResumeAction(pendingAction.current);
                pendingAction.current = null;
              }
            }}
          />

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
              expressZones={expressZones}
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

          {/* Carte récap + capsule : glissent AVEC le sheet (fermeture hors
              zone / réouverture d'un paiement en cours), jamais de vide dessous. */}
          <Animated.View
            pointerEvents="box-none"
            style={[StyleSheet.absoluteFill, { transform: [{ translateY: sheetTranslate }] }]}
          >
          <CheckoutPaymentTopOverlay
            visible={isPaymentPopupVisible}
            menu={menu}
            priceDescription={
              menu
                ? menuPriceDescription(menu, selectedPriceIndex)
                : ""
            }
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
          </Animated.View>

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
              key={paymentError}
              message={paymentError}
              type="error"
              duration={10000}
              onHide={() => setPaymentError(null)}
            />
          )}
          </BlurScope>
        </View>
        {/* Toast global au premier plan (Android). */}
        <GlobalToastHost modal />
      </Modal>
    </>
  );
};
