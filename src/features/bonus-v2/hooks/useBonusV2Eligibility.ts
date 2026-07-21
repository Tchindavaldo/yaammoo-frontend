// ============================================================================
// Moteur d'éligibilité — dérive la progression d'un bonus depuis `bonusStats`
// ----------------------------------------------------------------------------
// Source de vérité : LE BACKEND. Il segmente lui-même les commandes payées par
// période (jour / semaine / mois) et expose le résultat dans `bonus.bonusStats`.
// On ne recalcule RIEN localement : un cumul fait depuis OrderContext ignorerait
// la période du critère et produirait une éligibilité fausse.
// Pas de stats backend → { measurable: false } : le bonus reste consultable,
// mais on n'invente ni progression ni bouton "Réclamer".
// ============================================================================
import { useMemo } from "react";
import type { Bonus, BonusProgress } from "../types/bonus.types";

/** Statuts d'une commande considérée comme payée. */
export const PAID_STATUSES = ["pending", "finished", "delivering", "delivered"];

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Progression non mesurable : bonus affiché, mais aucune assertion chiffrée. */
const UNMEASURABLE: BonusProgress = {
  measurable: false,
  eligible: false,
  current: 0,
  target: 0,
  remaining: 0,
  progress: 0,
  unit: "",
};

/** Assemble une progression à partir du compteur backend et du palier visé. */
const build = (
  current: number,
  target: number,
  unit: string,
): BonusProgress => ({
  measurable: true,
  eligible: target > 0 && current >= target,
  current,
  target,
  remaining: Math.max(0, target - current),
  progress: target > 0 ? clamp01(current / target) : 0,
  unit,
});

/**
 * Calcul pur (testable, réutilisable hors React) de la progression d'un bonus.
 * Un critère inconnu ou des stats manquantes → { measurable: false }.
 */
export const computeEligibility = (bonus: Bonus): BonusProgress => {
  const { kind, target = 0, period } = bonus.criteria || ({} as any);

  // Bonus de bienvenue : toujours éligible, aucun compteur requis.
  if (kind === "welcome") {
    return {
      measurable: true,
      eligible: true,
      current: 1,
      target: 1,
      remaining: 0,
      progress: 1,
      unit: "",
    };
  }

  const stats = period ? bonus.bonusStats?.[period] : undefined;
  if (!stats) return UNMEASURABLE;

  switch (kind) {
    case "order_count":
      return build(stats.count, target, "commande");
    case "amount_spent":
      return build(stats.amount, target, "FCFA");
    default:
      return UNMEASURABLE;
  }
};

/** Progression d'un seul bonus. */
export const useBonusV2Eligibility = (bonus: Bonus): BonusProgress =>
  useMemo(() => computeEligibility(bonus), [bonus]);

/** Progression d'un lot de bonus (Map par id) — pour la vue roadmap. */
export const useBonusV2EligibilityMap = (
  bonuses: Bonus[],
): Record<string, BonusProgress> =>
  useMemo(() => {
    const map: Record<string, BonusProgress> = {};
    for (const b of bonuses) map[b.id] = computeEligibility(b);
    return map;
  }, [bonuses]);
