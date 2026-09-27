import type { BonusPagerItem } from "@/modules/bonus-pager";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getBonusDescriptor } from "../config/bonusRegistry";
import { computeEligibility } from "../hooks/useBonusEligibility";
import type { Bonus } from "../types/bonus.types";

/**
 * Libellé + couleur d'un bonus, en fonction PURE (pas un hook) : les slides du
 * panneau héro sont rendus dans une boucle `.map`, où `useBonusStatus` (hook)
 * est interdit. Reprend exactement la même dérivation que `useBonusStatus`,
 * sur la même fonction pure `computeEligibility`, pour ne pas diverger du
 * calcul d'éligibilité réel.
 */
export const statusOf = (bonus: Bonus) => {
  const d = getBonusDescriptor(bonus.type);
  const p = computeEligibility(bonus);
  const reqStatus = bonus.requestStatus ?? "none";
  const isInactive = bonus.active === false;
  const isRedeemed = bonus.redeemed === true;
  const isPending = reqStatus === "pending";
  const isApproved = reqStatus === "approved";
  const isEligible =
    !isInactive && !isRedeemed && reqStatus === "none" && p.eligible;
  const label = isInactive
    ? "Inactif"
    : isRedeemed
      ? "Utilisé"
      : isApproved
        ? "Validé"
        : isPending
          ? "En attente"
          : isEligible
            ? "Éligible"
            : "Non éligible";
  return { label, color: d.color };
};

/** Utilisations restantes si un plafond est défini, sinon null. */
export const remainingUses = (bonus?: Bonus): number | null => {
  if (!bonus || typeof bonus.usageLimit !== "number") return null;
  const used = bonus.usageCount ?? 0;
  return bonus.remainingUses ?? Math.max(0, bonus.usageLimit - used);
};

/**
 * Données du pied de page NATIF (`modules/bonus-pager`) pour un bonus : tout
 * est calculé ici, le Swift ne fait qu'afficher. Mêmes textes que
 * `BonusGalleryCard` (« Bonus N ») et `BonusPagerInfo` (émetteur, reste,
 * nom, statut).
 */
export const toPagerItem = (bonus: Bonus, position: number): BonusPagerItem => {
  const desc = getBonusDescriptor(bonus.type);
  const status = statusOf(bonus);
  const remaining = remainingUses(bonus);
  const glyph = Ionicons.glyphMap[desc.icon];
  return {
    id: bonus.id ?? String(position),
    color: desc.color,
    icon: typeof glyph === "number" ? String.fromCodePoint(glyph) : "",
    label: `Bonus ${position + 1}`,
    issuer: bonus.fastFoodName || "yaammoo",
    remaining:
      remaining === null
        ? null
        : `· ${remaining} restante${remaining > 1 ? "s" : ""}`,
    name: bonus.name ?? "",
    statusLabel: status.label,
    statusColor: status.color,
  };
};
