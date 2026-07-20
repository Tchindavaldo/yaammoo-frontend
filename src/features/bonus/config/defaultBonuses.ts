// ============================================================================
// Bonus par défaut (mock) — pour visualiser l'interface sans backend peuplé
// ----------------------------------------------------------------------------
// Utilisés en fallback quand `GET /bonus/all` renvoie une liste vide ou échoue
// (voir useBonus.ts). Couvrent les états possibles d'un bonus :
//   • INACTIF     — le fastfood n'a pas activé l'offre
//   • NON ÉLIGIBLE — critères non remplis
//   • ÉLIGIBLE    — critères remplis, user peut réclamer
//   • EN ATTENTE  — demande soumise (pending)
//   • VALIDÉ      — approuvé, code disponible (approved)
//   • UTILISÉ     — code déjà utilisé/expiré (redeemed)
// Chaque bonus a ses propres stats (bonusStats) qui défilent avec lui.
// ⚠️ Données de démo : à retirer / vider une fois de vrais bonus créés.
// ============================================================================
import type { Bonus } from "../types/bonus.types";

/** Passer à false pour désactiver totalement le fallback de démo. */
export const USE_DEFAULT_BONUSES = true;

// ── Dates relatives à "maintenant" ──
// Un bonus n'a PAS de date d'expiration en soi. La seule "fin" existe une fois
// le bonus réclamé : le backend renvoie alors `expiresAt` (= claimedAt +
// claimDuration). On ne renseigne donc `claimedAt`/`expiresAt` que sur les
// états réclamés.
const daysAgo = (days: number) =>
  new Date(Date.now() - days * 86_400_000).toISOString();
const daysFromNow = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString();

const D = { count: 2, amount: 6500 };
const W = { count: 8, amount: 28500 };
const M = { count: 14, amount: 52300 };

const D2 = { count: 0, amount: 0 };
const W2 = { count: 3, amount: 9400 };
const M2 = { count: 7, amount: 22100 };

const D3 = { count: 1, amount: 3200 };
const W3 = { count: 5, amount: 18700 };
const M3 = { count: 11, amount: 41600 };

const D4 = { count: 4, amount: 12500 };
const W4 = { count: 12, amount: 48600 };
const M4 = { count: 32, amount: 124800 };

const D5 = { count: 0, amount: 0 };
const W5 = { count: 2, amount: 5400 };
const M5 = { count: 6, amount: 19800 };

const D6 = { count: 3, amount: 9800 };
const W6 = { count: 9, amount: 32100 };
const M6 = { count: 21, amount: 78500 };

