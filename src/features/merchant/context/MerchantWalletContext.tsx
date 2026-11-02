import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  walletStatsService,
  WalletStats,
  WalletDayStat,
} from "../services/walletStatsService";
import { useAuth } from "../../auth/context/AuthContext";
import { useResetOnUserChange } from "@/src/hooks/useResetOnUserChange";
import { useLazyFetch } from "@/src/hooks/useLazyFetch";
import moment from "moment";
import {
  WalletBalances,
  WalletNetwork,
  WalletBreakdown,
  balanceKey,
} from "../services/walletNetwork";
import { useLanguage } from "@/src/i18n";

/** Payload normalisé d'un event wallet (wallet.credited / wallet.withdrawal). */
export interface WalletEvent {
  type: "credit" | "debit"; // credit = payin, debit = payout
  amount: number;
  date?: string; // ISO (createdAt) ; défaut = maintenant
  /** Solde absolu après l'opération, si le backend le fournit (retrait). */
  newBalance?: number;
  /** Soldes absolus par réseau après l'opération (retrait). */
  newBalances?: WalletBalances;
  /** Réseau du solde touché (gain). */
  network?: WalletNetwork;
  /** Part du gain réservée aux frais de retrait (gain). */
  kioskFee?: number;
  /** Découpage absolu après l'opération (retrait). */
  newBreakdown?: WalletBreakdown;
}

/** Event socket `wallet.withdrawal` (les 3 états d'un retrait, même withdrawalId). */
export interface WithdrawalEvent {
  withdrawalId: string;
  status: "pending" | "completed" | "failed";
  amount: number; // espèces touchées chez l'agent
  kioskFee?: number; // frais kiosque, envoyés en plus au téléphone
  fee?: number; // frais interréseau, débités en plus
  newBreakdown?: WalletBreakdown; // découpage absolu (sur completed)
  newBalance?: number; // solde absolu après l'opération (sur completed)
  newBalances?: WalletBalances; // soldes absolus par réseau (sur completed)
  reason?: string; // statut brut sur failed (failed/cancelled)
  message?: string; // message exact MobileWallet à afficher sur failed
  createdAt?: string;
  __eventId?: number;
}

interface MerchantWalletContextType {
  stats: WalletStats | null;
  loading: boolean;
  /** Renvoie `false` en cas d'echec (voir `useLazyFetch`). */
  refresh: (showLoading?: boolean) => Promise<void | boolean>;
  /** Declenche le premier chargement. A appeler au montage de l'ecran. */
  ensureLoaded: () => void;
  /** `false` tant que la donnee n'a jamais ete chargee. */
  loaded: boolean;
  /** Patch local du store à partir d'un event de gain (wallet.credited). */
  applyEvent: (e: WalletEvent) => void;
  /** Traite un event de retrait : patche le solde + notifie l'UI en cours. */
  handleWithdrawalEvent: (e: WithdrawalEvent) => void;
  /** Abonnement de l'overlay de retrait au verdict socket. */
  registerWithdrawalHandler: (h: (e: WithdrawalEvent) => void) => void;
  unregisterWithdrawalHandler: (h: (e: WithdrawalEvent) => void) => void;
}

const MerchantWalletContext = createContext<MerchantWalletContextType | undefined>(
  undefined,
);

