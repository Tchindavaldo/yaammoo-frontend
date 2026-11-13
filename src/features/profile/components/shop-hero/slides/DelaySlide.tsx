"use no memo"; // langue a chaud (cf. architecture/i18n.md)
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LETTERS, Slide, SlideBody, SlideStats } from "./SlideParts";
import { DS } from "@/src/theme/ds";
import { t } from "@/src/i18n";

/** S15 — delai moyen commande -> remise, par jour (minutes). Donnees d'EXEMPLE. */
const MINUTES = [18, 22, 16, 25, 28, 34, 15];
const BAR_MAX = 115;

export const DelaySlide: React.FC = () => {
  const max = Math.max(...MINUTES);
  return (
    <Slide>
      <SlideBody style={styles.chart}>
        {MINUTES.map((m, i) => {
          const worst = m === max;
          return (
            <View key={i} style={styles.col}>
              <Text style={[styles.value, worst && styles.accentText]}>{m}′</Text>
              <View style={[styles.bar, { height: Math.round((m / max) * BAR_MAX), backgroundColor: worst ? DS.accent : DS.ink, opacity: worst ? 1 : 0.8 }]} />
              <Text style={styles.letter}>{LETTERS[i]}</Text>
            </View>
          );
        })}
      </SlideBody>
      <SlideStats
        items={[
          { value: "24 min", label: t("PRÉPARATION") },
          { value: "19 min", label: t("LIVRAISON") },
          { value: "43 min", label: t("TOTAL") },
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
