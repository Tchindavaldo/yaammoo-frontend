import { Theme } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Clipboard,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getBonusDescriptor } from "../config/bonusRegistry";
import { useBonusEligibility } from "../hooks/useBonusEligibility";
import { useBonusContext } from "../context/BonusContext";
import { useBonusStatus } from "../hooks/useBonusStatus";
import { useCampaignPhase } from "../hooks/useCampaignPhase";
import type { Bonus, BonusClaimStatus } from "../types/bonus.types";
import { BonusCredentialsSheet } from "./BonusCredentialsSheet";
import { BonusUsageRing } from "./BonusUsageRing";

interface BonusClaimRowProps {
  bonus: Bonus;
  claimStatus?: BonusClaimStatus;
  onClaim: (bonus: Bonus) => void;
  /**
   * Bascule l'ARMEMENT du bonus (`POST`/`DELETE /bonus/:id/arm`) : un bonus armé
   * s'applique automatiquement au prochain checkout éligible. Le bouton reflète
   * `bonus.armed` — « Activer » quand il est désarmé, « Désactiver » sinon.
   */
  onActivate?: (bonus: Bonus) => void;
  /** Requête d'armement en vol : le bouton passe en spinner. */
  arming?: boolean;
  /**
   * Action tentée hors période de campagne (`status_view`) : remonte le motif
   * du refus au parent, qui l'affiche en toast.
   */
  onBlocked?: (reason: string) => void;
}

const DARK = Theme.colors.dark;
const GRAY = Theme.colors.gray[600];
const LIGHT = "#ffffff";

/** Hauteur fixe de la ligne : titre (19) + 2 lignes de description (30) + marge. */
const CLAIM_ROW_H = 52;

const fmt = (n: number) => n.toLocaleString("fr-FR");

/** Infos d'utilisation du code (faites / restantes) si un plafond est défini. */
const usageInfo = (bonus: Bonus) => {
  if (typeof bonus.usageLimit !== "number") return null;
  const used = bonus.usageCount ?? 0;
  return {
    used,
    limit: bonus.usageLimit,
    // Le backend fait autorité sur le reste ; sinon on le déduit.
    remaining: bonus.remainingUses ?? Math.max(0, bonus.usageLimit - used),
  };
};

/**
 * Ligne de réclamation du bonus COURANT : message de statut à gauche, action à
 * droite (Réclamer / Voir les identifiants / anneau d'utilisation).
 *
 * Vit hors du carrousel — dans la carte commune du bas, avec la pagination —
 * et suit donc le bonus sélectionné plutôt que de défiler avec les cartes.
 */
