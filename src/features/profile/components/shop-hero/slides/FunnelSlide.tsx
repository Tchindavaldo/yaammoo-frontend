"use no memo"; // langue a chaud (cf. architecture/i18n.md)
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Slide, SlideBody } from "./SlideParts";
import { DS } from "@/src/theme/ds";
import { t } from "@/src/i18n";

/** S13 — entonnoir vues -> commandes. Donnees d'EXEMPLE. */
const STEPS = [
  { label: "Vues de la boutique", value: 1265 },
  { label: "Ouvertures", value: 412 },
  { label: "Ajouts au panier", value: 140 },
  { label: "Commandes", value: 88 },
];
const fmt = (n: number) => n.toLocaleString("fr-FR").replace(/ | /g, " ");

export const FunnelSlide: React.FC = () => (
  <Slide>
    <SlideBody full style={styles.body}>
      {STEPS.map((s, i) => {
        const pct = i === 0 ? null : Math.round((s.value / STEPS[i - 1].value) * 100);
        const last = i === STEPS.length - 1;
        return (
          <View key={i} style={styles.step}>
            <View style={styles.head}>
              <Text style={styles.label} numberOfLines={1}>{t(s.label)}</Text>
              <Text style={styles.value}>
                {fmt(s.value)}
                {pct === null ? "" : <Text style={styles.pct}>{`  ${pct} %`}</Text>}
              </Text>
            </View>
            <View style={[styles.bar, { width: `${Math.max(6, (s.value / STEPS[0].value) * 100)}%`, backgroundColor: last ? DS.accent : DS.ink }]} />
          </View>
        );
      })}
    </SlideBody>
  </Slide>
);

const styles = StyleSheet.create({
  body: { justifyContent: "space-between", paddingVertical: 10, paddingHorizontal: 12 },
  step: { gap: 4 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { flexShrink: 1, fontSize: 12, color: DS.ink },
  value: { fontSize: 12, fontWeight: "700", color: DS.ink },
  pct: { fontWeight: "400", color: DS.faint },
  bar: { height: 26, borderRadius: 6 },
});
