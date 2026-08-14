import { Theme } from "@/src/theme";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { getBonusDescriptor } from "../config/bonusRegistry";
import { useBonusEligibility } from "../hooks/useBonusEligibility";
import type {
  Bonus,
  BonusClaimStatus,
  BonusRequestStatus,
} from "../types/bonus.types";
import {
  BonusGlassCard,
  CARD_BG_COLOR,
  CARD_IMAGE_BG,
  GLASS_BORDER,
} from "./BonusGlassCard";
import { BonusProgressBar } from "./BonusProgressBar";
import { BonusUsageRing } from "./BonusUsageRing";
import { ClaimRowSlide } from "./ClaimRowSlide";

interface BonusCardProps {
  bonus: Bonus;
  claimStatus?: BonusClaimStatus;
  onClaim: (bonus: Bonus) => void;
  /** Image de fond de la carte principale (URI locale). null = asset par défaut. */
  cardImage?: string | null;
  /** Bascule l'armement du bonus (relayé à `ClaimRowSlide`). */
  onActivate?: (bonus: Bonus) => void;
  /** Requête d'armement en vol pour CE bonus : le bouton passe en spinner. */
  arming?: boolean;
  /** Action tentée hors période de campagne : remonte le motif au parent. */
  onBlocked?: (reason: string) => void;
}

const fmt = (n: number) => n.toLocaleString("fr-FR");

const DARK = Theme.colors.dark;
const GRAY = Theme.colors.gray[600];
const LIGHT = "#ffffff";
// Glassmorphism : c'est BonusGlassCard qui porte le fond (blur + blanc très
// translucide). Les cartes elles-mêmes ne peignent plus rien, sinon l'aplat
// masquerait le verre. `CARD_IMAGE_BG` = false rétablit un aplat.
// Couleur pilotée par la constante globale CARD_BG_COLOR (BonusGlassCard.tsx).
const CARD_BG = CARD_IMAGE_BG ? "transparent" : CARD_BG_COLOR;
// Pistes de progression : assombries sur fond image, sinon elles s'y noient.
const TRACK = CARD_IMAGE_BG ? "rgba(0,0,0,0.16)" : Theme.colors.gray[200];
// Liseré : sur verre, une arête CLAIRE (et non sombre) fait l'effet de vitre.
const BORDER = CARD_IMAGE_BG ? GLASS_BORDER : "rgba(0,0,0,0.01)";

// ── Alignement optique sur le header ──
// Le TabHeader pose son texte à `Theme.spacing.md` (16) du bord. Pour que le
// TEXTE des cartes tombe sur la même verticale, chaque carte est décalée de
// GUTTER MOINS son propre padding interne : marge + padding = 16.
const GUTTER = Theme.spacing.md;
const CARD_PAD = 10;

/** Titre principal de la carte : l'émetteur du bonus (fastfood ou yaammoo). */
const issuerText = (bonus: Bonus): string => bonus.fastFoodName || "yaammoo";

/** Suffixe de période affiché après le compteur : "sur le mois", etc. */
const PERIOD_LABEL: Record<string, string> = {
  day: "sur le jour",
  week: "sur la semaine",
  month: "sur le mois",
};

/** Formate une date ISO en "12 juil.", ou "—" si absente/invalide. */
const fmtDate = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
};

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

/** Formate une date en mois seul ("juil."). */
const fmtMonth = (d: Date) => d.toLocaleDateString("fr-FR", { month: "short" });

/**
 * Date de début affichée : `startsAt` (jour + mois) s'il existe. Sinon dates
 * inconnues → on projette le MOIS actuel seul (pas de jour).
 */
const fmtStartDate = (bonus: Bonus) =>
  bonus.startsAt ? fmtDate(bonus.startsAt) : fmtMonth(new Date());

/**
 * Date de fin du code : `expiresAt` (jour + mois) fourni par le backend, ou
 * `startsAt + claimDuration`. Si dates inconnues → MOIS seul après la durée.
 * "—" seulement si aucune durée.
 */
const fmtEndDate = (bonus: Bonus) => {
  if (bonus.expiresAt) return fmtDate(bonus.expiresAt);
  if (!bonus.claimDuration) return "—";
  if (bonus.startsAt) {
    const d = new Date(bonus.startsAt);
    if (isNaN(d.getTime())) return "—";
    d.setDate(d.getDate() + bonus.claimDuration);
    return fmtDate(d.toISOString());
  }
  const d = new Date();
  d.setDate(d.getDate() + bonus.claimDuration);
  return fmtMonth(d);
};

/** Texte de durée : "N j" ou "N mois". */
const durationText = (bonus: Bonus) => {
  if (!bonus.claimDuration) return "—";
  const d = bonus.claimDuration;
  if (d < 31) return `${d} j`;
  return `${Math.round(d / 30)} mois`;
};

/**
 * Carte bonus : design minimaliste / épuré — carte blanche, bordure fine + ombre
 * douce, couleur du bonus en accent. Rendue dans le carrousel de `UserBonusSheet`.
 *
 * Porte aussi, EN BAS, la ligne de réclamation (`ClaimRowSlide`) : elle vivait
 * auparavant dans la carte de pagination du footer, figée sur le bonus
 * courant — elle est désormais DANS ce composant, donc dans le même
 * `ScrollView` natif du carrousel, et slide avec la carte au lieu de sauter
 * d'un coup au changement d'index.
 */
