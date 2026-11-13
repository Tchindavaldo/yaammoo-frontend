"use no memo"; // langue a chaud (cf. architecture/i18n.md)
import React from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { LETTERS, Slide, SlideBody, useGrow } from "./SlideParts";
import { DS } from "@/src/theme/ds";
import { MerchantStats } from "../useMerchantStats";

/** S6 — affluence jours x heures (10h -> 23h) : nombre de commandes. */
const HOURS = 14;
const FIRST_HOUR = 10;

export const HeatmapSlide: React.FC<{ stats: MerchantStats; version: number }> = ({ stats, version }) => {
  const grow = useGrow(version);
  const shades = [DS.surface, DS.accentAlpha(0.2), DS.accentAlpha(0.45), DS.accentAlpha(0.7), DS.accent];
  const grid = Array.from({ length: 7 }, () => Array<number>(HOURS).fill(0));
  stats.heatmap.forEach((c) => {
    const h = c.hour - FIRST_HOUR;
    if (c.dow >= 0 && c.dow < 7 && h >= 0 && h < HOURS) grid[c.dow][h] += c.count;
  });
  const max = Math.max(...grid.flat(), 1);
  const level = (n: number) => (n === 0 ? 0 : Math.max(1, Math.ceil((n / max) * 4)));
  return (
    <Slide>
      <SlideBody full style={styles.body}>
        {LETTERS.map((l, d) => (
          <View key={d} style={styles.row}>
            <Text style={styles.letter}>{l}</Text>
            {grid[d].map((n, h) => (
              <Animated.View key={h} style={[styles.cell, { backgroundColor: shades[level(n)], opacity: grow }]} />
            ))}
          </View>
        ))}
        <View style={styles.row}>
          <Text style={styles.letter} />
          <View style={styles.hours}>
            {["10h", "14h", "18h", "23h"].map((x) => (
              <Text key={x} style={styles.hour}>{x}</Text>
            ))}
          </View>
        </View>
      </SlideBody>
    </Slide>
  );
};

const styles = StyleSheet.create({
  body: { paddingVertical: 8, paddingHorizontal: 10, justifyContent: "space-between" },
  row: { flexDirection: "row", alignItems: "center", gap: 3 },
  letter: { width: 12, fontSize: 9, fontWeight: "600", color: DS.faint },
  cell: { flex: 1, height: 15, borderRadius: 4 },
  hours: { flex: 1, flexDirection: "row", justifyContent: "space-between" },
  hour: { fontSize: 9, color: DS.faint },
});
