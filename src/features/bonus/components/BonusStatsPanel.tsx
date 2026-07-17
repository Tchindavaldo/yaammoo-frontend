import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Theme } from "@/src/theme";
import type { OrderPeriodStats } from "../hooks/useOrderPeriodStats";

interface BonusStatsPanelProps {
  stats: OrderPeriodStats;
}

const fmtK = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `${n}`;

const LIGHT = "#ffffff";
const LIGHT_DIM = "rgba(255,255,255,0.72)";

/**
 * Panneau récap avec fond blanc et coins arrondis : deux blocs côte à côte —
 * Commandes et Montant. Dans chaque bloc, les 3 périodes (Jour / Semaine / Mois)
 * sont alignées horizontalement.
 */
export const BonusStatsPanel: React.FC<BonusStatsPanelProps> = ({ stats }) => {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Block
          icon="receipt-outline"
          title="Commandes"
          cells={[
            { k: "Jour", v: `${stats.day.count}` },
            { k: "Sem.", v: `${stats.week.count}` },
            { k: "Mois", v: `${stats.month.count}` },
          ]}
        />
        <View style={styles.sep} />
        <Block
          icon="cash-outline"
          title="Montant"
          cells={[
            { k: "Jour", v: fmtK(stats.day.amount) },
            { k: "Sem.", v: fmtK(stats.week.amount) },
            { k: "Mois", v: fmtK(stats.month.amount) },
          ]}
        />
      </View>
    </View>
  );
};

const Block = ({
  icon,
  title,
  cells,
}: {
  icon: any;
  title: string;
  cells: { k: string; v: string }[];
}) => (
  <View style={styles.block}>
    <View style={styles.head}>
      <Ionicons name={icon} size={14} color={LIGHT_DIM} />
      <Text style={styles.title}>{title}</Text>
    </View>
    <View style={styles.cells}>
      {cells.map((c) => (
        <View key={c.k} style={styles.cell}>
          <Text style={styles.cellValue}>{c.v}</Text>
          <Text style={styles.cellKey}>{c.k}</Text>
        </View>
      ))}
    </View>
  </View>
);

const DARK = Theme.colors.dark;
const GRAY = Theme.colors.gray[600];

const styles = StyleSheet.create({
  card: {
    backgroundColor: LIGHT,
    borderRadius: 24,
    marginHorizontal: 16,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "stretch",
    paddingVertical: 14,
  },
  block: { flex: 1, gap: 4 },
  head: { flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center" },
  title: {
    fontSize: 11,
    fontWeight: "700",
    color: GRAY,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cells: { flexDirection: "row", marginTop: 4 },
  cell: { flex: 1, alignItems: "center" },
  cellValue: { fontSize: 18, fontWeight: "800", color: DARK },
  cellKey: { fontSize: 10, color: GRAY, marginTop: 1 },
  sep: { width: 1, backgroundColor: Theme.colors.gray[200], marginHorizontal: 14, marginVertical: 4 },
});
