"use no memo"; // langue a chaud (cf. architecture/i18n.md)
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LETTERS, Slide, SlideBody, SlideStats } from "./SlideParts";
import { DS } from "@/src/theme/ds";
import { t } from "@/src/i18n";

/** S6 — affluence jours x heures (10h -> 23h). Donnees d'EXEMPLE. */
const HOURS = 14;
// Intensite 0..4 par jour, generee de facon deterministe (pics midi et soir, week-end plus fort).
const level = (day: number, h: number) => {
  const hour = 10 + h;
  const base = hour >= 12 && hour <= 14 ? 2 : hour >= 18 && hour <= 21 ? 3 : hour === 15 || hour === 16 ? 0 : 1;
  const weekend = day >= 4 && day <= 5 ? 1 : 0;
  const quiet = day === 0 && (hour === 15 || hour === 16) ? -1 : 0;
  return Math.max(0, Math.min(4, base + weekend + quiet));
};

export const HeatmapSlide: React.FC = () => {
  const shades = [DS.surface, DS.accentAlpha(0.2), DS.accentAlpha(0.45), DS.accentAlpha(0.7), DS.accent];
  return (
    <Slide>
      <SlideBody style={styles.body}>
        {LETTERS.map((l, d) => (
          <View key={d} style={styles.row}>
            <Text style={styles.letter}>{l}</Text>
            {Array.from({ length: HOURS }, (_, h) => (
              <View key={h} style={[styles.cell, { backgroundColor: shades[level(d, h)] }]} />
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
      <SlideStats
        items={[
          { value: t("Sam.") + " 19h", label: t("CRÉNEAU FORT") },
          { value: t("Lun.") + " 15h", label: t("CRÉNEAU CREUX") },
          { value: "412", label: t("COMMANDES") },
        ]}
      />
    </Slide>
  );
};

const styles = StyleSheet.create({
  body: { paddingVertical: 8, paddingHorizontal: 10, justifyContent: "space-between" },
  row: { flexDirection: "row", alignItems: "center", gap: 3 },
  letter: { width: 12, fontSize: 9, fontWeight: "600", color: DS.faint },
  cell: { flex: 1, height: 16, borderRadius: 4 },
  hours: { flex: 1, flexDirection: "row", justifyContent: "space-between" },
  hour: { fontSize: 9, color: DS.faint },
});