export const DEFAULT_BONUSES: Bonus[] = [
  // ─── 1. INACTIF ───
  {
    id: "mock-inactive",
    createdAt: daysAgo(30),
    type: "free_delivery",
    name: "Livraison offerte",
    description: "Livraison gratuite offerte sur 10 jours.",
    criteria: { kind: "order_count", period: "week", target: 3 },
    fastFoodId: "ff-mama-africa",
    fastFoodName: "Chez Mama Africa",
    active: false,
    claimDuration: 15,
    usageLimit: 1,
    usageCount: 0,
    remainingUses: 1,
    code: null,
    claimedAt: null,
    expiresAt: null,
    expired: false,
    redeemed: false,
    fastFoodBonusCount: 0,
    userClaimedCount: 0,
    totalClaimedCount: 0,
    requestStatus: "none",
    bonusStats: { day: D, week: W, month: M },
  },
  // ─── 2. NON ÉLIGIBLE ───
  {
    id: "mock-not-eligible",
    createdAt: daysAgo(45),
    type: "free_meal",
    name: "Repas gratuit",
    description: "Passe 100 commandes et reçois un repas offert.",
    // Palier volontairement élevé (démo) : reste non-éligible quel que soit
    // le nombre réel de commandes du compte de test.
    criteria: { kind: "order_count", period: "month", target: 100 },
    fastFoodId: "ff-burger-palace",
    fastFoodName: "Burger Palace",
    active: true,
    claimDuration: 20,
    usageLimit: 1,
    usageCount: 0,
    remainingUses: 1,
    code: null,
    claimedAt: null,
    expiresAt: null,
    expired: false,
    redeemed: false,
    fastFoodBonusCount: 4,
    userClaimedCount: 1,
    totalClaimedCount: 89,
    requestStatus: "none",
    bonusStats: { day: D2, week: W2, month: M2 },
  },
  // ─── 3. ÉLIGIBLE (welcome) ───
  {
    id: "mock-eligible",
    createdAt: daysAgo(30),
    type: "discount",
    name: "Bonus de bienvenue",
    description: "1000 FCFA offerts pour ta première commande.",
    criteria: { kind: "welcome" },
    fastFoodId: null,
    fastFoodName: "yaammoo",
    active: true,
    claimDuration: 30,
    usageLimit: 1,
    usageCount: 0,
    remainingUses: 1,
    code: null,
    claimedAt: null,
    expiresAt: null,
    expired: false,
    redeemed: false,
    fastFoodBonusCount: 10,
    userClaimedCount: 0,
    totalClaimedCount: 312,
    requestStatus: "none",
    bonusStats: { day: D3, week: W3, month: M3 },
  },
  // ─── 4. EN ATTENTE ───
  {
    id: "mock-pending",
    createdAt: daysAgo(20),
    type: "discount",
    name: "-20 % fidélité",
    description: "-20 % sur ta commande dès 5 cmd de fidélité.",
    criteria: { kind: "order_count", period: "month", target: 5 },
    fastFoodId: "ff-burger-palace",
    fastFoodName: "Burger Palace",
    active: true,
    claimDuration: 20,
    claimedAt: daysAgo(5),
    expiresAt: daysFromNow(15),
    expired: false,
    usageLimit: 1,
    usageCount: 0,
    remainingUses: 1,
    code: null,
    redeemed: false,
    fastFoodBonusCount: 6,
    userClaimedCount: 2,
    totalClaimedCount: 147,
    requestStatus: "pending",
    bonusStats: { day: D4, week: W4, month: M4 },
  },
  // ─── 5. VALIDÉ (code délivré) ───
  {
    id: "mock-approved",
    createdAt: daysAgo(60),
    type: "netflix",
    name: "1 mois Netflix offert",
    description: "1 mois de Netflix offert dès 50 000 FCFA dépensés sur un mois.",
    criteria: { kind: "amount_spent", period: "month", target: 50000 },
    fastFoodId: null,
    fastFoodName: "yaammoo",
    active: true,
    claimDuration: 30,
    claimedAt: daysAgo(9),
    expiresAt: daysFromNow(21),
    expired: false,
    usageLimit: 3,
    usageCount: 1,
    remainingUses: 2,
    code: "YAM-5PBQRH",
    redeemed: false,
    fastFoodBonusCount: 5,
    userClaimedCount: 3,
    totalClaimedCount: 28,
    requestStatus: "approved",
    bonusStats: { day: D5, week: W5, month: M5 },
  },
  // ─── 6. UTILISÉ (code épuisé) ───
  {
    id: "mock-redeemed",
    createdAt: daysAgo(120),
    type: "free_delivery",
    name: "Livraison offerte",
    description: "Livraison gratuite offerte sur 10 jours.",
    criteria: { kind: "order_count", period: "week", target: 3 },
    fastFoodId: "ff-mama-africa",
    fastFoodName: "Chez Mama Africa",
    active: true,
    claimDuration: 15,
    claimedAt: daysAgo(40),
    expiresAt: daysAgo(25),
    expired: true,
    redeemed: true,
    usageLimit: 3,
    usageCount: 3,
    remainingUses: 0,
    code: "YAM-K2M9XA",
    fastFoodBonusCount: 4,
    userClaimedCount: 1,
    totalClaimedCount: 89,
    requestStatus: "approved",
    bonusStats: { day: D6, week: W6, month: M6 },
  },
];
