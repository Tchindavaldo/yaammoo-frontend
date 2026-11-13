"use no memo"; // langue a chaud (cf. architecture/i18n.md)
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Slide, SlideBody, SlideStats } from "./SlideParts";
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
    <SlideBody style={styles.body}>
      {STEPS.map((s, i) => {
        const pct = i === 0 ? null : Math.round((s.value / STEPS[i - 1].value) * 100);
        const last = i === STEPS.length - 1;
        return (
          <View key={i} style={styles.row}>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.max(14, (s.value / STEPS[0].value) * 100)}%`, backgroundColor: last ? DS.accentTint : DS.track }]} />
              <Text style={styles.label} numberOfLines={1}>{t(s.label)}</Text>
            </View>
            <Text style={styles.value}>{fmt(s.value)}</Text>
            <Text style={styles.pct}>{pct === null ? "" : `${pct} %`}</Text>
          </View>
        );
      })}
    </SlideBody>
    <SlideStats
      items={[
        { value: "1 265", label: t("VUES") },
        { value: "412", label: t("OUVERTURES") },
        { value: "7 %", label: t("CONVERSION") },
      ]}
    />
  </Slide>
);

const styles = StyleSheet.create({
  body: { justifyContent: "space-between", paddingVertical: 10, paddingHorizontal: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, height: 22 },
  track: { flex: 1, height: 22, justifyContent: "center" },
  fill: { position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 6 },
  label: { paddingLeft: 8, fontSize: 11, fontWeight: "600", color: DS.ink },
  value: { width: 42, textAlign: "right", fontSize: 12, fontWeight: "700", color: DS.ink },
  pct: { width: 34, textAlign: "right", fontSize: 11, fontWeight: "500", color: DS.muted },
});
