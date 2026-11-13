"use no memo"; // langue a chaud (cf. architecture/i18n.md)
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Grow, Slide, SlideBody, SlideStats, useGrow } from "./SlideParts";
import { DS } from "@/src/theme/ds";
import { t } from "@/src/i18n";
import { Bucket, axisLabel, toISO } from "../shopPeriod";
import { MerchantStats, compact, money } from "../useMerchantStats";

/** H1 — encaisse par jour / semaine / mois (credits marchand). */
const BAR_MAX = 70;

/** Index du bucket qui contient aujourd'hui (-1 si hors periode). */
export const currentIndex = (series: { start: string }[]) => {
  const today = toISO(new Date());
  let idx = -1;
  series.forEach((p, i) => {
    if (p.start <= today) idx = i;
  });
  return idx;
};

export const RevenueSlide: React.FC<{ stats: MerchantStats; bucket: Bucket; version: number; periodLabel: string }> = ({ stats, bucket, version, periodLabel }) => {
  const grow = useGrow(version);
  const s = stats.series;
  const now = currentIndex(s);
  const today = toISO(new Date());
  const max = Math.max(...s.map((p) => p.revenue), 1);
  return (
    <Slide>
      <SlideBody style={styles.chart}>
        {s.map((p, i) => {
          const future = p.start > today;
          const cur = i === now && !future;
          return (
            <View key={p.start} style={styles.col}>
              <Text style={[styles.value, cur && styles.accentText]} numberOfLines={1}>{future ? "" : compact(p.revenue)}</Text>
              <Grow
                p={grow}
                style={[
                  styles.bar,
                  {
                    height: future ? 6 : Math.max(6, Math.round((p.revenue / max) * BAR_MAX)),
                    backgroundColor: cur ? DS.accent : future ? DS.track : DS.ink,
                    opacity: cur || future ? 1 : 0.8,
                  },
                ]}
              />
              <Text style={[styles.letter, cur && styles.accentText]}>{axisLabel(bucket, p.start, i)}</Text>
            </View>
          );
        })}
      </SlideBody>
      <SlideStats
        items={[
          { value: money(stats.revenueToday), label: t("AUJOURD’HUI") },
          { value: money(stats.revenue), label: periodLabel },
          { value: money(stats.balance), label: t("SOLDE") },
        ]}
      />
    </Slide>
  );
};

const styles = StyleSheet.create({
  chart: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingTop: 10, paddingHorizontal: 12 },
  col: { flex: 1, height: "100%", alignItems: "center", justifyContent: "flex-end", gap: 4 },
  value: { fontSize: 11, fontWeight: "600", color: DS.muted },
  bar: { width: "100%", maxWidth: 26, borderTopLeftRadius: 7, borderTopRightRadius: 7, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
  letter: { fontSize: 10, fontWeight: "600", color: DS.faint, paddingTop: 4, paddingBottom: 8 },
  accentText: { color: DS.accentInk },
});
