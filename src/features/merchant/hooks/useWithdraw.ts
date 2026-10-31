import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "../../auth/context/AuthContext";
import { withdrawService, WithdrawQuote } from "../services/withdrawService";
import { WalletNetwork } from "../services/walletNetwork";
import {
  useMerchantWallet,
  WithdrawalEvent,
} from "../context/MerchantWalletContext";

export type WithdrawState =
  | "idle"
  | "source_select" // choix du solde débité (MTN / Orange)
  | "amount_input"
  | "input"         // numéro de réception + détection du réseau + frais
  | "waiting"       // requête en vol → "Veuillez patienter…"
  | "processing"    // réponse reçue (pending) → "Retrait en cours"
  | "completed"     // socket completed → "Retrait effectué" (+ délai 24h)
  | "failed";

/** Chiffres minimum avant de demander l'opérateur (numéro camerounais : 9). */
const PREDICT_MIN_DIGITS = 9;
/** Attente après la dernière frappe avant la détection. */
const PREDICT_DEBOUNCE_MS = 450;

const digitsOf = (phone: string) => phone.replace(/\D/g, "").replace(/^237/, "");

/**
 * Logique de RETRAIT marchand / livreur.
 * Flux : solde débité → montant → numéro (réseau détecté en temps réel, frais
 * interréseau affichés) → POST /wallet/withdraw → "en cours" → verdict socket
 * wallet.withdrawal (completed/failed).
 *
 * Aucun repli automatique : l'utilisateur choisit le solde ET le numéro.
 */
// DEBUG : mettre à `true` pour afficher d'emblée l'overlay à l'état "completed"
// (le message « Retrait réussi… 24h ») sans avoir à refaire un retrait.
// ⚠️ Remettre à `false` avant de clore.
export const DEBUG_COMPLETED = false;

export const useWithdraw = () => {
  const { userData } = useAuth();
  const { registerWithdrawalHandler, unregisterWithdrawalHandler } =
    useMerchantWallet();

  const [withdrawPhone, setWithdrawPhone] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [sourceNetwork, setSourceNetwork] = useState<WalletNetwork | null>(null);
  const [detectedNetwork, setDetectedNetwork] = useState<WalletNetwork | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState<string | null>(null);
  const [quote, setQuote] = useState<WithdrawQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [withdrawState, setWithdrawState] = useState<WithdrawState>(
    DEBUG_COMPLETED ? "completed" : "idle",
  );
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  // Id du retrait en cours, pour ne réagir qu'à SON verdict socket.
  const currentWithdrawalId = useRef<string | null>(null);
  // Jetons anti-réponse périmée (frappe rapide : seule la dernière compte).
  const predictSeq = useRef(0);
  const quoteSeq = useRef(0);

  const resetWithdraw = useCallback(() => {
    setWithdrawState("idle");
    setWithdrawError(null);
    setWithdrawAmount("");
    setWithdrawPhone("");
    setSourceNetwork(null);
    setDetectedNetwork(null);
    setDetectError(null);
    setQuote(null);
    currentWithdrawalId.current = null;
  }, []);

  // ── Détection du réseau à la saisie du numéro ──────────────────────────
  useEffect(() => {
    if (withdrawState !== "input") return;
    const digits = digitsOf(withdrawPhone);
    setDetectedNetwork(null);
    setDetectError(null);
    if (digits.length < PREDICT_MIN_DIGITS) {
      setDetecting(false);
      return;
    }
    const seq = ++predictSeq.current;
    setDetecting(true);
    const timer = setTimeout(async () => {
      try {
        const res = await withdrawService.predictOperator(digits);
        if (seq !== predictSeq.current) return;
        setDetectedNetwork(res?.network ?? null);
      } catch (error: any) {
        if (seq !== predictSeq.current) return;
        setDetectError(error?.response?.data?.message || "Opérateur non reconnu");
      } finally {
        if (seq === predictSeq.current) setDetecting(false);
      }
    }, PREDICT_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [withdrawPhone, withdrawState]);

  // ── Frais : seulement en interréseau ───────────────────────────────────
  useEffect(() => {
    const amount = Number(withdrawAmount);
    if (!detectedNetwork || !sourceNetwork || !amount || detectedNetwork === sourceNetwork) {
      setQuote(null);
      setQuoteLoading(false);
      return;
    }
    const seq = ++quoteSeq.current;
    setQuoteLoading(true);
    withdrawService
      .quote({ amount, network: detectedNetwork, sourceNetwork })
      .then((q) => {
        if (seq === quoteSeq.current) setQuote(q);
      })
      .catch((error: any) => {
        if (seq !== quoteSeq.current) return;
        setQuote(null);
        setWithdrawError(error?.response?.data?.message || "Frais de retrait indisponibles");
      })
      .finally(() => {
        if (seq === quoteSeq.current) setQuoteLoading(false);
      });
  }, [detectedNetwork, sourceNetwork, withdrawAmount]);

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
      if (!sourceNetwork) {
        setWithdrawError("Choisissez le solde à débiter");
        return;
      }
      if (!detectedNetwork) {
        setWithdrawError(detectError || "Réseau du numéro non détecté");
        return;
      }
      setWithdrawError(null);
      setWithdrawPhone(phone);
      setWithdrawState("waiting"); // "Veuillez patienter…"

      try {
        const res = await withdrawService.withdraw({
          amount,
          phone: phone.replace(/\s/g, ""),
          network: detectedNetwork,
          sourceNetwork,
          receiverName: userData?.infos?.email || "user@yaammoo.com",
        });

        const data = res?.data ?? res;
        if (res?.success === false) {
          setWithdrawError(res?.message || "Échec du retrait");
          setWithdrawState("input");
          return;
        }
        // Réponse OK → on connaît le withdrawalId, on passe en "en cours".
        currentWithdrawalId.current = data?.withdrawal?.id ?? data?.withdrawalId ?? null;
        console.log(`[Retrait] demande acceptée (withdrawalId=${currentWithdrawalId.current}) → en cours`);
        setWithdrawState("processing");
      } catch (error: any) {
        const body = error.response?.data;
        const message = body?.message || body?.error || error.message || "Échec du retrait";
        console.log(`[Retrait] ❌ refus : ${message}`);
        setWithdrawError(message);
        setWithdrawState("input");
      }
    },
    [userData, withdrawAmount, sourceNetwork, detectedNetwork, detectError],
  );

  // Verdict socket : ne réagit qu'au retrait en cours (même withdrawalId).
  useEffect(() => {
    const onVerdict = (e: WithdrawalEvent) => {
      if (
        currentWithdrawalId.current &&
        e.withdrawalId &&
        e.withdrawalId !== currentWithdrawalId.current
      ) {
        return; // verdict d'un autre retrait
      }
      if (e.status === "completed") {
        setWithdrawState("completed");
      } else if (e.status === "failed") {
        setWithdrawError(e.reason || "Retrait échoué");
        setWithdrawState("idle");
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
    sourceNetwork,
    setSourceNetwork,
    detectedNetwork,
    detecting,
    detectError,
    quote,
    quoteLoading,
    withdrawState,
    setWithdrawState,
    withdrawError,
    setWithdrawError,
    resetWithdraw,
    handleWithdrawConfirm,
  };
};
