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
import { useBonusContext } from "../context/BonusContext";
import { useBonusEligibility } from "../hooks/useBonusEligibility";
import { useBonusStatus } from "../hooks/useBonusStatus";
import { useCampaignPhase } from "../hooks/useCampaignPhase";
import type { Bonus, BonusClaimStatus } from "../types/bonus.types";
import { BonusCredentialsSheet } from "./BonusCredentialsSheet";
import { BonusUsageRing } from "./BonusUsageRing";
import { claimDescOf, claimIconOf, claimTitleOf } from "./claimRowText";

export interface ClaimRowSlideProps {
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
export const CLAIM_ROW_H = 52;

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
 * Ligne de réclamation d'UN bonus : message de statut à gauche, action à
 * droite (Réclamer / Voir les identifiants / anneau d'utilisation). Rendue
 * une fois par bonus dans la piste de `BonusClaimRow` (carrousel) — chaque
 * instance porte son propre état local (`copied`, `sheetOpen`), aucune fuite
 * entre bonus.
 *
 * Les dérivations purement TEXTUELLES (icône/titre/description) vivent dans
 * `claimRowText.ts`, extraites pour respecter le plafond de 500 lignes (R4).
 */
const ClaimRowSlideBase: React.FC<ClaimRowSlideProps> = ({
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
  const {
    downloadFlyer,
    downloading,
    uploadProof,
    uploading,
    flyerError,
    clearFlyerError,
  } = useBonusContext();
  // Les refus backend (flyer non téléchargé, délai non écoulé, 409…) passent par
  // le même canal que les refus locaux : un toast porté par le parent.
  // Acquitté aussitôt : le hook vit dans le contexte, un refus non consommé
  // rejouerait le toast à chaque réouverture de la sheet.
  React.useEffect(() => {
    if (!flyerError) return;
    onBlocked?.(flyerError);
    clearFlyerError();
  }, [flyerError, onBlocked, clearFlyerError]);
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

  const textFlags = {
    upload,
    inactiveWithReward,
    isInactive,
    isRedeemed,
    isApproved,
    isPending,
    isFlyerStep,
    isEligible,
    campaign,
    fieldsCount: fields.length,
    hasFastFoodId: !!bonus.fastFoodId,
    progress: p,
    description: bonus.description,
  };
  const claimIcon = claimIconOf(textFlags, !!cred);
  const claimTitle = claimTitleOf(textFlags);
  const claimDesc = claimDescOf(textFlags);

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
            style={[
              styles.btn,
              styles.btnCompact,
              { backgroundColor: d.color },
            ]}
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
            if (campaign.blockedReason)
              return onBlocked?.(campaign.blockedReason);
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
        <Ionicons name={claimIcon} size={20} color={LIGHT} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {claimTitle}
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
            {claimDesc}
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

/**
 * Mémoïsée : la piste re-rend toutes ses lignes à chaque changement d'index du
 * carrousel (le parent `BonusClaimRow` change de props), et chaque ligne
 * recalcule alors éligibilité, statut et phase de campagne. Sur des slides
 * rapides successifs, ce travail retardait la mise à jour visuelle.
 */
export const ClaimRowSlide = React.memo(
  ClaimRowSlideBase,
  (a, b) =>
    a.bonus === b.bonus &&
    a.claimStatus === b.claimStatus &&
    a.arming === b.arming &&
    a.onClaim === b.onClaim &&
    a.onActivate === b.onActivate &&
    a.onBlocked === b.onBlocked,
);

const styles = StyleSheet.create({
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
