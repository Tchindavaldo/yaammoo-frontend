"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import { useState, useCallback, useEffect, useRef } from "react";
import { useAuth } from "../../auth/context/AuthContext";
import { withdrawService, WithdrawQuote, PayoutNumbers } from "../services/withdrawService";
import { WalletBalances, WalletNetwork, balanceKey, formatFcfa, networkLabel } from "../services/walletNetwork";
import {
  useMerchantWallet,
  WithdrawalEvent,
} from "../context/MerchantWalletContext";
import { t, useLanguage } from "@/src/i18n";

/**
 * Etats de la feuille de retrait (`WithdrawSheet`).
 * - `source`  : etape 1, solde debite (MTN / Orange) ;
 * - `receive` : etape 2, numero de reception (celui de la boutique) + montant ;
 * - `recap`   : etape 3, recapitulatif et bouton « Retirer » ;
 * - `waiting` / `processing` : requete en vol puis retrait en cours (cache
 *   pose sur la feuille) ;
 * - `completed` : verdict socket, message de reussite dans la feuille.
 */
export type WithdrawState =
  | "idle"
  | "source"
  | "receive"
  | "recap"
  | "waiting"
  | "processing"
  | "completed";

/**
 * Logique de RETRAIT marchand.
 *
 * Les numeros de reception ne se saisissent plus : ce sont ceux des
 * informations de la boutique (OM = `number`, MoMo = `momoNumber`). Les frais
 * viennent du devis backend (`/wallet/withdraw/quote`), jamais d'un calcul
 * local (money-rules §8). Aucun repli automatique sur l'autre solde.
 */
