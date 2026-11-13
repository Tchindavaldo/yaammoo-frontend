"use no memo"; // langue a chaud (cf. architecture/i18n.md)
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Legend, Slide, SlideBody, SlideStats } from "./SlideParts";
import { DS } from "@/src/theme/ds";
import { t } from "@/src/i18n";

/**
 * H3 — pourquoi le chiffre d'affaires a bouge : part due a plus de commandes
 * vs part due a des paniers plus gros. Donnees d'EXEMPLE.
 */
const SAMPLE = { growth: 20, ordersShare: 55, basketShare: 45 };

export const BasketSlide: React.FC = () => (
  <Slide>
    <SlideBody style={styles.body}>
      <Text style={styles.kicker} numberOfLines={1}>{t("POURQUOI LE CHIFFRE D'AFFAIRES A MONTÉ")}</Text>
      <View style={styles.headline}>
        <Text style={styles.big}>+{SAMPLE.growth} %</Text>
        <Text style={styles.sub} numberOfLines={1}>243 000 F {t("contre")} 202 500 F</Text>
      </View>
      <View style={styles.split}>
        <View style={[styles.part, { flex: SAMPLE.ordersShare, backgroundColor: DS.ink }]}>
          <Text style={styles.partText}>{SAMPLE.ordersShare} %</Text>
        </View>
        <View style={[styles.part, { flex: SAMPLE.basketShare, backgroundColor: DS.accent }]}>
          <Text style={styles.partText}>{SAMPLE.basketShare} %</Text>
        </View>
      </View>
      <Legend
        items={[
          { color: DS.ink, label: t("Plus de commandes") },
          { color: DS.accent, label: t("Paniers plus gros") },
        ]}
      />
    </SlideBody>
    <SlideStats
      items={[
        { value: "81", label: t("COMMANDES") },
        { value: "3 000 F", label: t("PANIER MOYEN") },
        { value: "+225 F", label: t("PAR COMMANDE"), tone: "up" },
      ]}
    />
  </Slide>
);

const styles = StyleSheet.create({
  body: { justifyContent: "space-between", paddingVertical: 10, paddingHorizontal: 12 },
  kicker: { fontSize: 10, fontWeight: "500", letterSpacing: 0.4, color: DS.muted },
  headline: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  big: { fontSize: 24, fontWeight: "700", color: DS.ink },
  sub: { flexShrink: 1, fontSize: 11, color: DS.muted },
  split: { flexDirection: "row", height: 24, borderRadius: 7, overflow: "hidden" },
  part: { justifyContent: "center", paddingLeft: 8 },
  partText: { fontSize: 11, fontWeight: "700", color: DS.onInk },
});
