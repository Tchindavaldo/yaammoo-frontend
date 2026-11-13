"use no memo"; // langue a chaud (cf. architecture/i18n.md)
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Slide, SlideBody } from "./SlideParts";
import { DS } from "@/src/theme/ds";
import { t } from "@/src/i18n";

/**
 * H3 — pourquoi le chiffre d'affaires a bouge (maquette H3 du canvas) :
 * hausse + montants des deux periodes, barre noire/orange (plus de commandes
 * vs paniers plus gros) avec leurs chiffres, puis la phrase d'explication.
 * Donnees d'EXEMPLE.
 */
const SAMPLE = { growth: 20, now: "243 000 F", before: "202 500 F", ordersShare: 55, basketShare: 45 };

export const BasketSlide: React.FC<{ current: string; previous: string }> = ({ current, previous }) => (
  <Slide>
    <SlideBody full style={styles.body}>
      <View>
        <Text style={styles.kicker} numberOfLines={1}>{t("POURQUOI LE CHIFFRE D'AFFAIRES A MONTÉ")}</Text>
        <View style={styles.headline}>
          <Text style={styles.big}>+{SAMPLE.growth} %</Text>
          <View>
            <Text style={styles.label} numberOfLines={1}>{current}</Text>
            <Text style={styles.amount}>{SAMPLE.now}</Text>
          </View>
          <Text style={styles.vs}>{t("contre")}</Text>
          <View style={styles.shrink}>
            <Text style={styles.label} numberOfLines={1}>{previous}</Text>
            <Text style={[styles.amount, styles.amountOld]}>{SAMPLE.before}</Text>
          </View>
        </View>
      </View>

      <View style={styles.split}>
        <View style={[styles.part, { flex: SAMPLE.ordersShare, backgroundColor: DS.ink }]}>
          <Text style={styles.partTitle} numberOfLines={1}>{t("Plus de commandes")}</Text>
          <Text style={styles.partValue} numberOfLines={1}>
            81 <Text style={styles.upDark}>+11 %</Text>
          </Text>
        </View>
        <View style={[styles.part, { flex: SAMPLE.basketShare, backgroundColor: DS.accent }]}>
          <Text style={styles.partTitle} numberOfLines={1}>{t("Paniers plus gros")}</Text>
          <Text style={styles.partValue} numberOfLines={1}>
            3 000 F <Text style={styles.upPlain}>+8 %</Text>
          </Text>
        </View>
      </View>

      <View style={styles.tip}>
        <Ionicons name="bulb-outline" size={16} color={DS.accent} />
        <Text style={styles.tipText}>
          {t("Chaque client dépense")} <Text style={styles.bold}>{t("225 F de plus")}</Text> {t("par commande. Ça rapporte")}{" "}
          <Text style={styles.bold}>18 000 F</Text> {t("sur la période, sans aucun client en plus.")}
        </Text>
      </View>
    </SlideBody>
  </Slide>
);

const styles = StyleSheet.create({
  body: { justifyContent: "space-between", paddingVertical: 10, paddingHorizontal: 12 },
  kicker: { fontSize: 10, fontWeight: "500", letterSpacing: 0.4, color: DS.faint },
  headline: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 },
  big: { fontSize: 28, lineHeight: 30, fontWeight: "700", color: DS.ink },
  shrink: { flexShrink: 1 },
  label: { fontSize: 9.5, lineHeight: 11, letterSpacing: 0.3, color: DS.faint },
  amount: { fontSize: 12, lineHeight: 15, fontWeight: "600", color: DS.ink },
  amountOld: { color: DS.muted },
  vs: { fontSize: 11, color: DS.faint },
  split: { flexDirection: "row", height: 36, borderRadius: 8, overflow: "hidden" },
  part: { justifyContent: "center", paddingLeft: 10 },
  partTitle: { fontSize: 10.5, fontWeight: "600", color: DS.onInk },
  partValue: { fontSize: 10.5, fontWeight: "700", color: DS.onInk },
  upDark: { fontWeight: "600", color: DS.successOnDark },
  upPlain: { fontWeight: "600", color: DS.onInk },
  tip: { flexDirection: "row", gap: 8, alignItems: "flex-start", paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, backgroundColor: DS.surface },
  tipText: { flex: 1, fontSize: 11.5, lineHeight: 15, color: DS.ink },
  bold: { fontWeight: "700" },
});
