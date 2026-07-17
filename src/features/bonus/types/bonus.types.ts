// ============================================================================
// Types du domaine Bonus (côté client)
// ----------------------------------------------------------------------------
// Le backend stocke un bonus sous forme libre : `{ id, ...data, createdAt }`.
// C'est donc le frontend qui fixe la forme canonique ci-dessous, et
// `normalizeBonus()` (voir useBonus.ts) tolère les formes partielles / héritées.
// ============================================================================

/**
 * Nature du critère qui rend un bonus éligible. Évolutif : ajouter une valeur
 * ici + un `case` dans `computeEligibility` suffit, le reste de l'UI ne bouge pas.
 */
export type BonusCriteriaKind = "order_count" | "amount_spent" | "welcome";

export interface BonusCriteria {
  kind: BonusCriteriaKind;
  /** Palier à atteindre : nombre de commandes ou montant cumulé (FCFA). */
  target?: number;
  /** Restreint le calcul aux commandes d'un fastfood précis (fidélité ciblée). */
  fastFoodId?: string;
}

export interface BonusReward {
  /** Valeur numérique de la récompense (montant, pourcentage, nb de mois…). */
  value?: number;
  /** Unité affichée : "FCFA", "%", "mois", "repas"… */
  unit?: string;
  /** Libellé libre si la récompense ne se résume pas à un nombre. */
  label?: string;
}

/**
 * Forme canonique d'un bonus côté client. `type` est une chaîne libre :
 * les types connus (`netflix`, `free_delivery`, `free_meal`, `discount`) ont un
 * descripteur dédié dans le registre, les types futurs tombent sur un rendu par défaut.
 */
export interface Bonus {
  id: string;
  type: string;
  name: string;
  description?: string;
  reward?: BonusReward;
  criteria: BonusCriteria;
  /** true = bonus créé par un fastfood ; false/absent = bonus plateforme yaammoo. */
  isFastFoodBonus?: boolean;
  fastFoodName?: string;
  /** Si false = le fastfood n'a pas encore activé cette offre. */
  active?: boolean;
  /** ISO8601 — date limite de l'offre (au-delà, plus éligible). */
  validUntil?: string;
  createdAt?: string;
  /** Durée de validité du code bonus une fois réclamé (en jours). */
  claimDuration?: number;
  /** ISO8601 — date à laquelle le user a réclamé le bonus. */
  claimedAt?: string;
  /** true = le code a été entièrement consommé (toutes les utilisations faites). */
  redeemed?: boolean;
  /** Nombre total d'utilisations autorisées du code une fois réclamé. */
  usageLimit?: number;
  /** Nombre d'utilisations déjà consommées. Quand il atteint usageLimit → non éligible. */
  usageCount?: number;

  // --- Statistiques fournies par le backend (affichées sur la carte) ---
  /** Nombre total de bonus proposés par ce fastfood. */
  fastFoodBonusCount?: number;
  /** Nombre de fois où CE user a déjà obtenu ce bonus (sur ce fastfood). */
  userClaimedCount?: number;
  /** Nombre de fois où TOUS les users ont obtenu ce bonus (sur ce fastfood). */
  totalClaimedCount?: number;
  /** Statut de la demande côté backend : jamais réclamé / en attente / validé. */
  requestStatus?: BonusRequestStatus;
  /** Stats de commandes propres à ce bonus (fastfood ou plateforme). */
  bonusStats?: {
    day: { count: number; amount: number };
    week: { count: number; amount: number };
    month: { count: number; amount: number };
  };
}

/** Statut de la demande de bonus (validation par le fastfood). */
export type BonusRequestStatus = "none" | "pending" | "approved";

/** Résultat du moteur d'éligibilité pour un bonus donné. */
export interface BonusProgress {
  /** false = critère non mesurable (type inconnu) → consultation seule. */
  measurable: boolean;
  eligible: boolean;
  /** Avancement courant (nb commandes ou montant selon le critère). */
  current: number;
  /** Palier visé. */
  target: number;
  /** Reste à faire avant l'éligibilité (0 si éligible). */
  remaining: number;
  /** Ratio 0→1 pour les barres/anneaux. */
  progress: number;
  /** Unité de la mesure : "commande" | "FCFA". */
  unit: string;
}

/** Statut local d'une demande de réclamation (claim). */
export type BonusClaimStatus = "idle" | "posting" | "pending" | "error";
