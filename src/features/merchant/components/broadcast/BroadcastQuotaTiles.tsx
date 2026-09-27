import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { BroadcastPlan, BroadcastQuota } from "../../types/broadcast.types";
import { untilMidnight } from "../../utils/broadcastQuota";
import { BC, capsLabel } from "./broadcastTheme";

interface Props {
  plan: BroadcastPlan;
  quota: BroadcastQuota;
  now: Date;
}

/** Deux tuiles : reste du jour (sombre, une capsule par envoi) et compte à rebours. */
export const BroadcastQuotaTiles: React.FC<Props> = ({ plan, quota, now }) => {
  const reset = untilMidnight(now);

  return (
    <View style={styles.row}>
      <View style={[styles.tile, styles.dark]}>
        <View style={styles.head}>
          <Text style={styles.darkLabel}>Aujourd’hui</Text>
          <View style={[styles.icon, styles.darkIcon]}>
            <Ionicons name="notifications-outline" size={14} color={BC.accent} />
          </View>
        </View>
        <View style={styles.countRow}>
          <Text style={styles.count}>{quota.dayLeft}</Text>
          <Text style={styles.countOf}>/{plan.dayLimit}</Text>
        </View>
        <View style={styles.slots}>
          {Array.from({ length: plan.dayLimit }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.slot,
                { backgroundColor: i < quota.dayLeft ? BC.accent : "rgba(255,255,255,0.14)" },
              ]}
            />
          ))}
        </View>
      </View>

      <View style={[styles.tile, styles.light]}>
        <View style={styles.head}>
          <Text style={styles.lightLabel}>Remise à zéro</Text>
          <View style={[styles.icon, styles.lightIcon]}>
            <Ionicons name="refresh-outline" size={14} color={BC.ink} />
          </View>
        </View>
        <Text style={styles.reset}>
          {reset.h}
          <Text style={styles.resetUnit}>h</Text>
          {reset.m}
        </Text>
        <Text style={capsLabel}>SEMAINE · LUNDI</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10 },
  tile: {
    flex: 1,
    height: 112,
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 24,
  },
  dark: { backgroundColor: BC.ink },
  light: { backgroundColor: BC.surface },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  darkLabel: { fontSize: 13, fontWeight: "500", color: "rgba(255,255,255,0.62)" },
  lightLabel: { fontSize: 13, fontWeight: "500", color: BC.muted },
  icon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  darkIcon: { backgroundColor: "rgba(255,255,255,0.1)" },
  lightIcon: { backgroundColor: "#fff" },
  countRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  count: {
    fontSize: 40,
    lineHeight: 40,
    fontWeight: "600",
    letterSpacing: -1.6,
    color: "#fff",
    fontVariant: ["tabular-nums"],
  },
  countOf: { fontSize: 16, fontWeight: "500", color: "rgba(255,255,255,0.4)" },
  slots: { flexDirection: "row", gap: 4 },
  slot: { flex: 1, height: 6, borderRadius: 3 },
  reset: {
    fontSize: 28,
    lineHeight: 30,
    fontWeight: "600",
    letterSpacing: -1,
    color: BC.ink,
    fontVariant: ["tabular-nums"],
  },
  resetUnit: { fontSize: 15, color: BC.faint },
});
