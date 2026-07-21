// ============================================================================
// Types du domaine Bonus (côté client)
// ----------------------------------------------------------------------------
// Le backend stocke un bonus sous forme libre : `{ id, ...data, createdAt }`.
// C'est donc le frontend qui fixe la forme canonique ci-dessous, et
// `normalizeBonus()` (voir useBonusV2.ts) tolère les formes partielles / héritées.
// ============================================================================

/**
 * Nature du critère qui rend un bonus éligible. Évolutif : ajouter une valeur
 * ici + un `case` dans `computeEligibility` suffit, le reste de l'UI ne bouge pas.
 */
export type BonusCriteriaKind = "order_count" | "amount_spent" | "welcome";

/** Fenêtre temporelle sur laquelle porte le critère (affichée sous la barre). */
export type BonusCriteriaPeriod = "day" | "week" | "month";

export interface BonusCriteria {
  kind: BonusCriteriaKind;
  /** Palier à atteindre : nombre de commandes ou montant cumulé (FCFA). */
  target?: number;
  /** Période de référence du palier (ex. 50 000 FCFA "sur un mois"). */
  period?: BonusCriteriaPeriod;
  /** Restreint le calcul aux commandes d'un fastfood précis (fidélité ciblée). */
  fastFoodId?: string;
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
  criteria: BonusCriteria;
  /** Émetteur du bonus : nom du fastfood, ou "yaammoo" pour la plateforme. */
  fastFoodName?: string;
  /** null = bonus plateforme yaammoo ; sinon id du fastfood émetteur. */
  fastFoodId?: string | null;
  /** Si false = le fastfood n'a pas encore activé cette offre. */
  active?: boolean;
  createdAt?: string;
  /** Durée de validité du code bonus une fois réclamé (en jours). */
  claimDuration?: number;
  /** ISO8601 — date à laquelle le user a réclamé le bonus (null = jamais). */
  claimedAt?: string | null;
  /** true = le code a été entièrement consommé (toutes les utilisations faites). */
  redeemed?: boolean;
  /** Nombre total d'utilisations autorisées du code une fois réclamé. */
  usageLimit?: number;
  /** Nombre d'utilisations déjà consommées. Quand il atteint usageLimit → non éligible. */
  usageCount?: number;
  /** Utilisations restantes du code (fourni par le backend). */
  remainingUses?: number;
  /** Code bonus délivré après approbation (ex. "YAM-5PBQRH"). */
  code?: string | null;
  /**
   * Identifiants du service offert (Netflix, etc.), livrés manuellement après
   * traitement. null tant que la récompense n'est pas provisionnée.
   */
  rewardCredentials?: {
    login: string;
    password: string;
    /**
     * Profil à utiliser sur le compte partagé (Netflix…) : nom affiché + code
     * PIN de déverrouillage. `undefined` sur les bonus non concernés.
     */
    profile?: { name: string; code: string } | null;
  } | null;
  /** ISO8601 — expiration du code, calculée backend (claimedAt + claimDuration). */
  expiresAt?: string | null;
  /** true = le code a dépassé expiresAt. */
  expired?: boolean;

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
