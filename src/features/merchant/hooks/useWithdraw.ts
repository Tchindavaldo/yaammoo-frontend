import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "../../auth/context/AuthContext";
import { withdrawService } from "../services/withdrawService";
import {
  useMerchantWallet,
  WithdrawalEvent,
} from "../context/MerchantWalletContext";

export type WithdrawState =
  | "idle"
  | "amount_input"
  | "network_select"
  | "input"
  | "waiting"     // requête en vol → "Veuillez patienter…"
  | "processing"  // réponse reçue (pending) → "Retrait en cours"
  | "completed"   // socket completed → "Retrait effectué" (+ délai 24h)
  | "failed";

/**
 * Logique de RETRAIT marchand.
 * Flux : saisie montant → réseau → numéro → POST /wallet/withdraw → "en cours"
 * (dès la réponse) → verdict socket wallet.withdrawal (completed/failed).
 */
// 🐞 DEBUG : mettre à `true` pour afficher d'emblée l'overlay à l'état "completed"
// (le message « Retrait réussi… 24h ») sans avoir à refaire un retrait.
// ⚠️ Remettre à `false` avant de clore.
export const DEBUG_COMPLETED = false;

export const useWithdraw = () => {
  const { userData } = useAuth();
  const { registerWithdrawalHandler, unregisterWithdrawalHandler } =
    useMerchantWallet();

  const [withdrawPhone, setWithdrawPhone] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawNetwork, setWithdrawNetwork] = useState<"orange" | "mtn">("orange");
  const [withdrawState, setWithdrawState] = useState<WithdrawState>(
    DEBUG_COMPLETED ? "completed" : "idle",
  );
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  // Id du retrait en cours, pour ne réagir qu'à SON verdict socket.
  const currentWithdrawalId = useRef<string | null>(null);

  const resetWithdraw = useCallback(() => {
    setWithdrawState("idle");
    setWithdrawError(null);
    setWithdrawAmount("");
    setWithdrawPhone("");
    currentWithdrawalId.current = null;
  }, []);

  // Confirme le retrait : POST puis passage en "processing" dès la réponse.
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
      setWithdrawState("waiting"); // "Veuillez patienter…"
      console.log("📤 [Retrait FRONT] requête envoyée → état: waiting → message affiché: « Veuillez patienter... »");

      try {
        const res = await withdrawService.withdraw({
          amount,
          phone: phone.replace(/\s/g, ""),
          network: withdrawNetwork === "orange" ? "ORANGEMONEY" : "MTN",
          receiverName: userData?.infos?.email || "user@yaammoo.com",
        });

        const data = res?.data ?? res;
        if (res?.success === false) {
          console.log("❌ [Retrait FRONT] réponse HTTP = échec → état: input → message affiché (toast): «", res?.message || "Échec du retrait", "»");
          setWithdrawError(res?.message || "Échec du retrait");
          setWithdrawPhone("");
          setWithdrawState("input");
          return;
        }
        // Réponse OK → on connaît le withdrawalId, on passe en "en cours".
        currentWithdrawalId.current = data?.withdrawalId ?? null;
        console.log("✅ [Retrait FRONT] réponse HTTP reçue (withdrawalId=" + currentWithdrawalId.current + ") → état: processing → message affiché: « Retrait en cours... »");
        setWithdrawState("processing");
      } catch (error: any) {
        const data = error.response?.data;
        const message =
          data?.message || data?.error || error.message || "Échec du retrait";
        console.log("❌ [Retrait FRONT] erreur HTTP → état: input → message affiché (toast): «", message, "»");
        setWithdrawError(message);
        setWithdrawPhone("");
        setWithdrawState("input");
      }
    },
    [userData, withdrawAmount, withdrawNetwork],
  );

  // Verdict socket : ne réagit qu'au retrait en cours (même withdrawalId).
  useEffect(() => {
    const onVerdict = (e: WithdrawalEvent) => {
      if (
        currentWithdrawalId.current &&
        e.withdrawalId &&
        e.withdrawalId !== currentWithdrawalId.current
      ) {
        console.log("⏭️ [Retrait FRONT] socket ignoré (autre withdrawalId=" + e.withdrawalId + ", en cours=" + currentWithdrawalId.current + ")");
        return; // verdict d'un autre retrait
      }
      if (e.status === "completed") {
        console.log("🎉 [Retrait FRONT] socket status=completed → état: completed → message affiché: « Retrait effectué ! Le montant peut mettre jusqu'à 24h... » (newBalance=" + e.newBalance + ")");
        setWithdrawState("completed");
      } else if (e.status === "failed") {
        console.log("💥 [Retrait FRONT] socket status=failed → état: idle → message affiché (toast): «", e.reason || "Retrait échoué", "»");
        setWithdrawError(e.reason || "Retrait échoué");
        setWithdrawState("idle");
      } else {
        console.log("⏳ [Retrait FRONT] socket status=" + e.status + " → on reste en « Retrait en cours... »");
      }
      // pending : on reste en "processing".
    };

    registerWithdrawalHandler(onVerdict);
    return () => unregisterWithdrawalHandler(onVerdict);
  }, [registerWithdrawalHandler, unregisterWithdrawalHandler]);

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
    resetWithdraw,
    handleWithdrawConfirm,
  };
};