export const MerchantWalletProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  useLanguage();
  const { userData } = useAuth();
  const [stats, setStats] = useState<WalletStats | null>(null);
  const [loading, setLoading] = useState(false);

  // showLoading=false → refresh silencieux (n'active PAS le loader pull-to-refresh).
  // Utilisé quand un event socket arrive alors que stats===null : on rattrape la
  // donnée sans faire clignoter le loader natif de la liste.
  const refresh = useCallback(async (showLoading = true) => {
    // Rien n'a ete charge : `false` pour que la demande reste rearmee.
    if (!userData) return false;
    if (showLoading) setLoading(true);
    try {
      const data = await walletStatsService.getStats("month");
      setStats(data);
      return true;
    } catch (err) {
      console.error("Wallet stats error:", err);
      // `false` rearme `useLazyFetch` : revenir sur l'ecran relancera le
      // chargement au lieu de rester bloque sur l'erreur.
      return false;
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [userData]);

  // Premier chargement DIFFERE : le portefeuille marchand le demande a son
  // ouverture. Un event socket arrivant avant cela est couvert par `applyEvent`,
  // qui refetch en silence quand `stats` est encore null.
  const { ensureLoaded, loaded, reset } = useLazyFetch(refresh, !!userData);

  // Changement de compte : les stats du portefeuille precedent sont vides.
  useResetOnUserChange(userData?.uid, () => {
    setStats(null);
    reset();
  });

  // Patch local : met à jour balance, totals et la ligne du jour concerné.
  const applyEvent = useCallback((e: WalletEvent) => {
    setStats((prev) => {
      // Pas encore chargé → on refetch tout EN SILENCE (sinon l'event serait perdu :
      // ex. un gain reçu alors que les stats n'avaient jamais abouti au boot).
      // refresh(false) = sans loading → n'active pas le loader pull-to-refresh.
      if (!prev) {
        refresh(false);
        return prev;
      }
      const dayKey = moment(e.date ?? undefined).format("YYYY-MM-DD");
      const payin = e.type === "credit" ? e.amount : 0;
      const payout = e.type === "debit" ? e.amount : 0;
      const net = payin - payout;

      // Met à jour (ou crée) la ligne du jour dans series.
      const series: WalletDayStat[] = [...prev.series];
      const idx = series.findIndex((s) => s.period === dayKey);
      if (idx >= 0) {
        const d = series[idx];
        series[idx] = {
          ...d,
          payin: d.payin + payin,
          payout: d.payout + payout,
          net: d.net + net,
          count: d.count + 1,
        };
      } else {
        series.unshift({ period: dayKey, payin, payout, net, count: 1 });
        // Garde l'ordre décroissant par date.
        series.sort((a, b) => (a.period < b.period ? 1 : -1));
      }

      // Soldes par réseau : absolus si fournis (retrait), sinon delta sur le
      // réseau crédité. Sans réseau connu, on garde l'existant.
      let balances = prev.balances;
      if (e.newBalances) {
        balances = e.newBalances;
      } else if (balances && e.network && e.type === "credit") {
        const k = balanceKey(e.network);
        balances = { ...balances, [k]: balances[k] + e.amount };
      }
      // Découpage commandes / frais : absolu (retrait) ou delta (gain).
      let breakdown = prev.breakdown;
      if (e.newBreakdown) {
        breakdown = e.newBreakdown;
      } else if (breakdown && e.network && e.type === "credit") {
        const k = balanceKey(e.network);
        const fees = Math.min(e.amount, Math.max(0, e.kioskFee ?? 0));
        const p = breakdown[k];
        breakdown = {
          ...breakdown,
          [k]: { orders: p.orders + e.amount - fees, fees: p.fees + fees, total: p.total + e.amount },
        };
      }

      return {
        ...prev,
        // newBalance (solde absolu fourni par le backend) prioritaire sinon delta.
        balance: e.newBalance ?? prev.balance + net,
        balances,
        breakdown,
        totals: {
          payin: prev.totals.payin + payin,
          payout: prev.totals.payout + payout,
          net: prev.totals.net + net,
        },
        series,
      };
    });
  }, [refresh]);

  // Handlers UI abonnés au verdict de retrait (overlay en cours).
  const withdrawalHandlers = useRef<Set<(e: WithdrawalEvent) => void>>(new Set());

  const registerWithdrawalHandler = useCallback((h: (e: WithdrawalEvent) => void) => {
    withdrawalHandlers.current.add(h);
  }, []);
  const unregisterWithdrawalHandler = useCallback((h: (e: WithdrawalEvent) => void) => {
    withdrawalHandlers.current.delete(h);
  }, []);

  // Traite l'event de retrait : patche le solde (sur completed) puis notifie l'UI.
  const handleWithdrawalEvent = useCallback(
    (e: WithdrawalEvent) => {
      if (e.status === "completed") {
        // Débit réel = montant reçu + frais interréseau.
        applyEvent({
          type: "debit",
          amount: e.amount + (e.kioskFee ?? 0) + (e.fee ?? 0),
          date: e.createdAt,
          newBalance: e.newBalance,
          newBalances: e.newBalances,
          newBreakdown: e.newBreakdown,
        });
      }
      // failed/pending : pas de modif du solde (le backend ne débite qu'au completed).
      withdrawalHandlers.current.forEach((h) => h(e));
    },
    [applyEvent],
  );

  return (
    <MerchantWalletContext.Provider
      value={{
        stats,
        loading,
        refresh,
        ensureLoaded,
        loaded,
        applyEvent,
        handleWithdrawalEvent,
        registerWithdrawalHandler,
        unregisterWithdrawalHandler,
      }}
    >
      {children}
    </MerchantWalletContext.Provider>
  );
};

export const useMerchantWallet = () => {
  const ctx = useContext(MerchantWalletContext);
  if (ctx === undefined) {
    throw new Error("useMerchantWallet must be used within a MerchantWalletProvider");
  }
  return ctx;
};
