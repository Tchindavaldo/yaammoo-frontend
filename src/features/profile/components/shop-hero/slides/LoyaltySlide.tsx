"use no memo"; // langue a chaud (cf. architecture/i18n.md)
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LETTERS, Legend, Slide, SlideBody } from "./SlideParts";
import { DS } from "@/src/theme/ds";
import { t } from "@/src/i18n";

/**
 * S12 — clients du jour : nouveaux (1re commande dans la boutique) et revenus
 * (avaient deja commande avant). Donnees d'EXEMPLE.
 */
// [nouveaux, revenus]
const DAYS: [number, number][] = [[3, 4], [5, 6], [2, 3], [4, 5], [6, 7], [7, 8], [2, 2]];
const BAR_MAX = 110;

export const LoyaltySlide: React.FC = () => {
  const max = Math.max(...DAYS.map(([a, b]) => a + b));
  return (
    <Slide>
      <SlideBody full style={styles.body}>
        <View style={styles.chart}>
          {DAYS.map(([n, r], i) => (
            <View key={i} style={styles.col}>
              <View style={styles.stack}>
                <View style={{ height: Math.round((n / max) * BAR_MAX), backgroundColor: DS.accent }} />
                <View style={{ height: Math.round((r / max) * BAR_MAX), backgroundColor: DS.ink }} />
              </View>
              <Text style={styles.letter}>{LETTERS[i]}</Text>
            </View>
          ))}
        </View>
        <Legend
          items={[
            { color: DS.accent, label: t("Nouveaux") },
            { color: DS.ink, label: t("Revenus") },
          ]}
        />
      </SlideBody>
    </Slide>
  );
};

const styles = StyleSheet.create({
  body: { paddingTop: 10, paddingHorizontal: 12, paddingBottom: 8, justifyContent: "space-between" },
  chart: { flexDirection: "row", alignItems: "flex-end", gap: 8, flex: 1 },
  col: { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 4 },
  stack: { width: "100%", maxWidth: 22, borderRadius: 6, overflow: "hidden" },
  letter: { fontSize: 10, fontWeight: "600", color: DS.faint },
});