export const BonusClaimRow: React.FC<BonusClaimRowProps> = ({
  bonus,
  claimStatus = "idle",
  onClaim,
  onActivate,
  arming = false,
  onBlocked,
}) => {
  const d = getBonusDescriptor(bonus.type);
  const p = useBonusEligibility(bonus);
  // Valeur copiée en dernier (null = aucune) — feedback éphémère de 2 s.
  const [copied, setCopied] = React.useState<string | null>(null);
  // Bottom sheet des identifiants (ouverte par les boutons Profil / Compte).
  const [sheetOpen, setSheetOpen] = React.useState(false);
  // Section affichée dans la sheet, selon le bouton utilisé.
  const [sheetSection, setSheetSection] = React.useState<"account" | "profile">(
    "account",
  );

  const {
    isInactive,
    isRedeemed,
    isPending,
    isApproved,
    isEligible,
    color: statusColor,
  } = useBonusStatus(bonus, claimStatus === "pending");

  // Depuis le CONTEXTE, pas d'instance locale : fermer la sheet en plein envoi
  // démontait le hook et perdait la progression.
  const { downloadFlyer, downloading, uploadProof, uploading, error } =
    useBonusContext();
  // Les refus backend (flyer non téléchargé, délai non écoulé, 409…) passent par
  // le même canal que les refus locaux : un toast porté par le parent.
  React.useEffect(() => {
    if (error) onBlocked?.(error);
  }, [error, onBlocked]);
  const campaign = useCampaignPhase(bonus);
  // Envoi en cours : porte la phase (compression / upload) et sa progression.
  const upload = uploading[bonus.id];
  const busy = !!downloading[bonus.id] || !!upload;

  const u = usageInfo(bonus);
  const cred = bonus.rewardCredentials;

  /**
   * Ce que la ligne livre concrètement : les identifiants du service s'ils sont
   * provisionnés, sinon le code. Liste vide = rien à délivrer → message seul.
   */
  const fields: { label?: string; value: string }[] = cred
    ? [
        { label: "Email", value: cred.login },
        { label: "Mot de passe", value: cred.password },
      ]
    : bonus.code
      ? [{ value: bonus.code }]
      : [];

  // Bonus « publier un statut » : ce n'est pas une réclamation qu'on propose au
  // user mais le TÉLÉCHARGEMENT du flyer, qu'il postera ensuite en statut. Le
  // reste des états (validé, utilisé, inactif…) suit le rendu commun.
  const isStatusView = bonus.criteria?.kind === "status_view";
  const isFlyerStep = isStatusView && isEligible;

  /**
   * Une récompense DÉJÀ délivrée reste accessible même si le fastfood désactive
   * l'offre : le user y a droit, la désactivation ne vaut que pour les
   * réclamations futures. L'état inactif reste signalé par la pile de statut en
   * haut à droite, mais il ne masque plus les identifiants ni le code.
   */
  const hasReward = fields.length > 0;
  const inactiveWithReward = isInactive && hasReward;

  const claimIcon = (): keyof typeof Ionicons.glyphMap => {
    if (upload)
      return upload.phase === "compressing"
        ? "cog-outline"
        : "cloud-upload-outline";
    if (inactiveWithReward) return cred ? "key-outline" : "checkmark-circle";
    if (isInactive) return "eye-off-outline";
    if (isRedeemed) return "checkmark-done-outline";
    if (isApproved) return "checkmark-circle";
    if (isPending) return "hourglass-outline";
    if (isFlyerStep)
      return campaign.action === "upload"
        ? "videocam-outline"
        : campaign.phase === "before_download"
          ? "time-outline"
          : "download-outline";
    if (isEligible) return "gift";
    return "lock-closed-outline";
  };

  const claimTitle = (): string => {
    if (upload)
      return upload.phase === "compressing"
        ? "Compression en cours"
        : "Envoi en cours";
    if (inactiveWithReward) return "Ta récompense reste disponible";
    if (isInactive) return "Offre non activée";
    if (isRedeemed) return "Bonus déjà utilisé";
    if (isApproved) return "Bonus validé";
    if (isPending) return "Demande en cours";
    if (isFlyerStep) return campaign.title || "Télécharger le flyer";
    if (isEligible) return "Réclamer ce bonus";
    return "Pas encore disponible";
  };

  const claimDesc = (): string => {
    // Envoi en cours : la phase prime sur le message de campagne — le user doit
    // comprendre pourquoi ça dure (une compression peut prendre une minute).
    if (upload)
      return upload.phase === "compressing"
        ? "Compression de ta vidéo en cours… Garde l'application ouverte."
        : "Envoi de ta vidéo en cours… Garde l'application ouverte.";
    if (inactiveWithReward)
      return "Le fastfood a retiré cette offre, mais ta récompense reste valable — tu peux toujours y accéder.";
    if (isInactive)
      return "Cette offre n'est pas encore activée par le fastfood. Elle deviendra réclamable dès qu'il la mettra en ligne — reviens bientôt pour en profiter.";
    if (isRedeemed)
      return "Tu as déjà utilisé ce code. Les compteurs repartent à zéro, tu peux re-devenir éligible.";
    // Approuvé mais rien à délivrer encore : la récompense est provisionnée
    // manuellement (Netflix…), elle arrivera par socket `bonus.reward_credentials`.
    if (isApproved)
      return fields.length > 0
        ? "Ta récompense est prête !"
        : "Récompense en cours de préparation. Tu seras notifié dès qu'elle est prête.";
    if (isPending)
      return bonus.fastFoodId
        ? "Ta demande a bien été envoyée et attend la validation du fastfood. Tu recevras une notification dès qu'elle est acceptée."
        : "Ta demande est en cours de traitement. Tu seras notifié dès qu'elle est validée et que ton bonus est disponible.";
    // Campagne datée : le message suit la phase (avant téléchargement, jour J,
    // publication, envoi de la preuve). À défaut de calendrier, la consigne du
    // bonus fait foi — plus précise que n'importe quel texte générique.
    if (isFlyerStep)
      return (
        campaign.desc ||
        bonus.description ||
        "Télécharge le flyer et publie-le en statut pour obtenir ce bonus."
      );
    if (isEligible)
      return "Tu remplis les conditions. Appuie sur Réclamer pour obtenir ton bonus.";
    if (p.measurable && p.target > 0) {
      return p.unit === "FCFA"
        ? `Tu y es presque ! Encore ${fmt(p.remaining)} FCFA à dépenser pour remplir les conditions et débloquer ce bonus.`
        : `Tu y es presque ! Encore ${p.remaining} commande${p.remaining > 1 ? "s" : ""} à passer pour remplir les conditions et débloquer ce bonus.`;
    }
    return "Continue de commander pour remplir les conditions de ce bonus. Il se débloquera automatiquement dès que tu y seras.";
  };

  const handleCopy = (value: string) => {
    Clipboard.setString(value);
    setCopied(value);
    setTimeout(() => setCopied(null), 2000);
  };

  /** Bouton plein (non cliquable) affiché à droite pour les états passifs :
   *  inactif, en attente, non éligible. Même forme que « Réclamer », couleur
   *  du statut. */
  const infoButton = (label: string): React.ReactNode => (
    <View style={[styles.btn, { backgroundColor: statusColor }]}>
      <Text style={styles.btnText}>{label}</Text>
    </View>
  );

  /**
   * Boutons de délivrance d'une récompense (dès qu'il y a un code / des
   * identifiants) : Profil + Compte pour des identifiants (Netflix…), sinon
   * Activer + Copier pour un simple code. Communs aux états VALIDÉ et UTILISÉ.
   */
  const rewardButtons = (): React.ReactNode => {
    if (cred) {
      // Identifiants (Netflix…) : trop de champs pour la ligne. Deux boutons
      // ouvrent la sheet sur des contenus disjoints — Compte (email + mot de
      // passe) et Profil (nom + code), ce dernier seulement s'il est fourni.
      return (
        <View style={styles.btnGroup}>
          {cred.profile && (
            <TouchableOpacity
              style={[styles.btnGhost, { borderColor: d.color }]}
              onPress={() => {
                setSheetSection("profile");
                setSheetOpen(true);
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="person-outline" size={14} color={d.color} />
              <Text style={[styles.btnGhostText, { color: d.color }]}>
                Profil
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.btn, styles.btnCompact, { backgroundColor: d.color }]}
            onPress={() => {
              setSheetSection("account");
              setSheetOpen(true);
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>Compte</Text>
          </TouchableOpacity>
        </View>
      );
    }
    // Armement : bouton à DEUX ÉTATS piloté par `bonus.armed`. Désarmé il est
    // outlined (« Activer », éclair creux) ; armé il se remplit de la couleur du
    // bonus (« Désactiver », éclair plein) — l'état est ainsi lisible sans texte
    // d'aide, et le même bouton sert aux deux sens (POST / DELETE /arm).
    const armed = !!bonus.armed;
    // Offre retirée : le code reste copiable mais l'armement n'a plus de sens
    // (il ne s'appliquera à aucun checkout) — on ne montre pas un bouton mort.
    if (inactiveWithReward) {
      return (
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: d.color }]}
          onPress={() => handleCopy(fields[0].value)}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>{copied ? "Copié !" : "Copier"}</Text>
        </TouchableOpacity>
      );
    }
    return (
      <View style={styles.btnGroup}>
        <TouchableOpacity
          style={[
            styles.btnGhost,
            { borderColor: d.color },
            armed && { backgroundColor: d.color },
          ]}
          onPress={() => onActivate?.(bonus)}
          disabled={arming}
          activeOpacity={0.85}
        >
          {arming ? (
            <ActivityIndicator size="small" color={armed ? LIGHT : d.color} />
          ) : (
            <>
              <Ionicons
                name={armed ? "flash" : "flash-outline"}
                size={14}
                color={armed ? LIGHT : d.color}
              />
              <Text
                style={[
                  styles.btnGhostText,
                  { color: armed ? LIGHT : d.color },
                ]}
              >
                {armed ? "Désactiver" : "Activer"}
              </Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.btnCompact, { backgroundColor: d.color }]}
          onPress={() => handleCopy(fields[0].value)}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>{copied ? "Copié !" : "Copier"}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const claimAction = (): React.ReactNode => {
    if (inactiveWithReward) return rewardButtons();
    if (isInactive) return infoButton("Bientôt");
    // UTILISÉ : s'il reste un code / des identifiants à consulter, on affiche
    // les boutons de délivrance (Activer/Copier ou Profil/Compte) plutôt que le
    // seul anneau. Sinon, l'anneau nb/nb résume l'usage.
    if (isRedeemed) {
      if (fields.length > 0) return rewardButtons();
      return u ? (
        <BonusUsageRing used={u.used} limit={u.limit} color={d.color} />
      ) : null;
    }
    if (isApproved) {
      // Rien de délivré (récompense en cours de provisionnement) : pas de
      // bouton mort, le message de statut suffit.
      if (!cred && fields.length === 0) return null;
      return rewardButtons();
    }
    if (isPending) return infoButton("En attente");
    // Le bouton reste actif après un premier téléchargement : le user peut
    // retélécharger le flyer autant de fois qu'il veut (downloadCount suit).
    // Hors période, il reste cliquable mais explique le refus par un toast
    // plutôt que d'être grisé sans motif.
    if (isFlyerStep) {
      const isUpload = campaign.action === "upload";
      return (
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: d.color }]}
          onPress={() => {
            if (campaign.blockedReason) return onBlocked?.(campaign.blockedReason);
            if (!isUpload) return downloadFlyer(bonus);
            // Le contexte applique lui-même le payload : la sheet a pu être
            // fermée avant la réponse, son callback n'existerait plus.
            return uploadProof(bonus);
          }}
          disabled={busy}
          activeOpacity={0.85}
        >
          {/* Envoi : pourcentage réel (compression puis upload). Téléchargement :
              spinner seul, l'API fichier d'Expo n'expose pas de progression. */}
          {upload ? (
            <Text style={styles.btnText}>
              {Math.round(upload.progress * 100)} %
            </Text>
          ) : busy ? (
            <ActivityIndicator color={LIGHT} size="small" />
          ) : (
            <Text style={styles.btnText}>
              {isUpload ? "Envoyer" : "Télécharger"}
            </Text>
          )}
        </TouchableOpacity>
      );
    }
    if (isEligible) {
      return (
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: d.color }]}
          onPress={() => onClaim(bonus)}
          disabled={claimStatus === "posting"}
          activeOpacity={0.85}
        >
          {claimStatus === "posting" ? (
            <ActivityIndicator color={LIGHT} size="small" />
          ) : (
            <Text style={styles.btnText}>Réclamer</Text>
          )}
        </TouchableOpacity>
      );
    }
    // Non éligible : bouton informatif verrouillé.
    return infoButton("Verrouillé");
  };

  const action = claimAction();

  return (
    <View style={styles.row}>
      <View style={[styles.icon, { backgroundColor: statusColor }]}>
        <Ionicons name={claimIcon()} size={20} color={LIGHT} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {claimTitle()}
        </Text>
        {isApproved && !cred && fields.length > 0 ? (
          <Text
            style={[styles.code, { color: d.color }]}
            numberOfLines={1}
            selectable
          >
            {fields[0].value}
          </Text>
        ) : (
          <Text style={styles.desc} numberOfLines={2}>
            {claimDesc()}
          </Text>
        )}
      </View>
      {action}

      <BonusCredentialsSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        credentials={cred ?? null}
        section={sheetSection}
        color={d.color}
        title={bonus.name}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  // Hauteur fixe : la description varie de 1 à 3 lignes selon le statut, ce qui
  // faisait « sauter » la carte de pagination à chaque slide. On borne à la
  // hauteur du pire cas (titre + 2 lignes) pour un conteneur stable.
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: CLAIM_ROW_H,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  text: { flex: 1 },
  title: { color: DARK, fontSize: 14, fontWeight: "700" },
  desc: { color: GRAY, fontSize: 11, lineHeight: 15 },
  code: { fontSize: 13, fontWeight: "800", marginTop: 1 },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  btnText: { color: LIGHT, fontWeight: "800", fontSize: 13 },
  // Deux boutons + le texte sur une ligne fixe : on resserre le bouton plein
  // pour laisser respirer la description (qui est en flex:1).
  btnGroup: { flexDirection: "row", alignItems: "center", gap: 6 },
  btnCompact: { paddingHorizontal: 12 },
  // Bouton secondaire (Profil) : outlined, pour ne pas concurrencer « Compte ».
  btnGhost: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  btnGhostText: { fontWeight: "800", fontSize: 12 },
});
