import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { BroadcastPlan, BroadcastQuota } from "../../types/broadcast.types";
import { monthLabel } from "../../utils/broadcastQuota";
import { BC, capsLabel } from "./broadcastTheme";

const LETTERS = ["L", "M", "M", "J", "V", "S", "D"];
const BAR_MAX = 40;

interface Props {
  plan: BroadcastPlan;
  quota: BroadcastQuota;
  now: Date;
}

/**
 * Carte calendrier : mois + plan, une barre par jour de la semaine (hauteur =
 * envois du jour), limites du plan toujours visibles, reste de la semaine.
 */
export const BroadcastWeekCard: React.FC<Props> = ({ plan, quota, now }) => {
  const weekPct = Math.round((quota.weekLeft / plan.weekLimit) * 100);

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Text style={styles.month}>{monthLabel(now)}</Text>
        <View style={styles.planChip}>
          <View style={styles.planDot} />
          <Text style={styles.planText}>{plan.label}</Text>
        </View>
      </View>

      <View style={styles.days}>
        {LETTERS.map((l, i) => {
          const n = quota.perDay[i];
          const isToday = i === quota.todayIndex;
          const future = i > quota.todayIndex;
          const barColor = isToday
            ? BC.accent
            : future
              ? BC.track
              : n > 0
                ? BC.ink
                : BC.idle;
          return (
            <View key={i} style={[styles.day, isToday && styles.dayToday]}>
              <View
                style={[
                  styles.bar,
                  {
                    height: future ? 4 : Math.min(BAR_MAX, 6 + n * 11),
                    backgroundColor: barColor,
                  },
                ]}
              />
              <Text style={[styles.letter, isToday && styles.letterToday]}>{l}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.stats}>
        <Stat value={String(plan.dayLimit)} label="PAR JOUR" />
        <Stat value={String(plan.weekLimit)} label="PAR SEMAINE" />
        <Stat value="00:00" label="REMISE À ZÉRO" />
      </View>

      <View style={styles.progressRow}>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${weekPct}%` }]} />
        </View>
        <Text style={styles.progressText}>
          <Text style={styles.progressStrong}>{quota.weekLeft}</Text>/{plan.weekLimit} cette
          semaine
        </Text>
      </View>
    </View>
  );
};

const Stat = ({ value, label }: { value: string; label: string }) => (
  <View style={styles.stat}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 28,
    backgroundColor: BC.surface,
  },
  top: {
    height: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 6,
  },
  month: { fontSize: 16, fontWeight: "600", color: BC.ink, letterSpacing: -0.2 },
  planChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 28,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "#fff",
  },
  planDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: BC.accent },
  planText: { fontSize: 12, fontWeight: "600", color: BC.ink },
  days: { flexDirection: "row", gap: 4 },
  day: {
    flex: 1,
    height: 76,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 16,
  },
  dayToday: { backgroundColor: "#fff" },
  bar: { width: 20, borderRadius: 6 },
  letter: { fontSize: 10, fontWeight: "600", color: BC.faint },
  letterToday: { color: BC.accentInk },
  stats: { flexDirection: "row", gap: 6 },
  stat: {
    flex: 1,
    gap: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "#fff",
  },
  statValue: { fontSize: 16, fontWeight: "600", color: BC.ink },
  statLabel: { ...capsLabel, fontWeight: "500", letterSpacing: 0.4 },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 6,
  },
  track: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: BC.track,
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: 3, backgroundColor: BC.accent },
  progressText: { fontSize: 12, color: BC.muted },
  progressStrong: { fontWeight: "600", color: BC.ink },
});