export const useWithdraw = (balances: WalletBalances) => {
  useLanguage();
  const { userData } = useAuth();
  const { registerWithdrawalHandler, unregisterWithdrawalHandler } =
    useMerchantWallet();

  const [withdrawState, setWithdrawState] = useState<WithdrawState>("idle");
  const [sourceNetwork, setSourceNetwork] = useState<WalletNetwork | null>(null);
  const [targetNetwork, setTargetNetwork] = useState<WalletNetwork | null>(null);
  /** Especes voulues, chiffres seuls. */
  const [amount, setAmount] = useState("");
  const [numbers, setNumbers] = useState<PayoutNumbers>({});
  const [numbersLoading, setNumbersLoading] = useState(false);
  const [quote, setQuote] = useState<WithdrawQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  // Id du retrait en cours, pour ne reagir qu'a SON verdict socket.
  const currentWithdrawalId = useRef<string | null>(null);
  // Etat courant lu par le handler socket (enregistre une seule fois).
  const stateRef = useRef<WithdrawState>(withdrawState);
  stateRef.current = withdrawState;

  const fastFoodId = userData?.fastFoodId;

  /** Numeros de la boutique, relus a chaque ouverture (ils changent dans « Infos »). */
  const loadNumbers = useCallback(async () => {
    if (!fastFoodId) return;
    setNumbersLoading(true);
    try {
      setNumbers(await withdrawService.getPayoutNumbers(fastFoodId));
    } catch (error: any) {
      setWithdrawError(error?.response?.data?.message || t("Numéros de la boutique indisponibles"));
    } finally {
      setNumbersLoading(false);
    }
  }, [fastFoodId]);

  const openWithdraw = useCallback(() => {
    setWithdrawError(null);
    setWithdrawState("source");
    loadNumbers();
  }, [loadNumbers]);

  const resetWithdraw = useCallback(() => {
    setWithdrawState("idle");
    setWithdrawError(null);
    setAmount("");
    setSourceNetwork(null);
    setTargetNetwork(null);
    setQuote(null);
    setQuoteLoading(false);
    currentWithdrawalId.current = null;
  }, []);

  /** Etape 1 → 2. Le numero du meme reseau (gratuit) est propose s'il existe. */
  const goReceive = useCallback(() => {
    if (!sourceNetwork) {
      setWithdrawError(t("Choisissez le solde à débiter"));
      return;
    }
    setTargetNetwork((prev) =>
      prev && numbers[prev] ? prev : numbers[sourceNetwork] ? sourceNetwork : null,
    );
    setWithdrawState("receive");
  }, [sourceNetwork, numbers]);

  /** Etape 2 → 3 : controles, puis devis du backend (les frais en font foi). */
  const goRecap = useCallback(async () => {
    if (quoteLoading || !sourceNetwork) return;
    if (!targetNetwork) {
      setWithdrawError(t("Choisissez le numéro de réception"));
      return;
    }
    if (!numbers[targetNetwork]) {
      setWithdrawError(t("Ajoutez ce numéro dans les informations de la boutique"));
      return;
    }
    const cash = Number(amount);
    if (!cash || cash <= 0 || !Number.isInteger(cash)) {
      setWithdrawError(t("Veuillez saisir un montant valide"));
      return;
    }
    const available = balances[balanceKey(sourceNetwork)];
    if (cash > available) {
      setWithdrawError(t("Solde {{a}} insuffisant : {{b}} disponibles.", { a: networkLabel(sourceNetwork), b: formatFcfa(available) }));
      return;
    }
    setQuoteLoading(true);
    try {
      const q = await withdrawService.quote({ amount: cash, network: targetNetwork, sourceNetwork });
      if (!q.sufficient) {
        setWithdrawError(t("Solde {{a}} insuffisant avec les frais : {{b}} nécessaires, {{c}} disponibles.", { a: networkLabel(sourceNetwork), b: formatFcfa(q.totalDebited), c: formatFcfa(q.sourceBalance) }));
        return;
      }
      setQuote(q);
      setWithdrawState("recap");
    } catch (error: any) {
      setWithdrawError(error?.response?.data?.message || t("Frais de retrait indisponibles"));
    } finally {
      setQuoteLoading(false);
    }
  }, [quoteLoading, sourceNetwork, targetNetwork, numbers, amount, balances]);

  /** Retour d'une etape. */
  const goBack = useCallback(() => {
    setWithdrawState((s) => (s === "recap" ? "receive" : s === "receive" ? "source" : s));
  }, []);

  /** Lance le retrait : POST puis « en cours » des la reponse, verdict par socket. */
  const confirmWithdraw = useCallback(async () => {
    if (!userData || !sourceNetwork || !targetNetwork || !quote) return;
    const local = numbers[targetNetwork];
    if (!local) {
      setWithdrawError(t("Ajoutez ce numéro dans les informations de la boutique"));
      return;
    }
    setWithdrawError(null);
    setWithdrawState("waiting");
    try {
      const res = await withdrawService.withdraw({
        amount: quote.amount,
        phone: `237${local}`,
        network: targetNetwork,
        sourceNetwork,
        receiverName: userData?.infos?.email || "user@yaammoo.com",
      });
      if (res?.success === false) {
        setWithdrawError(res?.message || t("Échec du retrait"));
        setWithdrawState("recap");
        return;
      }
      const data = res?.data ?? res;
      currentWithdrawalId.current = data?.withdrawal?.id ?? data?.withdrawalId ?? null;
      console.log(`[Retrait] demande acceptée (withdrawalId=${currentWithdrawalId.current}) → en cours`);
      setWithdrawState("processing");
    } catch (error: any) {
      const body = error.response?.data;
      const message = body?.message || body?.error || error.message || t("Échec du retrait");
      console.log(`[Retrait] ❌ refus : ${message}`);
      setWithdrawError(message);
      setWithdrawState("recap");
    }
  }, [userData, sourceNetwork, targetNetwork, quote, numbers]);

  // Verdict socket : ne reagit qu'au retrait en cours (meme withdrawalId).
  useEffect(() => {
    const onVerdict = (e: WithdrawalEvent) => {
      if (
        currentWithdrawalId.current &&
        e.withdrawalId &&
        e.withdrawalId !== currentWithdrawalId.current
      ) {
        return; // verdict d'un autre retrait
      }
      const s = stateRef.current;
      if (s !== "waiting" && s !== "processing") return;
      if (e.status === "completed") {
        setWithdrawState("completed");
      } else if (e.status === "failed") {
        setWithdrawError(e.message || t("Retrait échoué"));
        setWithdrawState("recap");
      }
      // pending : on reste « en cours ».
    };

    registerWithdrawalHandler(onVerdict);
    return () => unregisterWithdrawalHandler(onVerdict);
  }, [registerWithdrawalHandler, unregisterWithdrawalHandler]);

  return {
    withdrawState,
    sourceNetwork,
    setSourceNetwork,
    targetNetwork,
    setTargetNetwork,
    amount,
    setAmount,
    numbers,
    numbersLoading,
    quote,
    quoteLoading,
    withdrawError,
    setWithdrawError,
    openWithdraw,
    resetWithdraw,
    goReceive,
    goRecap,
    goBack,
    confirmWithdraw,
  };
};
