"use no memo"; // langue a chaud (cf. architecture/i18n.md)
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Grow, Legend, Slide, SlideBody, useGrow } from "./SlideParts";
import { DS } from "@/src/theme/ds";
import { t } from "@/src/i18n";
import { Bucket, axisLabel } from "../shopPeriod";
import { MerchantStats } from "../useMerchantStats";

/**
 * S12 — clients par bucket : nouveaux (1re commande dans la boutique) et
 * revenus (avaient deja commande avant).
 */
const BAR_MAX = 110;

export const LoyaltySlide: React.FC<{ stats: MerchantStats; bucket: Bucket; version: number }> = ({ stats, bucket, version }) => {
  const grow = useGrow(version);
  const s = stats.series;
  const max = Math.max(...s.map((p) => p.newClients + p.returning), 1);
  return (
    <Slide>
      <SlideBody full style={styles.body}>
        <Legend
          items={[
            { color: DS.accent, label: t("Nouveaux") },
            { color: DS.ink, label: t("Revenus") },
          ]}
        />
        <View style={styles.chart}>
          {s.map((p, i) => (
            <View key={p.start} style={styles.col}>
              <Grow p={grow} style={styles.stack}>
                <View style={{ height: Math.round((p.newClients / max) * BAR_MAX), backgroundColor: DS.accent }} />
                <View style={{ height: Math.round((p.returning / max) * BAR_MAX), backgroundColor: DS.ink }} />
              </Grow>
              <Text style={styles.letter}>{axisLabel(bucket, p.start, i)}</Text>
            </View>
          ))}
        </View>
      </SlideBody>
    </Slide>
  );
};

const styles = StyleSheet.create({
  body: { paddingTop: 10, paddingHorizontal: 12, paddingBottom: 8, justifyContent: "space-between" },
  chart: { flexDirection: "row", alignItems: "flex-end", gap: 8, flex: 1, marginTop: 8 },
  col: { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 4 },
  stack: { width: "100%", maxWidth: 22, borderRadius: 6, overflow: "hidden" },
  letter: { fontSize: 10, fontWeight: "600", color: DS.faint },
});
