"use no memo"; // langue a chaud (cf. architecture/i18n.md)
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LETTERS, Slide, SlideBody, SlideStats } from "./SlideParts";
import { DS } from "@/src/theme/ds";
import { t } from "@/src/i18n";

/** H1 — encaisse par jour (maquette K1a). Donnees d'EXEMPLE. */
const SAMPLE = { perDayK: [18, 32, 15, 27, 41, 45, 0], todayIndex: 5 };
const BAR_MAX = 70;

export const RevenueSlide: React.FC<{ periodLabel: string }> = ({ periodLabel }) => {
  const max = Math.max(...SAMPLE.perDayK.slice(0, SAMPLE.todayIndex + 1), 1);
  return (
    <Slide>
      <SlideBody style={styles.chart}>
        {LETTERS.map((l, i) => {
          const future = i > SAMPLE.todayIndex;
          const today = i === SAMPLE.todayIndex;
          const v = SAMPLE.perDayK[i];
          return (
            <View key={i} style={styles.col}>
              <Text style={[styles.value, today && styles.accentText]}>{future ? "" : `${v}k`}</Text>
              <View
                style={[
                  styles.bar,
                  {
                    height: future ? 6 : Math.max(6, Math.round((v / max) * BAR_MAX)),
                    backgroundColor: today ? DS.accent : future ? DS.track : DS.ink,
                    opacity: today || future ? 1 : 0.8,
                  },
                ]}
              />
              <Text style={[styles.letter, today && styles.accentText]}>{l}</Text>
            </View>
          );
        })}
      </SlideBody>
      <SlideStats
        items={[
          { value: "45 000 F", label: t("AUJOURD’HUI") },
          { value: "178 000 F", label: periodLabel },
          { value: "128 500 F", label: t("SOLDE") },
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
