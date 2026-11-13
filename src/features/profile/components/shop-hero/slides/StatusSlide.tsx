"use no memo"; // langue a chaud (cf. architecture/i18n.md)
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Grow, Legend, Slide, SlideBody, useGrow } from "./SlideParts";
import { DS } from "@/src/theme/ds";
import { t } from "@/src/i18n";
import { Bucket, axisLabel } from "../shopPeriod";
import { MerchantStats } from "../useMerchantStats";

/** S7 — statuts par bucket : livrees, sur place, en cours, annulees. */
const COLORS = [DS.ink, DS.faint, DS.idle, DS.accent];
const BAR_MAX = 115;

/** Part des annulees, pour le titre. */
export const cancelRate = (s: MerchantStats) => {
  const all = s.orders + s.cancelled;
  return `${all ? Math.round((s.cancelled / all) * 100) : 0} % ${t("annulées")}`;
};

export const StatusSlide: React.FC<{ stats: MerchantStats; bucket: Bucket; version: number }> = ({ stats, bucket, version }) => {
  const grow = useGrow(version);
  const rows = stats.series.map((p) => [p.delivered, p.onSite, p.ongoing, p.cancelled]);
  const max = Math.max(...rows.map((d) => d.reduce((a, b) => a + b, 0)), 1);
  return (
    <Slide>
      <SlideBody full style={styles.body}>
        <Legend
          items={[
            { color: COLORS[0], label: t("Livrées") },
            { color: COLORS[1], label: t("Sur place") },
            { color: COLORS[2], label: t("En cours") },
            { color: COLORS[3], label: t("Annulées") },
          ]}
        />
        <View style={styles.chart}>
          {rows.map((d, i) => (
            <View key={i} style={styles.col}>
              <Grow p={grow} style={styles.stack}>
                {d.every((x) => !x) && <View style={{ height: 6, backgroundColor: DS.track }} />}
                {[3, 2, 1, 0].map((k) =>
                  d[k] ? <View key={k} style={{ height: Math.round((d[k] / max) * BAR_MAX), backgroundColor: COLORS[k] }} /> : null,
                )}
              </Grow>
              <Text style={styles.letter}>{axisLabel(bucket, stats.series[i].start, i)}</Text>
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
