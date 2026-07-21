import { getBonusDescriptor } from "../config/bonusRegistry";
import type { Bonus, BonusRequestStatus } from "../types/bonus.types";
import { useBonusV2Eligibility } from "./useBonusV2Eligibility";

export interface BonusStatus {
  isInactive: boolean;
  isRedeemed: boolean;
  isPending: boolean;
  isApproved: boolean;
  isEligible: boolean;
  /** Libellé court, prêt à afficher (« Validé », « En attente »…). */
  label: string;
  /** Couleur associée — une par état. */
  color: string;
}

/**
 * Statut affichable d'un bonus (libellé + couleur + drapeaux d'état).
 *
 * Centralise une dérivation qui était dupliquée dans BonusCard et
 * BonusClaimRow : un seul endroit décide de ce qu'on montre par état.
 */
export const useBonusV2Status = (
  bonus: Bonus,
  /** Statut optimiste local, prioritaire sur celui du backend. */
  optimisticPending = false,
): BonusStatus => {
  const d = getBonusDescriptor(bonus.type);
  const p = useBonusV2Eligibility(bonus);

  const reqStatus: BonusRequestStatus = optimisticPending
    ? "pending"
    : (bonus.requestStatus ?? "none");

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

  const color = isInactive
    ? "#6366f1" // indigo — offre non activée
    : isRedeemed
      ? "#8b5cf6" // violet — utilisé
      : isApproved
        ? "#16a34a" // vert — validé
        : isPending
          ? "#f59e0b" // orange — en attente
          : isEligible
            ? d.color // couleur du bonus — éligible
            : "#ef4444"; // rouge — non éligible

  return {
    isInactive,
    isRedeemed,
    isPending,
    isApproved,
    isEligible,
    label,
    color,
  };
};
