// Parcours « commander » du panier (`cart.tsx`), extrait pour R4 : groupe en
// cours de paiement, sheet de livraison groupee, montant REELLEMENT envoye,
// verdict socket, verrou de paiement et fin de parcours. Code deplace tel quel.
import React, { useEffect, useMemo, useState } from "react";
import { useCartPayment } from "./useCartPayment";
import type { groupCartOrdersByZone } from "@/src/features/orders/utils/groupCartOrders";
import { sanitizeOrder } from "@/src/features/orders/utils/sanitizeOrder";
import { toOrderDelivery, validateCartDeliveries } from "@/src/features/orders/utils/cartScreenUtils";
import { lockPayment, unlockPayment, reopenLockedPayment } from "@/src/services/paymentLock";
import { showToast } from "@/src/services/globalToast";
import { t } from "@/src/i18n";

type Groups = ReturnType<typeof groupCartOrdersByZone>;
type SetToast = (v: { message: string; type: "success" | "error" } | null) => void;

interface Args {
  pendingToBuy: any[];
  zoneGroups: Groups;
  cartTotal: number;
  userData: any;
  refresh: () => any;
  requireName: (action?: () => void) => boolean;
  setToast: SetToast;
}

export const useCartOrderFlow = ({ pendingToBuy, zoneGroups, cartTotal, userData, refresh, requireName, setToast }: Args) => {
  // Groupe (zone) en cours de paiement ; null = paiement global du panier.
  const [payingGroupKey, setPayingGroupKey] = useState<string | null>(null);
  const payingGroup = useMemo(
    () => zoneGroups.find((g) => g.key === payingGroupKey) || null,
    [zoneGroups, payingGroupKey],
  );
  const amountToPay = payingGroup ? payingGroup.total : cartTotal;

  // Paiement global du panier (logique propre, isolée de useCheckout).
  const payment = useCartPayment(cartTotal);
  const { setPaymentPhone, paymentState, setPaymentState, paymentError, setPaymentError,
    resetPayment, handlePaymentConfirm, handlePaymentVerdict, registerPaymentHandler,
    unregisterPaymentHandler } = payment;

  // Sheet de livraison groupée (groupage, livraison commune, paiement). `null` = fermé.
  const [groupedDelivery, setGroupedDelivery] = useState<Groups | null>(null);

  /**
   * Commandes REELLEMENT payees. En livraison groupee, elles viennent du LOT
   * affiche par le sheet (boutique selectionnee) : retomber sur `pendingToBuy`
   * envoyait tout le panier alors que `amount` n'est calcule que sur le lot.
   */
  const ordersToPay = useMemo(() => {
    if (groupedDelivery) return groupedDelivery.flatMap((g) => g.entries.map((e) => e.order));
    if (payingGroup) return payingGroup.entries.map((e) => e.order);
    return pendingToBuy;
  }, [groupedDelivery, payingGroup, pendingToBuy]);

  // Livraison commune validée : écrase celle de chaque commande payée.
  const [groupedDeliveryValue, setGroupedDeliveryValue] = useState<any>(null);
  /** Sheet groupé masqué pendant l'attente du verdict (cf. `paymentLock`). */
  const [groupedHidden, setGroupedHidden] = useState(false);
  /** Meme valeur, lisible SYNCHRONEMENT par `confirmCartPayment`. */
  const groupedDeliveryRef = React.useRef<any>(null);

  /**
   * Total d'une commande UNE FOIS la livraison commune appliquee : le backend
   * recalcule `articles + delivery.prix`, on realigne le total sur la nouvelle course.
   */
  const regroupedTotal = React.useCallback(
    (o: any) => {
      const ancien = Number(o?.delivery?.prix) || 0;
      const nouveau = Number(groupedDeliveryValue?.prix) || 0;
      return (Number(o?.total) || 0) - ancien + nouveau;
    },
    [groupedDeliveryValue],
  );

  /** Montant REELLEMENT envoye. Meme formule que le backend : Σ totaux − (N-1) x la course. */
  const amountToPayEffective = useMemo(() => {
    if (!groupedDelivery) return amountToPay;
    if (!groupedDeliveryValue) {
      const articles = groupedDelivery.reduce((s, g) => s + g.articles, 0);
      const course = groupedDelivery.reduce((s, g) => Math.max(s, g.livraison), 0);
      return articles + course;
    }
    const orders = groupedDelivery.flatMap((g) => g.entries.map((e) => e.order as any));
    const somme = orders.reduce((s, o) => s + regroupedTotal(o), 0);
    const course = Number(groupedDeliveryValue?.prix) || 0;
    return somme - Math.max(orders.length - 1, 0) * course;
  }, [groupedDelivery, groupedDeliveryValue, regroupedTotal, amountToPay]);

  useEffect(() => {
    if (userData?.infos?.numero) setPaymentPhone(userData.infos.numero.toString());
  }, [userData, setPaymentPhone]);

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
    setGroupedDeliveryValue(null);
    // Ref remise a zero aussi : sinon un paiement suivant NON groupe repartait
    // avec la livraison commune du precedent.
    groupedDeliveryRef.current = null;
    // La fin du paiement referme aussi le sheet groupé (sinon ouvert sur le succès).
    setGroupedDelivery(null);
    setGroupedHidden(false);
    resetPayment();
  }, [resetPayment]);

  /** Point d'entrée unique de « commander » (récap du bas ET pilule du header). */
  const startOrder = React.useCallback(
    (groups: Groups) => {
      if (reopenLockedPayment()) return;
      // Nom / prenom manquant : la sheet dediee passe AVANT la livraison.
      requireName(() => setGroupedDelivery(groups));
    },
    [requireName],
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

  // Paiement groupé en attente de verdict : verrou global, toute ouverture
  // (commande, « commander ») rouvre le sheet groupé tel qu'il était.
  const groupedInFlight = paymentState === "waiting" || paymentState === "ussd_sent";
  const reopenGrouped = React.useRef(() => setGroupedHidden(false)).current;
  useEffect(() => {
    if (groupedInFlight) lockPayment(reopenGrouped);
    else unlockPayment(reopenGrouped);
  }, [groupedInFlight, reopenGrouped]);

  // Toast d'erreur paiement (sheet masqué : toast global et fin du parcours).
  useEffect(() => {
    if (paymentError) {
      if (groupedHidden) {
        showToast(paymentError, "error");
        endPayment();
      } else setToast({ message: paymentError, type: "error" });
      setPaymentError(null);
    }
  }, [paymentError, setPaymentError, groupedHidden, endPayment, setToast]);

  // Succès reçu sheet masqué : toast global, fin immédiate du parcours.
  useEffect(() => {
    if (groupedHidden && paymentState === "success") {
      showToast(t("Paiement de la commande effectué avec succès !"), "success");
      endPayment();
      refresh();
    }
  }, [groupedHidden, paymentState, endPayment, refresh]);

  /** Livraison commune validée dans le sheet : ref posee AVANT le state (onConfirm suit dans le meme tour). */
  const validateGroupedDelivery = (d: any) => {
    const value = toOrderDelivery(d);
    groupedDeliveryRef.current = value;
    setGroupedDeliveryValue(value);
    // Lot entier : pas de zone unique à cibler, on paie tout l'affiché.
    setPayingGroupKey(null);
    setPaymentState("input");
  };

  // Valide les livraisons puis délègue le paiement au hook useCartPayment.
  const confirmCartPayment = async (phone: string) => {
    // Livraison groupée (lue dans la REF) : elle remplace celle de chaque
    // commande, la validation par commande ne s'applique donc plus.
    const commune = groupedDeliveryRef.current;
    if (!commune) {
      const validationErr = validateCartDeliveries(ordersToPay);
      if (validationErr) {
        setToast({ message: validationErr, type: "error" });
        // Revenir à l'input pour corriger (sinon coincé en waiting).
        setPaymentState("input");
        return;
      }
    }
    // items = commandes payées, sanitizées comme l'envoi historique (sanitizeOrder).
    const cours = Number(commune?.prix) || 0;
    const items = ordersToPay.map((o) =>
      sanitizeOrder(
        commune
          ? {
              ...o,
              delivery: commune,
              // Le `total` d'origine porte l'ancienne course ; on realigne.
              total: (Number((o as any)?.total) || 0) - (Number((o as any)?.delivery?.prix) || 0) + cours,
            }
          : o,
        userData?.uid,
      ),
    );
    // Meme formule que le backend : Σ totaux − (N-1) x la course.
    const amount = commune
      ? items.reduce((s, it: any) => s + (Number(it?.total) || 0), 0) - Math.max(items.length - 1, 0) * cours
      : amountToPayEffective;
    await handlePaymentConfirm(phone, items, amount);
  };

  return {
    ...payment,
    paymentActive,
    groupedDelivery,
    setGroupedDelivery,
    groupedHidden,
    setGroupedHidden,
    endPayment,
    startOrder,
    validateGroupedDelivery,
    confirmCartPayment,
  };
};
