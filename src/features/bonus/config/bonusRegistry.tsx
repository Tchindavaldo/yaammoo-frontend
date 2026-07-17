// ============================================================================
// Registre des types de bonus — cœur de l'évolutivité de l'interface
// ----------------------------------------------------------------------------
// Chaque type connu a un *descripteur* (icône, couleurs, libellé). Tout type
// inconnu (ajouté plus tard côté fastfood) tombe automatiquement sur le
// descripteur DEFAULT : l'UI l'affiche proprement sans aucune modification.
// Pour supporter un nouveau type "de première classe" : ajouter une entrée ici.
// ============================================================================
import { Ionicons } from "@expo/vector-icons";
import { Theme } from "@/src/theme";
import type { Bonus } from "../types/bonus.types";

export interface BonusDescriptor {
  /** Nom d'icône Ionicons. */
  icon: keyof typeof Ionicons.glyphMap;
  /** Couleur d'accent (badges, barres, textes). */
  color: string;
  /** Dégradé pour le médaillon d'icône. */
  gradient: [string, string];
  /** Libellé lisible du type (utilisé par les chips de filtre). */
  label: string;
}

const REGISTRY: Record<string, BonusDescriptor> = {
  netflix: {
    icon: "play-circle",
    color: "#E50914",
    gradient: ["#E50914", "#8B0000"],
    label: "Netflix",
  },
  free_delivery: {
    icon: "bicycle",
    color: "#2563eb",
    gradient: ["#3b82f6", "#1d4ed8"],
    label: "Livraison gratuite",
  },
  free_meal: {
    icon: "fast-food",
    color: "#f59e0b",
    gradient: ["#fbbf24", "#d97706"],
    label: "Repas gratuit",
  },
  discount: {
    icon: "pricetag",
    color: "#16a34a",
    gradient: ["#22c55e", "#15803d"],
    label: "Réduction",
  },
};

/** Descripteur générique pour tout type non répertorié (futurs bonus). */
const DEFAULT_DESCRIPTOR: BonusDescriptor = {
  icon: "gift",
  color: Theme.colors.primary,
  gradient: [Theme.colors.primary, "#c73a0f"],
  label: "Bonus",
};

/** Retourne le descripteur d'un type, ou le descripteur par défaut si inconnu. */
export const getBonusDescriptor = (type?: string): BonusDescriptor =>
  REGISTRY[(type || "").toLowerCase()] ?? DEFAULT_DESCRIPTOR;

/** true si le type possède un descripteur dédié (utile pour un badge "nouveau"). */
export const isKnownBonusType = (type?: string): boolean =>
  !!REGISTRY[(type || "").toLowerCase()];

/**
 * Construit la liste des types présents dans un lot de bonus (pour les chips
 * de filtre). L'ordre suit le registre connu, puis les types inconnus à la fin.
 */
export const getPresentBonusTypes = (
  bonuses: Bonus[],
): { type: string; label: string }[] => {
  const present = new Set(bonuses.map((b) => (b.type || "").toLowerCase()));
  const known = Object.keys(REGISTRY)
    .filter((t) => present.has(t))
    .map((t) => ({ type: t, label: REGISTRY[t].label }));
  const unknown = [...present]
    .filter((t) => t && !REGISTRY[t])
    .map((t) => ({ type: t, label: getBonusDescriptor(t).label }));
  return [...known, ...unknown];
};
