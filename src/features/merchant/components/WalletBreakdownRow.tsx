import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { DS } from "@/src/theme/ds";
import { WalletBreakdown, WalletBalances } from "../services/walletNetwork";
import { t } from "@/src/i18n";

/**
 * Découpage des deux soldes du portefeuille (MTN / Orange) :
 * total = commandes (plats + courses) + frais de retrait (réserve qui paie le
 * retrait en espèces chez l'agent).
 */
const fmt = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} F`;

const COLUMNS: { key: keyof WalletBalances; label: string }[] = [
  { key: "mtn", label: "MTN" },
  { key: "orange", label: "Orange" },
];

export const WalletBreakdownRow: React.FC<{ breakdown: WalletBreakdown }> = ({ breakdown }) => (
  <View style={styles.row}>
    {COLUMNS.map(({ key, label }) => {
      const p = breakdown[key];
      return (
        <View key={key} style={styles.col}>
          <Text style={styles.title}>{label}</Text>
          <View style={styles.line}>
            <Text style={styles.lbl}>{t("Commandes")}</Text>
            <Text style={styles.val}>{fmt(p.orders)}</Text>
          </View>
          <View style={styles.line}>
            <Text style={styles.lbl}>{t("Frais de retrait")}</Text>
            <Text style={styles.val}>{fmt(p.fees)}</Text>
          </View>
          <View style={[styles.line, styles.totalLine]}>
            <Text style={styles.totalLbl}>{t("Total")}</Text>
            <Text style={styles.totalVal}>{fmt(p.total)}</Text>
          </View>
        </View>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  col: { flex: 1 },
  title: { fontSize: 12, fontWeight: "700", color: DS.muted, marginBottom: 4 },
  line: { flexDirection: "row", justifyContent: "space-between", marginTop: 2 },
  lbl: { fontSize: 11, color: DS.muted },
  val: { fontSize: 11, fontWeight: "600", color: DS.muted },
  totalLine: { marginTop: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: DS.line },
  totalLbl: { fontSize: 12, fontWeight: "700", color: DS.ink },
  totalVal: { fontSize: 12, fontWeight: "700", color: DS.ink },
});
