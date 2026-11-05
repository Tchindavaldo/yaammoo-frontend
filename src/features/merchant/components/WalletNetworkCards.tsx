"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { DS } from "@/src/theme/ds";
import { WalletBreakdown, WalletBalances } from "../services/walletNetwork";
import { t, useLanguage } from "@/src/i18n";

/**
 * Deux cartes cote a cote (MTN / Orange) sur fond gris : total, barre de
 * repartition, commandes + frais de retrait. Montants tels quels du backend.
 */
const fmt = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} F`;

const NETS: { key: keyof WalletBalances; label: string }[] = [
  { key: "mtn", label: "MTN" },
  { key: "orange", label: "Orange" },
];

export const WalletNetworkCards: React.FC<{ breakdown: WalletBreakdown }> = ({ breakdown }) => {
  useLanguage();

  return (
    <View style={s.row}>
      {NETS.map(({ key, label }) => {
        const p = breakdown[key];
        const total = p.total > 0 ? p.total : 1;
        const ordersPct = (p.orders / total) * 100;
        const feesPct = p.total > 0 ? Math.max((p.fees / total) * 100, 3) : 0;
        return (
          <View key={key} style={s.card}>
            <Text style={s.title}>{label}</Text>
            <Text style={s.total}>{fmt(p.total)}</Text>
            <View style={s.track}>
              <View style={{ width: `${ordersPct}%`, backgroundColor: DS.accent }} />
              <View style={{ width: `${feesPct}%`, backgroundColor: DS.ink }} />
            </View>
            <View style={s.legend}>
              <View style={[s.dot, { backgroundColor: DS.accent }]} />
              <Text style={[s.lbl, { flex: 1 }]}>{t("Commandes")}</Text>
              <Text style={s.val}>{fmt(p.orders)}</Text>
            </View>
            <View style={s.legend}>
              <View style={[s.dot, { backgroundColor: DS.ink }]} />
              <Text style={[s.lbl, { flex: 1 }]}>{t("Frais de retrait")}</Text>
              <Text style={s.val}>{fmt(p.fees)}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const s = StyleSheet.create({
  row: { flexDirection: "row", gap: 12, padding: 16, paddingBottom: 12 },
  card: { flex: 1, borderRadius: 16, padding: 14, gap: 4, backgroundColor: DS.surface },
  lbl: { fontSize: 12, color: DS.muted },
  val: { fontSize: 12, fontWeight: "600", color: DS.text2 },
  title: { fontSize: 12, fontWeight: "700", color: DS.muted },
  total: { fontSize: 22, fontWeight: "800", color: DS.ink, marginTop: 2 },
  track: {
    flexDirection: "row",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    backgroundColor: DS.track,
    marginVertical: 8,
  },
  legend: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