export const BonusCard: React.FC<BonusCardProps> = ({
  bonus,
  claimStatus = "idle",
  onClaim,
  cardImage,
  onActivate,
  arming,
  onBlocked,
}) => {
  const d = getBonusDescriptor(bonus.type);
  const p = useBonusEligibility(bonus);
  const periodLabel = bonus.criteria?.period
    ? PERIOD_LABEL[bonus.criteria.period]
    : "";

  const reqStatus: BonusRequestStatus =
    claimStatus === "pending" ? "pending" : (bonus.requestStatus ?? "none");

  // ── Détermination de l'état effectif du bonus ──
  const isInactive = bonus.active === false;
  const isRedeemed = bonus.redeemed === true;
  const isPending = reqStatus === "pending";
  const isApproved = reqStatus === "approved";
  const isEligible =
    !isInactive && !isRedeemed && reqStatus === "none" && p.eligible;

  const u = usageInfo(bonus);

  const statusText = isInactive
    ? "Inactif"
    : isRedeemed
      ? u
        ? `Utilisé ${u.used}/${u.limit}`
        : "Utilisé"
      : isApproved
        ? "Validé"
        : isPending
          ? "En attente"
          : isEligible
            ? "Éligible"
            : "Non éligible";

  // Teinte UNIFORME : la pilule de statut prend toujours la couleur du bonus,
  // quel que soit l'état (plus de couleur dédiée par statut).
  const statusColor = (): string => d.color;

  return (
    <View style={styles.root}>
      {/* Ligne de stats (Commandes / Montant) retirée dans ce design. */}

      {/* Carte principale — seule carte à porter l'image de fond, en plus du
          verre : c'est elle qui doit se détacher des autres blocs. */}
      <BonusGlassCard
        style={styles.card}
        radius={24}
        image
        imageUri={cardImage}
      >
        <View style={styles.top}>
          <View style={styles.issuerBlock}>
            <Text style={styles.issuerValue} numberOfLines={1}>
              {issuerText(bonus)}
            </Text>
          </View>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: `${statusColor()}1f` },
            ]}
          >
            <Text style={[styles.statusPillText, { color: statusColor() }]}>
              {statusText}
            </Text>
          </View>
        </View>

        <Text style={styles.name} numberOfLines={1}>
          {bonus.name}
        </Text>
        {!!bonus.description && (
          <Text style={styles.description} numberOfLines={1} ellipsizeMode="tail">
            {bonus.description}
          </Text>
        )}

        <View style={styles.progressWrap}>
          <BonusProgressBar
            progress={p.measurable ? p.progress : 1}
            color={d.color}
            // Plus foncé que CARD_BG, sinon la piste disparaît sur le fond gris.
            trackColor={TRACK}
          />
          {p.measurable && p.target > 0 && (
            <Text style={styles.progressText}>
              {p.unit === "FCFA"
                ? `${fmt(p.current)} / ${fmt(p.target)} FCFA`
                : `${p.current} / ${p.target} commandes payées`}
              {periodLabel ? ` · ${periodLabel}` : ""}
            </Text>
          )}
        </View>

        <View style={styles.infoRow}>
          <Info label="Début" value={fmtStartDate(bonus)} />
          <Info label="Fin" value={fmtEndDate(bonus)} />
          <Info label="Durée" value={durationText(bonus)} />
          {u && (
            <BonusUsageRing
              used={u.remaining}
              limit={u.limit}
              color={d.color}
              size={40}
            />
          )}
        </View>

        {/* Ligne de réclamation DANS la carte : elle slide donc avec elle, dans
            le même ScrollView natif du carrousel — plus de piste dupliquée
            dans le footer, plus de risque de désynchro. */}
        <View style={styles.claimDivider} />
        <ClaimRowSlide
          bonus={bonus}
          claimStatus={claimStatus}
          onClaim={onClaim}
          onActivate={onActivate}
          arming={arming}
          onBlocked={onBlocked}
        />
      </BonusGlassCard>

      {/* Ligne mini-cartes (Proposés / Mes reçus / Distribués) retirée. */}
    </View>
  );
};

const Info = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.info}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "space-around",
  },

  card: {
    // marge + paddingHorizontal = GUTTER → le texte s'aligne sur le header.
    marginHorizontal: GUTTER - CARD_PAD,
    backgroundColor: CARD_BG,
    borderRadius: 24,
    paddingTop: 4,
    paddingBottom: 4,
    paddingHorizontal: CARD_PAD,
    gap: 10,
    borderWidth: CARD_IMAGE_BG ? 1 : 0.5,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  top: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  claimDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  issuerBlock: { flex: 1 },
  issuerValue: { color: DARK, fontSize: 24, fontWeight: "800", marginTop: 2 },
  statusPill: {
    backgroundColor: DARK,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Theme.borderRadius.pill,
  },
  statusPillText: { color: LIGHT, fontSize: 12, fontWeight: "700" },
  name: { color: DARK, fontSize: 16, fontWeight: "700", marginTop: -2 },
  description: { color: GRAY, fontSize: 13, lineHeight: 18, marginTop: -6 },
  progressWrap: { gap: 6 },
  progressText: { color: GRAY, fontSize: 12, fontWeight: "500" },
  infoRow: { flexDirection: "row", alignItems: "center" },
  info: { flex: 1 },
  infoLabel: { color: GRAY, fontSize: 12, fontWeight: "500" },
  infoValue: { color: DARK, fontSize: 16, fontWeight: "800", marginTop: 2 },
});
