"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import { getBonusDescriptor } from "../config/bonusRegistry";
import type { Bonus, BonusRequestStatus } from "../types/bonus.types";
import { useBonusEligibility } from "./useBonusEligibility";
import { t, useLanguage } from "@/src/i18n";

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
export const useBonusStatus = (
  bonus: Bonus,
  /** Statut optimiste local, prioritaire sur celui du backend. */
  optimisticPending = false,
): BonusStatus => {
  useLanguage();
  const d = getBonusDescriptor(bonus.type);
  const p = useBonusEligibility(bonus);

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
    ? t("Inactif")
    : isRedeemed
      ? t("Utilisé")
      : isApproved
        ? t("Validé")
        : isPending
          ? t("En attente")
          : isEligible
            ? t("Éligible")
            : t("Non éligible");

  // Teinte UNIFORME : quel que soit l'état, on garde la couleur du bonus.
  // (plus de code couleur par statut — indigo/violet/vert/orange/rouge retirés).
  const color = d.color;

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
