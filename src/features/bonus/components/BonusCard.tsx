import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Theme } from "@/src/theme";
import type { Bonus, BonusClaimStatus, BonusRequestStatus } from "../types/bonus.types";
import { getBonusDescriptor } from "../config/bonusRegistry";
import { useBonusEligibility } from "../hooks/useBonusEligibility";
import { BonusProgressBar } from "./BonusProgressBar";

interface BonusCardProps {
  bonus: Bonus;
  claimStatus?: BonusClaimStatus;
  onClaim: (bonus: Bonus) => void;
}

const fmt = (n: number) => n.toLocaleString("fr-FR");
const numOrDash = (n?: number) => (typeof n === "number" ? fmt(n) : "—");

// La carte se fond dans le fond coloré : pas de fond ni bordure, tout en blanc.
const LIGHT = "#ffffff";
const LIGHT_DIM = "rgba(255,255,255,0.82)";
const GLASS = "rgba(255,255,255,0.18)";
const TRACK = "rgba(255,255,255,0.28)";
const LINE = "rgba(255,255,255,0.22)";

const rewardText = (bonus: Bonus): string => {
  const r = bonus.reward;
  if (r?.label) return r.label;
  if (typeof r?.value === "number") return `${fmt(r.value)}${r.unit ? " " + r.unit : ""}`;
  return getBonusDescriptor(bonus.type).label;
};

const STATUS_META: Record<BonusRequestStatus, { icon: any; text: string }> = {
  none: { icon: "ellipse-outline", text: "Pas encore réclamé" },
  pending: { icon: "hourglass-outline", text: "En attente de validation" },
  approved: { icon: "checkmark-circle", text: "Validé par le fastfood" },
};

/**
 * Carte "hero" d'un bonus — sans fond, fondue dans le fond coloré global.
 * Occupe toute la hauteur disponible (répartition haut / milieu / bas) et
 * expose : récompense, description, stats du bonus (proposés / pris), statut
 * de la demande, progression + CTA.
 */
export const BonusCard: React.FC<BonusCardProps> = ({ bonus, claimStatus = "idle", onClaim }) => {
  const d = getBonusDescriptor(bonus.type);
  const p = useBonusEligibility(bonus);

  // Statut effectif : une réclamation locale en cours prime sur le backend.
  const reqStatus: BonusRequestStatus =
    claimStatus === "pending" ? "pending" : bonus.requestStatus ?? "none";
  const status = STATUS_META[reqStatus];

  const progressLabel = p.measurable
    ? p.unit === "FCFA"
      ? `${fmt(p.current)} / ${fmt(p.target)} FCFA`
      : `${p.current} / ${p.target} commande${p.target > 1 ? "s" : ""}`
    : "";

  return (
    <View style={styles.card}>
      {/* HAUT : médaillon + provenance */}
      <View style={styles.top}>
        <View style={styles.medallion}>
          <Ionicons name={d.icon} size={30} color={LIGHT} />
        </View>
        <View style={styles.originPill}>
          <Ionicons name={bonus.isFastFoodBonus ? "storefront" : "sparkles"} size={11} color={LIGHT} />
          <Text style={styles.originText} numberOfLines={1}>
            {bonus.isFastFoodBonus ? bonus.fastFoodName || "Fastfood" : "Yaammoo"}
          </Text>
        </View>
      </View>

      {/* MILIEU : récompense, nom, description, stats bonus, statut demande */}
      <View style={styles.middle}>
        <Text style={styles.rewardLabel}>Récompense</Text>
        <Text style={styles.rewardValue} numberOfLines={2}>{rewardText(bonus)}</Text>
        <Text style={styles.name} numberOfLines={1}>{bonus.name}</Text>
        {!!bonus.description && (
          <Text style={styles.description} numberOfLines={2}>{bonus.description}</Text>
        )}

        {/* Stats du bonus */}
        <View style={styles.metaGrid}>
          <Meta value={numOrDash(bonus.fastFoodBonusCount)} label="Proposés" />
          <View style={styles.metaSep} />
          <Meta value={numOrDash(bonus.userClaimedCount)} label="Pris (moi)" />
          <View style={styles.metaSep} />
          <Meta value={numOrDash(bonus.totalClaimedCount)} label="Pris (tous)" />
        </View>

        {/* Statut de la demande */}
        <View style={styles.statusRow}>
          <Ionicons name={status.icon} size={14} color={LIGHT} />
          <Text style={styles.statusText}>{status.text}</Text>
        </View>
      </View>

      {/* BAS : progression + CTA */}
      <View style={styles.bottom}>
        {p.measurable && p.target > 0 && (
          <View style={styles.progressWrap}>
            <BonusProgressBar progress={p.progress} color={LIGHT} trackColor={TRACK} label={progressLabel} />
            <Text style={styles.stats}>
              {p.unit === "FCFA"
                ? `${fmt(p.current)} FCFA dépensés`
                : `${p.current} commande${p.current > 1 ? "s" : ""} payée${p.current > 1 ? "s" : ""}`}
            </Text>
          </View>
        )}

        {reqStatus === "pending" ? (
          <Badge icon="hourglass-outline" text="Demande en cours" />
        ) : reqStatus === "approved" ? (
          <Badge icon="checkmark-circle" text="Bonus validé" />
        ) : p.eligible ? (
          <TouchableOpacity
            style={styles.claimBtn}
            onPress={() => onClaim(bonus)}
            disabled={claimStatus === "posting"}
            activeOpacity={0.85}
          >
            {claimStatus === "posting" ? (
              <ActivityIndicator color={d.color} size="small" />
            ) : (
              <>
                <Ionicons name="gift" size={17} color={d.color} />
                <Text style={[styles.claimText, { color: d.color }]}>Réclamer</Text>
              </>
            )}
          </TouchableOpacity>
        ) : p.measurable ? (
          <Badge
            icon="lock-closed-outline"
            text={p.unit === "FCFA" ? `Encore ${fmt(p.remaining)} FCFA` : `Encore ${p.remaining} commande${p.remaining > 1 ? "s" : ""}`}
          />
        ) : (
          <Badge icon="information-circle-outline" text="Voir conditions" />
        )}
      </View>
    </View>
  );
};

