import { Theme } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getBonusDescriptor } from "../config/bonusRegistry";
import { useBonusEligibility } from "../hooks/useBonusEligibility";
import type {
  Bonus,
  BonusClaimStatus,
  BonusRequestStatus,
} from "../types/bonus.types";
import { BonusProgressBar } from "./BonusProgressBar";
import { BonusSparkline } from "./BonusSparkline";
import { BonusUsageRing } from "./BonusUsageRing";

interface BonusCardV2Props {
  bonus: Bonus;
  claimStatus?: BonusClaimStatus;
  onClaim: (bonus: Bonus) => void;
}

const fmt = (n: number) => n.toLocaleString("fr-FR");
const fmtK = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `${n}`;
const numOrDash = (n?: number) => (typeof n === "number" ? fmt(n) : "—");

const DARK = Theme.colors.dark;
const GRAY = Theme.colors.gray[600];
const GRAY_L = Theme.colors.gray[400];
const LIGHT = "#ffffff";

const rewardText = (bonus: Bonus): string => {
  const r = bonus.reward;
  if (r?.label) return r.label;
  if (typeof r?.value === "number")
    return `${fmt(r.value)}${r.unit ? " " + r.unit : ""}`;
  return getBonusDescriptor(bonus.type).label;
};

/** Formate une date ISO en "12 juil.", ou "—" si absente/invalide. */
const fmtDate = (iso?: string) => {
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
    remaining: Math.max(0, bonus.usageLimit - used),
  };
};

/** Date de fin = date de réclamation + durée. "—" si pas encore réclamé. */
const fmtEndDate = (claimedAt?: string, claimDuration?: number) => {
  if (!claimedAt || !claimDuration) return "—";
  const d = new Date(claimedAt);
  if (isNaN(d.getTime())) return "—";
  d.setDate(d.getDate() + claimDuration);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
};

/** Texte de durée : "N j" ou "N mois". */
const durationText = (bonus: Bonus) => {
  if (!bonus.claimDuration) return "—";
  const d = bonus.claimDuration;
  if (d < 31) return `${d} j`;
  return `${Math.round(d / 30)} mois`;
};

/**
 * Design V2 des bonus : identique à V3 (minimaliste / épuré, cartes blanches,
 * couleur du bonus en accent). Différence gérée par UserBonusModal : la page V2
 * a un fond global BLANC PUR (alors que V3 est sur fond gris neutre).
 */
