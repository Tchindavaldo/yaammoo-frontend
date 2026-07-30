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
import { useEffect, useMemo, useState } from "react";
import type { Bonus, BonusProgress } from "../types/bonus.types";

/** Statuts d'une commande considérée comme payée. */
export const PAID_STATUSES = ["pending", "finished", "delivering", "delivered"];

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * Avancée de l'heure courante dans la journée, ramenée sur 24 h (0 → 1).
 * Minuit = 0 %, midi = 50 %, 23 h 59 ≈ 100 %.
 */
export const dayProgress = (now: Date = new Date()): number =>
  (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86400;

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

  // Publication d'un statut : aucun palier à atteindre (`target: null`) et aucun
  // compteur backend. La progression n'est PAS un avancement vers l'éligibilité,
  // c'est l'avancée de l'heure courante dans la journée de 24 h — la barre se
  // remplit toute seule et repart à zéro à minuit. Le bonus est éligible dès
  // qu'il est actif : c'est au user de poster son flyer quand il veut.
  if (kind === "status_view") {
    return {
      measurable: true,
      eligible: true,
      current: 0,
      target: 0,
      remaining: 0,
      progress: dayProgress(),
      unit: "",
    };
  }

  const stats = period ? bonus.bonusStats?.[period] : undefined;
  if (!stats) return UNMEASURABLE;

  // `target` peut valoir null (critère sans palier) : le défaut de la
  // destructuration ne couvre que `undefined`.
  const goal = target ?? 0;

  switch (kind) {
    case "order_count":
      return build(stats.count, goal, "commande");
    case "amount_spent":
      return build(stats.amount, goal, "FCFA");
    default:
      return UNMEASURABLE;
  }
};

/**
 * Cadence de rafraîchissement de la barre horaire : 1 min suffit largement
 * (1/1440e de la barre) et reste indolore côté rendu.
 */
const DAY_TICK_MS = 60_000;

/**
 * Re-render périodique, monté UNIQUEMENT pour les critères dont la progression
 * dépend de l'heure courante (`status_view`). Les autres critères ne posent
 * aucun timer : leur progression ne bouge qu'avec les données backend.
 */
const useDayTick = (enabled: boolean): number => {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setTick((t) => t + 1), DAY_TICK_MS);
    return () => clearInterval(id);
  }, [enabled]);
  return enabled ? tick : 0;
};

/** Progression d'un seul bonus. */
export const useBonusEligibility = (bonus: Bonus): BonusProgress => {
  const tick = useDayTick(bonus.criteria?.kind === "status_view");
  // `tick` fait volontairement partie des deps : c'est lui qui rejoue le calcul
  // horaire à chaque minute (l'objet `bonus`, lui, n'a pas changé).
  return useMemo(() => computeEligibility(bonus), [bonus, tick]);
};

/** Progression d'un lot de bonus (Map par id) — pour la vue roadmap. */
export const useBonusEligibilityMap = (
  bonuses: Bonus[],
): Record<string, BonusProgress> =>
  useMemo(() => {
    const map: Record<string, BonusProgress> = {};
    for (const b of bonuses) map[b.id] = computeEligibility(b);
    return map;
  }, [bonuses]);
