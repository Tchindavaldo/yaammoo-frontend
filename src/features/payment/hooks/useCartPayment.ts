import { useState, useCallback } from "react";
import axios from "axios";
import { Config } from "../../../api/config";
import { socketService } from "../../../services/socket";
import { useAuth } from "../../auth/context/AuthContext";

export type CartPaymentState =
  | "total"
  | "network_select"
  | "input"
  | "waiting"
  | "ussd_sent"
  | "success"
  | "success_created"
  | "failed";

/**
 * Logique de paiement GLOBAL du panier (toutes les commandes pendingToBuy).
 * Données propres au panier — n'utilise PAS l'état de useCheckout.
 * Reproduit la même logique API (/transaction) + verdict socket.
 */
export const useCartPayment = (amount: number) => {
  const { userData } = useAuth();

  const [paymentPhone, setPaymentPhone] = useState("");
  const [paymentNetwork, setPaymentNetwork] = useState<"orange" | "mtn">("orange");
  const [paymentState, setPaymentState] = useState<CartPaymentState>("total");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [ussdMessage, setUssdMessage] = useState<string | null>(null);

  const registerPaymentHandler = useCallback(
    (handler: (data: any) => void) => socketService.registerPaymentHandler(handler),
    [],
  );
  const unregisterPaymentHandler = useCallback(
    () => socketService.unregisterPaymentHandler(),
    [],
  );

  const resetPayment = useCallback(() => {
    setPaymentState("total");
    setPaymentError(null);
    setUssdMessage(null);
  }, []);

  // Envoie la transaction de paiement global du panier.
  // `items` = toutes les commandes pendingToBuy (le backend déduit le fastFoodId).
  const handlePaymentConfirm = useCallback(
    async (phone: string, items: any[] = []) => {
      if (!userData || !phone) {
        setPaymentError("Numéro de paiement requis");
        return;
      }
      setPaymentError(null);
      setPaymentPhone(phone);
      // Source de vérité unique : "waiting" ici (pas en local capsule) pour que
      // le retour à "input" sur erreur fonctionne toujours.
      setPaymentState("waiting");

      try {
        const response = await axios.post(`${Config.apiUrl}/transaction`, {
          payBy: "mobilemoney",
          amount,
          phone: phone.replace(/\s/g, ""),
          network: paymentNetwork === "orange" ? "Orangemoney" : "MTN",
          email: userData?.infos?.email || "user@yaammoo.com",
          userId: userData.uid,
          items,
        });

        if (response.data.status === "ussd_sent" || response.data.success === true) {
          setUssdMessage(response.data.message);
          setPaymentState("ussd_sent");
        } else {
          const raw = response.data.message;
          const message = Array.isArray(raw)
            ? raw.map((e: any) => e?.message).filter(Boolean).join(" • ") || "Erreur paiement"
            : raw || "Erreur paiement";
          setPaymentError(message);
          setPaymentState("input");
        }
      } catch (error: any) {
        const data = error.response?.data;
        const raw = data?.message;
        let message = Array.isArray(raw)
          ? raw.map((e: any) => e?.message).filter(Boolean).join(" • ")
          : raw;
        message = message || data?.error || error.message || "Erreur paiement";
        setPaymentError(message);
        setPaymentState("input");
      }
    },
    [userData, paymentNetwork, amount],
  );

  // Verdict reçu via socket (payment.settled).
  const handlePaymentVerdict = useCallback((data: any) => {
    if (data.status === "successful") {
      setPaymentState("success");
      setTimeout(() => {
        // La fermeture est gérée par le parent (effet sur 'success_created').
        setPaymentState("success_created");
      }, 5000);
    } else {
      // Échec : pas d'état "failed" dans l'overlay → retour direct au repos
      // (total). Seul le toast top affiche l'erreur.
      setPaymentError("Paiement échoué");
      setPaymentState("total");
    }
  }, []);

  return {
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
  };
};
