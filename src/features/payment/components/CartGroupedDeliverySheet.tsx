"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import { GlobalToastHost } from "@/src/components/GlobalToastHost";
import { BlurScope, BlurTarget } from "@/src/components/BlurTarget";
import { Toast } from "@/src/components/Toast";
import type { CartZoneGroup } from "@/src/features/orders/utils/groupCartOrders";
import { Livraison } from "@/src/types";
import React from "react";
import { Animated, Modal, Pressable, StyleSheet } from "react-native";
// Safe-area basse : source unique (R19), cf. blur-safe-area.md §4.
import { useSheetSafeInsets as useSafeAreaInsets } from "@/src/hooks/usePageBottomInset";
import { SafeAreaDebugBand } from "@/src/components/SafeAreaDebugBand";
import type { CartPaymentState } from "../hooks/useCartPayment";
import { useGroupedDeliveryData } from "../hooks/useGroupedDeliveryData";
import { useGroupedDetailCapsule } from "../hooks/useGroupedDetailCapsule";
import { usePickupPrefill } from "../hooks/usePickupPrefill";
import { useCartPaidDepartures } from "../hooks/useCartPaidDepartures";
import {
  CartGroupedDeliveryOverlays,
  type GroupedDeliveryOverlay,
} from "./CartGroupedDeliveryOverlays";
import { styles } from "./CartGroupedDeliverySheet.styles";
import { CartGroupedDetailCapsule } from "./CartGroupedDetailCapsule";
import { CartGroupedPaymentBody } from "./CartGroupedPaymentBody";
import { C, styles as sheetStyles } from "./CartPaymentSheet.styles";
import { t, useLanguage } from "@/src/i18n";
import { GroupedPickupDateSheet } from "./GroupedPickupDateSheet";
import { GroupedPickupHourSheet } from "./GroupedPickupHourSheet";
import { GroupedLegacyPayOverlay } from "./GroupedLegacyPayOverlay";
import { GroupedSheetActionRow } from "./GroupedSheetActionRow";
import { isPickupHourValid } from "@/src/features/checkout/utils/pickupHours";
import { hasExpressZones as hasExpressZonesOf } from "@/src/features/checkout/utils/expressZones";

interface CartGroupedDeliverySheetProps {
  visible: boolean;
  /** Groupes du lot : alimentent l'étape de choix du groupage. */
  groups: CartZoneGroup[];
  /** Livraisons séparées : retour au panier, chaque zone garde son bouton. */
  onSplit: () => void;
  /**
   * Boutique de référence pour les zones express et les créneaux : celle des
   * commandes groupées. Les livraisons groupées partent d'un même point.
   */
  fastFoodId?: string;
  /** Livraison commune validée : appliquée à toutes les commandes du lot. */
  onValidate: (delivery: Livraison) => void;

  // --- Paiement (mêmes props que `CartPaymentSheet`) ---
  // Pas de `totalAmount` : le montant se DEDUIT du lot (articles + la course
  // unique), le total du panier compterait une course par zone.
  phone: string;
  onPhoneChange: (phone: string) => void;
  network: "orange" | "mtn";
  onNetworkChange: (network: "orange" | "mtn") => void;
  paymentState: CartPaymentState;
  setPaymentState: (s: CartPaymentState) => void;
  ussdMessage?: string | null;
  onConfirm: (phone: string) => Promise<void>;
  /** Hauteur du clavier : la capsule du bas remonte avec lui. */
  keyboardHeight: Animated.Value | Animated.AnimatedInterpolation<number>;
  isKeyboardVisible: boolean;
  onClose: () => void;
  /** Paiement en cours : masque le sheet sans l'annuler (cf. `paymentLock`). */
  onHide?: () => void;
  onError?: (message: string) => void;
}

/**
 * Bottom sheet du parcours de commande GROUPÉ — ouvert par « commander » quand
 * le panier porte plusieurs courses. Un seul `Modal`, pages 1 a 4
 * (`CartGroupedPaymentBody`) : groupage, type, informations, montants ; la
 * page 4 ouvre sa capsule de saisie dediee (`CartGroupedDetailCapsule`).
 *
 * `deliveryHours` / `expressZones` / `openTime` / `closeTime` /
 * `orderLeadTime` / `deliveryOffer` viennent de `useGroupedDeliveryData`.
 *
 * Modules extraits (R4) : `GroupedSheetActionRow` (navigation),
 * `useGroupedDetailCapsule`, `GroupedLegacyPayOverlay` (ancienne page 5).
 */
export const CartGroupedDeliverySheet: React.FC<
  CartGroupedDeliverySheetProps
