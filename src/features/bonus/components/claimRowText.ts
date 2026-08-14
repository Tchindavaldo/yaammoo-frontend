// ============================================================================
// Dérivation TEXTUELLE de la ligne de réclamation (icône, titre, description) —
// extraite de `ClaimRowSlide` pour respecter le plafond de 500 lignes (R4).
// Fonctions pures : aucun state, aucun hook, juste la logique d'état → texte.
// ============================================================================
import type { Ionicons } from "@expo/vector-icons";
import type { BonusProgress } from "../types/bonus.types";
import type { CampaignInfo } from "../hooks/useCampaignPhase";

const fmt = (n: number) => n.toLocaleString("fr-FR");

export interface ClaimRowStateFlags {
  upload?: { phase: "compressing" | "uploading"; progress: number };
  inactiveWithReward: boolean;
  isInactive: boolean;
  isRedeemed: boolean;
  isApproved: boolean;
  isPending: boolean;
  isFlyerStep: boolean;
  isEligible: boolean;
  campaign: CampaignInfo;
  fieldsCount: number;
  hasFastFoodId: boolean;
  progress: BonusProgress;
  description?: string;
}

export const claimIconOf = (
  f: ClaimRowStateFlags,
  cred: boolean,
): keyof typeof Ionicons.glyphMap => {
  if (f.upload)
    return f.upload.phase === "compressing"
      ? "cog-outline"
      : "cloud-upload-outline";
  if (f.inactiveWithReward) return cred ? "key-outline" : "checkmark-circle";
  if (f.isInactive) return "eye-off-outline";
  if (f.isRedeemed) return "checkmark-done-outline";
  if (f.isApproved) return "checkmark-circle";
  if (f.isPending) return "hourglass-outline";
  if (f.isFlyerStep)
    return f.campaign.action === "upload"
      ? "videocam-outline"
      : f.campaign.phase === "before_download"
        ? "time-outline"
        : "download-outline";
  if (f.isEligible) return "gift";
  return "lock-closed-outline";
};

export const claimTitleOf = (f: ClaimRowStateFlags): string => {
  if (f.upload)
    return f.upload.phase === "compressing"
      ? "Compression en cours"
      : "Envoi en cours";
  if (f.inactiveWithReward) return "Ta récompense reste disponible";
  if (f.isInactive) return "Offre non activée";
  if (f.isRedeemed) return "Bonus déjà utilisé";
  if (f.isApproved) return "Bonus validé";
  if (f.isPending) return "Demande en cours";
  if (f.isFlyerStep) return f.campaign.title || "Télécharger le flyer";
  if (f.isEligible) return "Réclamer ce bonus";
  return "Pas encore disponible";
};

export const claimDescOf = (f: ClaimRowStateFlags): string => {
  // Envoi en cours : la phase prime sur le message de campagne — le user doit
  // comprendre pourquoi ça dure (une compression peut prendre une minute).
  if (f.upload)
    return f.upload.phase === "compressing"
      ? "Compression de ta vidéo en cours… Garde l'application ouverte."
      : "Envoi de ta vidéo en cours… Garde l'application ouverte.";
  if (f.inactiveWithReward)
    return "Le fastfood a retiré cette offre, mais ta récompense reste valable — tu peux toujours y accéder.";
  if (f.isInactive)
    return "Cette offre n'est pas encore activée. reviens bientôt pour en profiter.";
  if (f.isRedeemed)
    return "Tu as déjà utilisé ce code. Les compteurs repartent à zéro, tu peux re-devenir éligible.";
  // Approuvé mais rien à délivrer encore : la récompense est provisionnée
  // manuellement (Netflix…), elle arrivera par socket `bonus.reward_credentials`.
  if (f.isApproved)
    return f.fieldsCount > 0
      ? "Ta récompense est prête !"
      : "Récompense en cours de préparation. Tu seras notifié dès qu'elle est prête.";
  if (f.isPending)
    return f.hasFastFoodId
      ? "Ta demande a bien été envoyée et attend la validation du fastfood. Tu recevras une notification dès qu'elle est acceptée."
      : "Ta demande est en cours de traitement. Tu seras notifié dès qu'elle est validée et que ton bonus est disponible.";
  // Campagne datée : le message suit la phase (avant téléchargement, jour J,
  // publication, envoi de la preuve). À défaut de calendrier, la consigne du
  // bonus fait foi — plus précise que n'importe quel texte générique.
  if (f.isFlyerStep)
    return (
      f.campaign.desc ||
      f.description ||
      "Télécharge le flyer et publie-le en statut pour obtenir ce bonus."
    );
  if (f.isEligible)
    return "Tu remplis les conditions. Appuie sur Réclamer pour obtenir ton bonus.";
  if (f.progress.measurable && f.progress.target > 0) {
    return f.progress.unit === "FCFA"
      ? `Tu y es presque ! Encore ${fmt(f.progress.remaining)} FCFA à dépenser pour remplir les conditions et débloquer ce bonus.`
      : `Tu y es presque ! Encore ${f.progress.remaining} commande${f.progress.remaining > 1 ? "s" : ""} à passer pour remplir les conditions et débloquer ce bonus.`;
  }
  return "Continue de commander pour remplir les conditions de ce bonus. Il se débloquera automatiquement dès que tu y seras.";
};
