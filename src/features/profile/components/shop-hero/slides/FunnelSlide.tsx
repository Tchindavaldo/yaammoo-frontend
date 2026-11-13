"use no memo"; // langue a chaud (cf. architecture/i18n.md)
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Grow, Slide, SlideBody, useGrow } from "./SlideParts";
import { DS } from "@/src/theme/ds";
import { t } from "@/src/i18n";
import { MerchantStats } from "../useMerchantStats";

/** S13 — entonnoir vues -> commandes. */
const fmt = (n: number) => n.toLocaleString("fr-FR").replace(/ | /g, " ");

/** Taux de conversion vues -> commandes, pour le titre. */
export const conversionRate = (f: MerchantStats["funnel"]) => (f.views ? `${Math.round((f.orders / f.views) * 100)} %` : "0 %");

export const FunnelSlide: React.FC<{ stats: MerchantStats; version: number }> = ({ stats, version }) => {
  const grow = useGrow(version);
  const f = stats.funnel;
  const steps = [
    { label: "Vues de la boutique", value: f.views },
    { label: "Ouvertures", value: f.opens },
    { label: "Ajouts au panier", value: f.carts },
    { label: "Commandes", value: f.orders },
  ];
  const top = Math.max(steps[0].value, 1);
  return (
    <Slide>
      <SlideBody full style={styles.body}>
        {steps.map((s, i) => {
          const prev = i === 0 ? 0 : steps[i - 1].value;
          const pct = i === 0 ? null : prev ? Math.round((s.value / prev) * 100) : 0;
          const last = i === steps.length - 1;
          return (
            <View key={i} style={styles.step}>
              <View style={styles.head}>
                <Text style={styles.label} numberOfLines={1}>{t(s.label)}</Text>
                <Text style={styles.value}>
                  {fmt(s.value)}
                  {pct === null ? "" : <Text style={styles.pct}>{`  ${pct} %`}</Text>}
                </Text>
              </View>
              <Grow p={grow} dir="right" style={[styles.bar, { width: `${Math.max(6, Math.min(100, (s.value / top) * 100))}%`, backgroundColor: last ? DS.accent : DS.ink }]} />
            </View>
          );
        })}
      </SlideBody>
    </Slide>
  );
};

const styles = StyleSheet.create({
  body: { justifyContent: "space-between", paddingVertical: 10, paddingHorizontal: 12 },
  step: { gap: 4 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { flexShrink: 1, fontSize: 12, color: DS.ink },
  value: { fontSize: 12, fontWeight: "700", color: DS.ink },
  pct: { fontWeight: "400", color: DS.faint },
  bar: { height: 18, borderRadius: 6 },
});