> = ({
  visible,
  groups,
  fastFoodId,
  onSplit,
  onValidate,
  onClose,
  onHide,
  phone,
  onPhoneChange,
  network,
  onNetworkChange,
  paymentState,
  setPaymentState,
  ussdMessage,
  onConfirm,
  keyboardHeight,
  isKeyboardVisible,
}) => {
  useLanguage();
  const insets = useSafeAreaInsets();

  // Toast rendu DANS le Modal : celui du panier est etouffe par le voile.
  const [localToast, setLocalToast] = React.useState<string | null>(null);
  const showError = React.useCallback(
    (message: string) => setLocalToast(message),
    [],
  );

  const anim = React.useRef(new Animated.Value(0)).current;
  // Reste monté le temps de l'animation de sortie.
  const [mounted, setMounted] = React.useState(visible);

  // Livraison commune en cours de composition. Express par défaut.
  const [delivery, setDelivery] = React.useState<Livraison>(
    () => new Livraison(true, 0, "express"),
  );

  /**
   * Paiement lance : on remonte d'abord la livraison commune au panier (qui la
   * pousse dans les commandes et arme le paiement), puis on declenche la
   * transaction.
   */
  const handleConfirm = React.useCallback(
    (payPhone: string) => {
      onValidate(delivery);
      return onConfirm(payPhone);
    },
    [onValidate, onConfirm, delivery],
  );

  // Overlay ouvert (un seul a la fois).
  const [overlay, setOverlay] = React.useState<GroupedDeliveryOverlay>(null);
  // Sur place : jour puis heure de passage.
  const [pickupOpen, setPickupOpen] = React.useState(false);
  const [pickupChosen, setPickupChosen] = React.useState(false);
  const [pickupHourOpen, setPickupHourOpen] = React.useState(false);
  const pendingPayPhone = React.useRef<string | null>(null);

  /** Livraison incomplete : le paiement ne part pas, le message dit ce qui manque. */
  const guardedConfirm = React.useCallback(
    async (payPhone: string) => {
      // Retrait : numero de contact exige ; le paiement reprend apres saisie.
      if (delivery.type === "aucune" && !delivery.phone) {
        pendingPayPhone.current = payPhone;
        setOverlay("contact");
        return;
      }
      const manque =
        delivery.type === "aucune"
          ? null
          : !delivery.address && !delivery.note
            ? t("Indiquez le lieu de livraison")
            : !delivery.phone
              ? t("Indiquez un numéro de contact")
              : delivery.type === "standard" && !delivery.hour
                ? t("Choisissez un créneau horaire")
                : null;
      if (manque) {
        showError(manque);
        return;
      }
      await handleConfirm(payPhone);
    },
    [delivery, handleConfirm, showError],
  );

  // Reprise du paiement apres saisie du numero de contact (retrait).
  React.useEffect(() => {
    const payPhone = pendingPayPhone.current;
    if (!payPhone || !delivery.phone) return;
    pendingPayPhone.current = null;
    handleConfirm(payPhone);
  }, [delivery.phone, handleConfirm]);

  // Overlay ferme sans numero : on abandonne la reprise.
  React.useEffect(() => {
    if (overlay === null && !delivery.phone) pendingPayPhone.current = null;
  }, [overlay, delivery.phone]);

  // Ancien `handlePay` (capsule de la page 5) retire : jamais appele, la
  // saisie passe par `CartGroupedDetailCapsule`. Plus d'envoi local en cours.
  const isProcessing = false;

  // "Deja groupe" (un seul `CartZoneGroup`) : on demarre sur le type (2).
  const singleOrder = groups.length <= 1;
  const [step, setStep] = React.useState<1 | 2 | 3 | 4>(singleOrder ? 2 : 1);

  // Paiement en attente de verdict : rouvert tel quel (étape et capsule gardées).
  const inFlightRef = React.useRef(false);
  inFlightRef.current =
    paymentState === "waiting" || paymentState === "ussd_sent";
  usePickupPrefill(visible, groups, inFlightRef.current, setDelivery, setPickupChosen);
  React.useEffect(() => {
    if (inFlightRef.current) return;
    setStep(singleOrder ? 2 : 1);
  }, [visible, singleOrder]);

  // Paiement parti : plus de fermeture au tap ni de changement de reseau.
  const isBusy =
    paymentState === "waiting" ||
    paymentState === "ussd_sent" ||
    paymentState === "success" ||
    paymentState === "success_created";

  const [detailCapsule, setDetailCapsule] = useGroupedDetailCapsule(step, isBusy, isKeyboardVisible);

  /**
   * Clavier referme alors qu'on saisissait : on repasse au repos (garde
   * `keyboardWasVisible` : `autoFocus` demande le clavier au montage).
   */
  const keyboardWasVisible = React.useRef(false);
  React.useEffect(() => {
    if (paymentState !== "input") {
      keyboardWasVisible.current = false;
      return;
    }
    if (isKeyboardVisible) keyboardWasVisible.current = true;
    else if (keyboardWasVisible.current) setPaymentState("total");
  }, [isKeyboardVisible, paymentState, setPaymentState]);

  /** Capsule de l'ancienne page 5 : CONSERVEE mais plus atteinte (`false`). */
  const showPayOverlay =
    false &&
    step === 4 &&
    (paymentState === "input" ||
      paymentState === "waiting" ||
      paymentState === "ussd_sent" ||
      paymentState === "success" ||
      paymentState === "success_created");

  React.useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 11,
      }).start();
    } else {
      // Sortie en fondu court : le paiement enchaine derriere.
      Animated.timing(anim, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, anim]);

  // Donnees de livraison de la boutique de reference (creneaux, offre).
  const {
    rawHours,
    expressZones,
    openTime,
    closeTime,
    orderLeadTime,
    advanceDays,
    deliveryOffer,
    pickupAllowed,
  } = useGroupedDeliveryData(fastFoodId);

  // Zones express (liste boutique, sans heure).
  const hasExpressZones = hasExpressZonesOf(expressZones);

  /**
   * Page suivante. Depuis « Informations » (3), on refuse d'avancer tant que
   * les champs requis par le type de livraison sont vides.
   */
  const goNext = React.useCallback(() => {
    // Retrait : numero de contact exige (la boutique joint le client).
    if (step === 3 && delivery.type === "aucune" && !delivery.phone) {
      showError(t("Indiquez un numéro de contact pour que la boutique puisse vous joindre"));
      return;
    }
    // Retrait : jour puis heure de passage obligatoires (tuiles Date / Heure).
    if (step === 3 && delivery.type === "aucune" && !pickupChosen) {
      setPickupOpen(true);
      return;
    }
    if (step === 3 && delivery.type === "aucune" && !delivery.pickupTime) {
      setPickupHourOpen(true);
      return;
    }
    // Heure passee ou trop proche (delai de preparation) : toast, la tuile Heure la change.
    if (step === 3 && delivery.type === "aucune" && !isPickupHourValid(delivery.pickupTime, openTime, closeTime, delivery.date, orderLeadTime)) {
      showError(t("Cette heure de retrait n'est plus valide : choisissez une nouvelle heure"));
      return;
    }
    if (step === 3 && delivery.type !== "aucune") {
      const manque = !delivery.address && !delivery.note
        ? t("Indiquez le lieu de livraison")
        : !delivery.phone
          ? t("Indiquez un numéro de contact")
          : delivery.type === "standard" && !delivery.hour
            ? t("Choisissez un créneau horaire")
            : delivery.type === "express" &&
                hasExpressZones &&
                !delivery.expressLieu
              ? t("Choisissez une zone express")
              : null;
      if (manque) {
        showError(manque);
        return;
      }
    }
    setStep((s) => (s + 1) as 1 | 2 | 3 | 4);
  }, [step, delivery, hasExpressZones, showError, pickupChosen, openTime, closeTime, orderLeadTime]);

  const cmd = groups.reduce((s, g) => s + g.entries.length, 0);
  // Course du lot (suit `delivery`) ; 0 si le départ est déjà payé (groupage).
  const paidDep = useCartPaidDepartures(visible, fastFoodId, delivery, setDelivery);
  const fraisGroupes = delivery.type === "aucune" || paidDep.grouped ? 0 : Number(delivery.type === "express" ? delivery.expressPrix : delivery.prix) || 0;
  /** Total des articles du lot, hors livraison (source de verite du backend). */
  const articlesTotal = groups.reduce((s, g) => s + g.articles, 0);

  if (!mounted) return null;

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [900, 0],
  });

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      {/* Flou Android (SDK 57) : overlays, capsules et voile clavier floutent
          le corps du sheet (`BlurTarget`). */}
      <BlurScope>
      <Animated.View style={[sheetStyles.scrim, { opacity: anim }]}>
        {/* Paiement parti : le tap sur le voile ne ferme plus. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={
            paymentState === "waiting" || paymentState === "ussd_sent"
              ? onHide
              : isBusy
                ? undefined
                : onClose
          }
        />
      </Animated.View>

      <Animated.View
        style={[
          sheetStyles.sheet,
          styles.sheet,
          {
            // Pied pose sur la bande safe-area (source unique, R19).
            paddingBottom: insets.bottom,
            transform: [{ translateY }],
          },
        ]}
      >
        <BlurTarget
          style={[styles.body, styles.payLayer, { backgroundColor: C.sheet }]}
        >
          <CartGroupedPaymentBody
            delivery={delivery}
            setDelivery={setDelivery}
            hasExpressZones={hasExpressZones}
            cmd={cmd}
            deliveryCount={groups.length}
            articlesTotal={articlesTotal}
            livraison={fraisGroupes}
            courseGrouped={paidDep.grouped}
            courseChecking={paidDep.checking}
            onSplit={onSplit}
            onOpenLocation={() => setOverlay("location")}
            onOpenContact={() => setOverlay("contact")}
            onOpenPeriod={() => setOverlay("period")}
            onOpenExpress={() => setOverlay("express")}
            onOpenVoiceNote={() => setOverlay("voiceNote")}
            network={network}
            onNetworkChange={onNetworkChange}
            isBusy={isBusy}
            pickupAllowed={pickupAllowed}
            onOpenPickupDate={() => setPickupOpen(true)}
            onOpenPickupHour={() =>
              pickupChosen
                ? setPickupHourOpen(true)
                : showError(t("Choisissez d'abord le jour du retrait"))
            }
            step={step}
          />

          <GroupedSheetActionRow
            step={step}
            firstStep={singleOrder ? 2 : 1}
            isBusy={isBusy}
            isProcessing={isProcessing}
            phone={phone}
            onBack={() => setStep((s) => (s - 1) as 1 | 2 | 3 | 4)}
            onNext={goNext}
            onOpenCapsule={() => setDetailCapsule(true)}
          />
        </BlurTarget>
        <SafeAreaDebugBand />
      </Animated.View>

      <GroupedLegacyPayOverlay
        show={showPayOverlay}
        paymentState={paymentState}
        setPaymentState={setPaymentState}
        keyboardHeight={keyboardHeight}
        translateY={translateY}
        phone={phone}
        onPhoneChange={onPhoneChange}
        onConfirm={guardedConfirm}
        totalAmount={articlesTotal + fraisGroupes}
        network={network}
        onNetworkChange={onNetworkChange}
        ussdMessage={ussdMessage}
        onClose={onClose}
        onError={showError}
      />

      {/* Capsule DEDIEE de l'etape 4. */}
      <CartGroupedDetailCapsule
        visible={detailCapsule}
        phone={phone}
        onPhoneChange={onPhoneChange}
        onConfirm={guardedConfirm}
        paymentState={paymentState === "total" ? "input" : paymentState}
        ussdMessage={ussdMessage}
        onError={showError}
        network={network}
        onNetworkChange={onNetworkChange}
        keyboardHeight={keyboardHeight}
        isKeyboardVisible={isKeyboardVisible}
        translateY={translateY}
      />

      <CartGroupedDeliveryOverlays
        open={overlay}
        onCloseOverlay={() => setOverlay(null)}
        delivery={delivery}
        setDelivery={setDelivery}
        availableHours={rawHours}
        expressZones={expressZones}
        orderLeadTime={orderLeadTime}
        advanceDays={advanceDays}
        deliveryOffer={deliveryOffer}
        fastFoodId={fastFoodId}
        isGroupedSlot={paidDep.isGroupedSlot}
        onError={showError}
      />

      <GroupedPickupDateSheet
        visible={pickupOpen}
        value={delivery.date}
        maxDays={advanceDays}
        onClose={() => setPickupOpen(false)}
        onPick={(date) => {
          // Un autre jour peut rendre l'heure caduque : elle se re-choisit.
          const keep = isPickupHourValid(delivery.pickupTime, openTime, closeTime, date, orderLeadTime);
          setDelivery({ ...delivery, date, pickupTime: keep ? delivery.pickupTime : "" });
          setPickupChosen(true);
          setPickupOpen(false);
          if (!keep) setTimeout(() => setPickupHourOpen(true), 400); // iOS : 2 Modals a la fois = voile bloquant
        }}
      />

      <GroupedPickupHourSheet
        visible={pickupHourOpen}
        day={delivery.date}
        value={delivery.pickupTime}
        openTime={openTime}
        closeTime={closeTime}
        leadMinutes={orderLeadTime}
        onClose={() => setPickupHourOpen(false)}
        onPick={(pickupTime) => {
          setDelivery({ ...delivery, pickupTime });
          setPickupHourOpen(false);
        }}
      />

      {/* Rendu EN DERNIER, dans le Modal : au-dessus du voile et des overlays. */}
      {localToast && (
        <Toast
          message={localToast}
          type="error"
          onHide={() => setLocalToast(null)}
        />
      )}
      </BlurScope>
      {/* Toast global au premier plan (Android). */}
      <GlobalToastHost modal />
    </Modal>
  );
};
