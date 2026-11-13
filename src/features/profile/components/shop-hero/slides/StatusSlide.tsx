"use no memo"; // langue a chaud (cf. architecture/i18n.md)
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LETTERS, Legend, Slide, SlideBody } from "./SlideParts";
import { DS } from "@/src/theme/ds";
import { t } from "@/src/i18n";

/** S7 — statuts par jour : livrees, sur place, en cours, annulees. Donnees d'EXEMPLE. */
// [livrees, sur place, en cours, annulees]
const DAYS: [number, number, number, number][] = [
  [5, 3, 0, 1], [8, 6, 1, 1], [4, 2, 0, 1], [7, 5, 1, 0], [10, 7, 2, 1], [11, 8, 3, 1], [2, 1, 1, 0],
];
const COLORS = [DS.ink, DS.faint, DS.idle, DS.accent];
const BAR_MAX = 115;

export const StatusSlide: React.FC = () => {
  const max = Math.max(...DAYS.map((d) => d.reduce((a, b) => a + b, 0)));
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
          {DAYS.map((d, i) => (
            <View key={i} style={styles.col}>
              <View style={styles.stack}>
                {[3, 2, 1, 0].map((k) =>
                  d[k] ? <View key={k} style={{ height: Math.round((d[k] / max) * BAR_MAX), backgroundColor: COLORS[k] }} /> : null,
                )}
              </View>
              <Text style={styles.letter}>{LETTERS[i]}</Text>
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