export const BonusCardV2: React.FC<BonusCardV2Props> = ({
  bonus,
  claimStatus = "idle",
  onClaim,
}) => {
  const d = getBonusDescriptor(bonus.type);
  const p = useBonusEligibility(bonus);

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

  const claimIcon = (): keyof typeof Ionicons.glyphMap => {
    if (isInactive) return "eye-off-outline";
    if (isRedeemed) return "checkmark-done-outline";
    if (isApproved) return "checkmark-circle";
    if (isPending) return "hourglass-outline";
    if (isEligible) return "gift";
    return "lock-closed-outline";
  };
  // Couleur associée au statut (chip + icône de réclamation) — 1 couleur par état.
  const statusColor = (): string => {
    if (isInactive) return "#6366f1"; // indigo — offre non activée
    if (isRedeemed) return "#8b5cf6"; // violet — utilisé
    if (isApproved) return "#16a34a"; // vert — validé
    if (isPending) return "#f59e0b"; // orange — en attente
    if (isEligible) return d.color; // couleur du bonus — éligible
    return "#ef4444"; // rouge — non éligible
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
      return "Le fastfood n'a pas encore activé cette offre. Reviens plus tard.";
    if (isRedeemed)
      return "Tu as déjà utilisé ce code. Les compteurs repartent à zéro, tu peux re-devenir éligible.";
    if (isApproved)
      return "Ton code est prêt ! Tu peux l'obtenir dès maintenant.";
    if (isPending) return "En attente de validation par le fastfood.";
    if (isEligible)
      return "Tu remplis les conditions. Appuie sur Réclamer pour obtenir ton bonus.";
    if (p.measurable && p.target > 0) {
      return p.unit === "FCFA"
        ? `Encore ${fmt(p.remaining)} FCFA à dépenser.`
        : `Encore ${p.remaining} commande${p.remaining > 1 ? "s" : ""}.`;
    }
    return "Remplis les conditions pour débloquer ce bonus.";
  };
  const claimAction = (): React.ReactNode => {
    if (isInactive) return null;
    if (isRedeemed) {
      return u ? (
        <BonusUsageRing used={u.used} limit={u.limit} color={d.color} />
      ) : null;
    }
    if (isApproved) {
      return (
        <TouchableOpacity
          style={[styles.claimRowBtn, { backgroundColor: "#16a34a" }]}
          activeOpacity={0.85}
        >
          <Text style={styles.claimRowBtnText}>Obtenir code</Text>
        </TouchableOpacity>
      );
    }
    if (isPending) return null;
    if (isEligible) {
      return (
        <TouchableOpacity
          style={[styles.claimRowBtn, { backgroundColor: d.color }]}
          onPress={() => onClaim(bonus)}
          disabled={claimStatus === "posting"}
          activeOpacity={0.85}
        >
          {claimStatus === "posting" ? (
            <ActivityIndicator color={LIGHT} size="small" />
          ) : (
            <Text style={styles.claimRowBtnText}>Réclamer</Text>
          )}
        </TouchableOpacity>
      );
    }
    return null;
  };

  const proposed = bonus.fastFoodBonusCount;
  const mine = bonus.userClaimedCount;
  const total = bonus.totalClaimedCount;
  const max = Math.max(proposed ?? 0, mine ?? 0, total ?? 0, 1);

  const bs = bonus.bonusStats;

  return (
    <View style={styles.root}>
      {/* Stats du bonus (Commandes / Montant) */}
      {bs ? <StatsPanel stats={bs} color={d.color} /> : null}

      {/* Carte principale */}
      <View style={styles.card}>
        <View style={styles.top}>
          <View style={styles.rewardBlock}>
            <Text style={styles.rewardValue} numberOfLines={1}>
              {rewardText(bonus)}
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
          <Text style={styles.description} numberOfLines={2}>
            {bonus.description}
          </Text>
        )}

        <View style={styles.progressWrap}>
          <BonusProgressBar
            progress={p.measurable ? p.progress : 1}
            color={d.color}
            trackColor={Theme.colors.gray[200]}
          />
          {p.measurable && p.target > 0 && (
            <Text style={styles.progressText}>
              {p.unit === "FCFA"
                ? `${fmt(p.current)} / ${fmt(p.target)} FCFA`
                : `${p.current} / ${p.target} commandes payées`}
            </Text>
          )}
        </View>

        <View style={styles.infoRow}>
          <Info label="Début" value={fmtDate(bonus.claimedAt)} />
          <Info
            label="Fin"
            value={fmtEndDate(bonus.claimedAt, bonus.claimDuration)}
          />
          <Info label="Durée" value={durationText(bonus)} />
        </View>
      </View>

      {/* Mini-cartes stats (sparkline + barre) */}
      <View style={styles.miniRow}>
        <MiniStat
          color={d.color}
          variant={0}
          title="Proposés"
          sub="par le fastfood"
          value={numOrDash(proposed)}
          ratio={(proposed ?? 0) / max}
        />
        <MiniStat
          color={d.color}
          variant={1}
          title="Mes reçus"
          sub="sur ce bonus"
          value={numOrDash(mine)}
          ratio={(mine ?? 0) / max}
        />
        <MiniStat
          color={d.color}
          variant={2}
          title="Distribués"
          sub="tous les users"
          value={numOrDash(total)}
          ratio={(total ?? 0) / max}
        />
      </View>

      {/* Ligne de réclamation */}
      <View style={styles.claimRow}>
        <View style={styles.claimRowLeft}>
          <View
            style={[styles.claimRowIcon, { backgroundColor: statusColor() }]}
          >
            <Ionicons name={claimIcon()} size={20} color={LIGHT} />
          </View>
          <View style={styles.claimRowText}>
            <Text style={styles.claimRowTitle}>{claimTitle()}</Text>
            <Text style={styles.claimRowDesc}>{claimDesc()}</Text>
          </View>
        </View>
        {claimAction()}
      </View>
    </View>
  );
};

