// ============================================================================
// Moteur d'éligibilité — calcule la progression d'un bonus depuis les commandes
// ----------------------------------------------------------------------------
// Source de vérité : OrderContext (useOrders). Une commande "compte" dès
// qu'elle est PAYÉE, c.-à-d. dès le statut `pending` et au-delà (finished,
// delivering, delivered). On exclut le panier (pendingToBuy) et les annulations.
// ============================================================================
import { useMemo } from "react";
import { Commande } from "@/src/types";
import { useOrders } from "@/src/features/orders/hooks/useOrders";
import type { Bonus, BonusProgress } from "../types/bonus.types";

/** Statuts d'une commande considérée comme payée (compte pour l'éligibilité). */
export const PAID_STATUSES = ["pending", "finished", "delivering", "delivered"];

const isPaid = (o: Commande) =>
  PAID_STATUSES.includes((o.status || "").toLowerCase());

/** Filtre les commandes payées, optionnellement restreintes à un fastfood. */
const paidOrders = (orders: Commande[], fastFoodId?: string) => {
  const paid = orders.filter(isPaid);
  return fastFoodId ? paid.filter((o) => o.fastFoodId === fastFoodId) : paid;
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * Calcul pur (testable, réutilisable hors React) de la progression d'un bonus.
 * Un critère inconnu → { measurable: false } (le bonus reste consultable).
 */
export const computeEligibility = (
  bonus: Bonus,
  orders: Commande[],
): BonusProgress => {
  const { kind, target = 0, fastFoodId } = bonus.criteria || ({} as any);

  switch (kind) {
    case "welcome":
      // Bonus de bienvenue : toujours éligible.
      return {
        measurable: true,
        eligible: true,
        current: 1,
        target: 1,
        remaining: 0,
        progress: 1,
        unit: "",
      };

    case "order_count": {
      const current = paidOrders(orders, fastFoodId).length;
      const eligible = target > 0 && current >= target;
      return {
        measurable: true,
        eligible,
        current,
        target,
        remaining: Math.max(0, target - current),
        progress: target > 0 ? clamp01(current / target) : 0,
        unit: "commande",
      };
    }

    case "amount_spent": {
      const current = paidOrders(orders, fastFoodId).reduce(
        (sum, o) => sum + (o.total || 0),
        0,
      );
      const eligible = target > 0 && current >= target;
      return {
        measurable: true,
        eligible,
        current,
        target,
        remaining: Math.max(0, target - current),
        progress: target > 0 ? clamp01(current / target) : 0,
        unit: "FCFA",
      };
    }

    default:
      // Critère non reconnu : bonus affiché mais non mesurable (consultation).
      return {
        measurable: false,
        eligible: false,
        current: 0,
        target: 0,
        remaining: 0,
        progress: 0,
        unit: "",
      };
  }
};

/** Progression d'un seul bonus, recalculée en direct au fil des commandes. */
export const useBonusEligibility = (bonus: Bonus): BonusProgress => {
  const { orders } = useOrders();
  return useMemo(() => computeEligibility(bonus, orders), [bonus, orders]);
};

/** Progression d'un lot de bonus (Map par id) — pour la vue roadmap. */
export const useBonusEligibilityMap = (
  bonuses: Bonus[],
): Record<string, BonusProgress> => {
  const { orders } = useOrders();
  return useMemo(() => {
    const map: Record<string, BonusProgress> = {};
    for (const b of bonuses) map[b.id] = computeEligibility(b, orders);
    return map;
  }, [bonuses, orders]);
};