const Meta = ({ value, label }: { value: string; label: string }) => (
  <View style={styles.meta}>
    <Text style={styles.metaValue}>{value}</Text>
    <Text style={styles.metaLabel}>{label}</Text>
  </View>
);

const Badge = ({ icon, text }: { icon: any; text: string }) => (
  <View style={styles.badge}>
    <Ionicons name={icon} size={15} color={LIGHT} />
    <Text style={styles.badgeText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: { flex: 1, alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8, paddingVertical: 12 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%" },
  medallion: { width: 60, height: 60, borderRadius: 22, backgroundColor: GLASS, justifyContent: "center", alignItems: "center" },
  originPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: GLASS,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Theme.borderRadius.pill,
    maxWidth: 160,
  },
  originText: { color: LIGHT, fontSize: 11, fontWeight: "700" },
  middle: { alignItems: "center", width: "100%", gap: 4 },
  rewardLabel: { color: LIGHT_DIM, fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.8 },
  rewardValue: { color: LIGHT, fontSize: 30, fontWeight: "800", textAlign: "center", lineHeight: 34 },
  name: { color: LIGHT, fontSize: 17, fontWeight: "700", textAlign: "center", marginTop: 4 },
  description: { color: LIGHT_DIM, fontSize: 13, lineHeight: 18, textAlign: "center" },
  metaGrid: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 14,
    paddingVertical: 4,
  },
  meta: { flex: 1, alignItems: "center" },
  metaValue: { color: LIGHT, fontSize: 19, fontWeight: "800" },
  metaLabel: { color: LIGHT_DIM, fontSize: 10, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.4 },
  metaSep: { width: 1, height: 30, backgroundColor: LINE },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 },
  statusText: { color: LIGHT, fontSize: 12, fontWeight: "600" },
  bottom: { width: "100%", gap: 12 },
  progressWrap: { width: "100%", gap: 6 },
  stats: { fontSize: 11, color: LIGHT_DIM, textAlign: "center" },
  claimBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: Theme.borderRadius.pill,
    backgroundColor: LIGHT,
  },
  claimText: { fontWeight: "800", fontSize: 15 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: Theme.borderRadius.pill,
    backgroundColor: GLASS,
  },
  badgeText: { color: LIGHT, fontSize: 13, fontWeight: "700" },
});
