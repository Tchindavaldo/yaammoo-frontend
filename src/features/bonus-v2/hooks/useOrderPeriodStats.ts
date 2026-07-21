// ============================================================================
// useOrderPeriodStats — statistiques de commandes par période (jour/semaine/mois)
// ----------------------------------------------------------------------------
// Alimente le panneau de stats en haut de l'écran Bonus. Ne compte que les
// commandes PAYÉES (PAID_STATUSES), datées via `createdAt`.
// ============================================================================
import { useMemo } from "react";
import { Commande } from "@/src/types";
import { useOrders } from "@/src/features/orders/hooks/useOrders";
import { PAID_STATUSES } from "./useBonusV2Eligibility";

export interface PeriodStat {
  count: number;
  amount: number;
}

export interface OrderPeriodStats {
  day: PeriodStat;
  week: PeriodStat;
  month: PeriodStat;
}

/** Début du jour courant (00:00 locale). */
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Début de la semaine courante (lundi 00:00 locale). */
const startOfWeek = () => {
  const d = startOfToday();
  const day = (d.getDay() + 6) % 7; // 0 = lundi
  d.setDate(d.getDate() - day);
  return d;
};

/** Début du mois courant (1er 00:00 locale). */
const startOfMonth = () => {
  const d = startOfToday();
  d.setDate(1);
  return d;
};

const isPaid = (o: Commande) =>
  PAID_STATUSES.includes((o.status || "").toLowerCase());

const accumulate = (orders: Commande[], since: Date): PeriodStat => {
  let count = 0;
  let amount = 0;
  for (const o of orders) {
    const raw = o.createdAt ? new Date(o.createdAt) : null;
    if (raw && !isNaN(raw.getTime()) && raw >= since) {
      count += 1;
      amount += o.total || 0;
    }
  }
  return { count, amount };
};

/** Stats de commandes payées agrégées sur jour / semaine / mois. */
export const useOrderPeriodStats = (): OrderPeriodStats => {
  const { orders } = useOrders();
  return useMemo(() => {
    const paid = orders.filter(isPaid);
    return {
      day: accumulate(paid, startOfToday()),
      week: accumulate(paid, startOfWeek()),
      month: accumulate(paid, startOfMonth()),
    };
  }, [orders]);
};
