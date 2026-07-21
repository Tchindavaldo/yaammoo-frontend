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
import { useBonusStatus } from "../hooks/useBonusStatus";
import type { Bonus, BonusClaimStatus } from "../types/bonus.types";
import { BonusCredentialsSheet } from "./BonusCredentialsSheet";
import { BonusUsageRing } from "./BonusUsageRing";

interface BonusClaimRowProps {
  bonus: Bonus;
  claimStatus?: BonusClaimStatus;
  onClaim: (bonus: Bonus) => void;
  /**
   * Activation du code livré. Non branchée : l'endpoint backend reste à
   * définir — le bouton est présent mais sans effet tant que la prop est omise.
   */
  onActivate?: (bonus: Bonus) => void;
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

  const claimIcon = (): keyof typeof Ionicons.glyphMap => {
    if (isInactive) return "eye-off-outline";
    if (isRedeemed) return "checkmark-done-outline";
    if (isApproved) return "checkmark-circle";
    if (isPending) return "hourglass-outline";
    if (isEligible) return "gift";
    return "lock-closed-outline";
  };

  const claimTitle = (): string => {
    if (isInactive) return "Offre non activée";
    if (isRedeemed) return "Bonus déjà utilisé";
    if (isApproved) return "Bonus validé";
    if (isPending) return "Demande en cours";
    if (isEligible) return "Réclamer ce bonus";
    return "Pas encore disponible";
  };

  const claimDesc = (): string => {
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
    return (
      <View style={styles.btnGroup}>
        {/*
         * TODO(backend) : l'activation du code n'est pas encore branchée —
         * l'endpoint reste à définir. Bouton visuel uniquement pour l'instant.
         */}
        <TouchableOpacity
          style={[styles.btnGhost, { borderColor: d.color }]}
          onPress={() => onActivate?.(bonus)}
          activeOpacity={0.85}
        >
          <Ionicons name="flash-outline" size={14} color={d.color} />
          <Text style={[styles.btnGhostText, { color: d.color }]}>
            Activer
          </Text>
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
