import { useState, useCallback } from "react";
import { socketService } from "../../../services/socket";
import { useAuth } from "../../auth/context/AuthContext";

export type WithdrawState =
  | "idle"
  | "amount_input"
  | "network_select"
  | "input"
  | "waiting"
  | "ussd_sent"
  | "success"
  | "success_created"
  | "failed";

/**
 * Logique de RETRAIT marchand (copie adaptée de useCartPayment).
 * Le marchand saisit un montant à retirer + un numéro + un réseau.
 *
 * ⚠️ Branchement backend NON connecté pour l'instant (visuels + workflow only).
 * L'appel API réel (endpoint retrait) est laissé en TODO ci-dessous.
 */
export const useWithdraw = () => {
  const { userData } = useAuth();

  const [withdrawPhone, setWithdrawPhone] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawNetwork, setWithdrawNetwork] = useState<"orange" | "mtn">("orange");
  const [withdrawState, setWithdrawState] = useState<WithdrawState>("idle");
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [ussdMessage, setUssdMessage] = useState<string | null>(null);

  const registerPaymentHandler = useCallback(
    (handler: (data: any) => void) => socketService.registerPaymentHandler(handler),
    [],
  );
  const unregisterPaymentHandler = useCallback(
    () => socketService.unregisterPaymentHandler(),
    [],
  );

  const resetWithdraw = useCallback(() => {
    setWithdrawState("idle");
    setWithdrawError(null);
    setUssdMessage(null);
    setWithdrawAmount("");
  }, []);

  // Confirme le retrait (numéro + montant + réseau).
  const handleWithdrawConfirm = useCallback(
    async (phone: string) => {
      const amount = Number(withdrawAmount);
      if (!userData || !phone) {
        setWithdrawError("Numéro de retrait requis");
        return;
      }
      if (!amount || amount <= 0) {
        setWithdrawError("Montant de retrait invalide");
        return;
      }
      setWithdrawError(null);
      setWithdrawPhone(phone);
      setWithdrawState("waiting");

      // TODO(backend): brancher l'appel API de retrait quand l'endpoint sera prêt.
      // Exemple attendu (à valider) :
      //   await axios.post(`${Config.apiUrl}/withdraw`, {
      //     payBy: "mobilemoney",
      //     amount,
      //     phone: phone.replace(/\s/g, ""),
      //     network: withdrawNetwork === "orange" ? "Orangemoney" : "MTN",
      //     userId: userData.uid,
      //   });
      // Puis gérer la réponse (ussd_sent / erreur) comme dans useCartPayment.
      //
      // En attendant : on simule la transition vers ussd_sent pour valider le workflow visuel.
      setUssdMessage("Demande de retrait envoyée. Confirmez via le code reçu par SMS.");
      setWithdrawState("ussd_sent");
    },
    [userData, withdrawAmount, withdrawNetwork],
  );

  // Verdict reçu via socket (réutilise le même canal que le paiement).
  const handleWithdrawVerdict = useCallback((data: any) => {
    if (data.status === "successful") {
      setWithdrawState("success");
      setTimeout(() => {
        setWithdrawState("success_created");
      }, 5000);
    } else {
      setWithdrawError("Retrait échoué");
      setWithdrawState("idle");
    }
  }, []);

  return {
    withdrawPhone,
    setWithdrawPhone,
    withdrawAmount,
    setWithdrawAmount,
    withdrawNetwork,
    setWithdrawNetwork,
    withdrawState,
    setWithdrawState,
    withdrawError,
    setWithdrawError,
    ussdMessage,
    resetWithdraw,
    handleWithdrawConfirm,
    handleWithdrawVerdict,
    registerPaymentHandler,
    unregisterPaymentHandler,
  };
};