/** Panneau stats propre à ce bonus (Commandes / Montant) */
const StatsPanel = ({
  stats,
  color,
}: {
  stats: NonNullable<Bonus["bonusStats"]>;
  color: string;
}) => {
  return (
    <View style={stylesStats.card}>
      <View style={stylesStats.row}>
        <View style={stylesStats.block}>
          <View style={stylesStats.head}>
            <Ionicons name="receipt-outline" size={14} color={color} />
            <Text style={stylesStats.title}>Commandes</Text>
          </View>
          <View style={stylesStats.cells}>
            <View style={stylesStats.cell}>
              <Text style={[stylesStats.cellValue, { color }]}>
                {stats.day.count}
              </Text>
              <Text style={stylesStats.cellKey}>Jour</Text>
            </View>
            <View style={stylesStats.cell}>
              <Text style={[stylesStats.cellValue, { color }]}>
                {stats.week.count}
              </Text>
              <Text style={stylesStats.cellKey}>Sem.</Text>
            </View>
            <View style={stylesStats.cell}>
              <Text style={[stylesStats.cellValue, { color }]}>
                {stats.month.count}
              </Text>
              <Text style={stylesStats.cellKey}>Mois</Text>
            </View>
          </View>
        </View>
        <View style={stylesStats.sep} />
        <View style={stylesStats.block}>
          <View style={stylesStats.head}>
            <Ionicons name="cash-outline" size={14} color={color} />
            <Text style={stylesStats.title}>Montant</Text>
          </View>
          <View style={stylesStats.cells}>
            <View style={stylesStats.cell}>
              <Text style={[stylesStats.cellValue, { color }]}>
                {fmtK(stats.week.amount)}
              </Text>
              <Text style={stylesStats.cellKey}>Sem.</Text>
            </View>
            <View style={stylesStats.cell}>
              <Text style={[stylesStats.cellValue, { color }]}>
                {fmtK(stats.month.amount)}
              </Text>
              <Text style={stylesStats.cellKey}>Mois</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const Info = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.info}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const MiniStat = ({
  color,
  variant,
  title,
  sub,
  value,
  ratio,
}: {
  color: string;
  variant: number;
  title: string;
  sub: string;
  value: string;
  ratio: number;
}) => (
  <View style={styles.mini}>
    <Text style={styles.miniTitle} numberOfLines={1}>
      {title}
    </Text>
    <Text style={styles.miniSub} numberOfLines={1}>
      {sub}
    </Text>
    <View style={styles.miniChart}>
      <BonusSparkline color={color} variant={variant} height={34} />
    </View>
    <View style={styles.miniBottom}>
      <View style={styles.miniBar}>
        <View
          style={[
            styles.miniBarFill,
            {
              width: `${Math.max(6, Math.min(100, ratio * 100))}%`,
              backgroundColor: color,
            },
          ]}
        />
      </View>
      <Text style={styles.miniValue}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "space-around",
    paddingHorizontal: 16,
  },

  card: {
    backgroundColor: LIGHT,
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 18,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.06)",
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
  rewardBlock: { flex: 1 },
  rewardValue: { color: DARK, fontSize: 24, fontWeight: "800", marginTop: 2 },
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
  infoRow: { flexDirection: "row", justifyContent: "space-between" },
  info: { flex: 1 },
  infoLabel: { color: GRAY, fontSize: 12, fontWeight: "500" },
  infoValue: { color: DARK, fontSize: 16, fontWeight: "800", marginTop: 2 },
  miniRow: { flexDirection: "row", gap: 10 },
  mini: {
    flex: 1,
    backgroundColor: LIGHT,
    borderRadius: 16,
    padding: 10,
    gap: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  miniTitle: { color: DARK, fontSize: 13, fontWeight: "700" },
  miniSub: { color: GRAY_L, fontSize: 10, fontWeight: "500" },
  miniChart: { height: 34, marginVertical: 4 },
  miniBottom: { flexDirection: "row", alignItems: "center", gap: 6 },
  miniBar: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: Theme.colors.gray[100],
    overflow: "hidden",
  },
  miniBarFill: { height: "100%", borderRadius: 3 },
  miniValue: { color: DARK, fontSize: 13, fontWeight: "800" },

  // Ligne de réclamation : icône + texte + bouton
  claimRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: LIGHT,
    borderRadius: 20,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 6,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  claimRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  claimRowIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  claimRowText: { flex: 1, gap: 1 },
  claimRowTitle: { color: DARK, fontSize: 14, fontWeight: "700" },
  claimRowDesc: { color: GRAY, fontSize: 11, lineHeight: 15 },
  claimRowBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Theme.borderRadius.pill,
  },
  claimRowBtnText: { color: LIGHT, fontWeight: "800", fontSize: 13 },
});

// Styles du panneau stats propre à chaque bonus
const stylesStats = StyleSheet.create({
  card: {
    backgroundColor: LIGHT,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  row: { flexDirection: "row", alignItems: "stretch", paddingVertical: 14 },
  block: { flex: 1, gap: 4 },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
  },
  title: {
    fontSize: 11,
    fontWeight: "700",
    color: Theme.colors.gray[600],
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cells: { flexDirection: "row", marginTop: 4 },
  cell: { flex: 1, alignItems: "center" },
  cellValue: { fontSize: 18, fontWeight: "800", color: Theme.colors.dark },
  cellKey: { fontSize: 10, color: Theme.colors.gray[600], marginTop: 1 },
  sep: {
    width: 1,
    backgroundColor: Theme.colors.gray[200],
    marginHorizontal: 14,
    marginVertical: 4,
  },
});
