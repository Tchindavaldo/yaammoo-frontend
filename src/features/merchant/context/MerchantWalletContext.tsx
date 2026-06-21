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
import moment from "moment";

/** Payload normalisé d'un event wallet (wallet.credited / wallet.withdrawal). */
export interface WalletEvent {
  type: "credit" | "debit"; // credit = payin, debit = payout
  amount: number;
  date?: string; // ISO (createdAt) ; défaut = maintenant
  /** Solde absolu après l'opération, si le backend le fournit (retrait). */
  newBalance?: number;
}

/** Event socket `wallet.withdrawal` (les 3 états d'un retrait, même withdrawalId). */
export interface WithdrawalEvent {
  withdrawalId: string;
  status: "pending" | "completed" | "failed";
  amount: number;
  newBalance?: number; // solde absolu après l'opération (sur completed)
  reason?: string; // cause sur failed
  createdAt?: string;
  __eventId?: number;
}

interface MerchantWalletContextType {
  stats: WalletStats | null;
  loading: boolean;
  refresh: () => Promise<void>;
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
  const { userData } = useAuth();
  const [stats, setStats] = useState<WalletStats | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userData) return;
    setLoading(true);
    try {
      const data = await walletStatsService.getStats("month");
      setStats(data);
    } catch (err) {
      console.error("Wallet stats error:", err);
    } finally {
      setLoading(false);
    }
  }, [userData]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Patch local : met à jour balance, totals et la ligne du jour concerné.
  const applyEvent = useCallback((e: WalletEvent) => {
    setStats((prev) => {
      // Pas encore chargé → on refetch tout (sinon l'event serait perdu : ex. un
      // gain reçu alors que les stats n'avaient jamais abouti au boot).
      if (!prev) {
        refresh();
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

      return {
        ...prev,
        // newBalance (solde absolu fourni par le backend) prioritaire sinon delta.
        balance: e.newBalance ?? prev.balance + net,
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
        applyEvent({
          type: "debit",
          amount: e.amount,
          date: e.createdAt,
          newBalance: e.newBalance,
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
