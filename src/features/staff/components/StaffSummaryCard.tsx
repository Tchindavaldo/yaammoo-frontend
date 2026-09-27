import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { capsLabel, ST } from "./staffTheme";

const SIZE = 88;
const STROKE = 9;
const R = (SIZE - STROKE) / 2 - 0.5;
const C = 2 * Math.PI * R;
const GAP = 4;

interface Props {
  ownerName: string;
  roles: number;
  members: number;
  drivers: number;
}

const PARTS = [
  { key: "roles", label: "Rôles", color: ST.ink },
  { key: "members", label: "Membres", color: ST.accent },
  { key: "drivers", label: "Livreurs", color: ST.faint },
] as const;

/**
 * Carte d'en-tête de Personnel (thème de l'anneau « Par rôle ») : qui gère
 * la boutique, et un anneau réparti entre rôles, membres et livreurs.
 */
export const StaffSummaryCard: React.FC<Props> = ({ ownerName, roles, members, drivers }) => {
  const values = { roles, members, drivers };
  const total = roles + members + drivers;
  let offset = 0;

  return (
    <View style={styles.card}>
      <View style={styles.ringWrap}>
        <View style={styles.rotate}>
          <Svg width={SIZE} height={SIZE}>
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke={ST.track} strokeWidth={STROKE} />
            {total > 0 &&
              PARTS.map((p) => {
                const v = values[p.key];
                if (!v) return null;
                const len = Math.max((v / total) * C - GAP, 1);
                const el = (
                  <Circle
                    key={p.key}
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={R}
                    fill="none"
                    stroke={p.color}
                    strokeWidth={STROKE}
                    strokeDasharray={`${len} ${C - len}`}
                    strokeDashoffset={-(offset + GAP / 2)}
                  />
                );
                offset += (v / total) * C;
                return el;
              })}
          </Svg>
        </View>
        <View style={styles.ringCenter} pointerEvents="none">
          <Text style={styles.ringValue}>{members + drivers}</Text>
          <Text style={[capsLabel, styles.ringCaption]}>ÉQUIPE</Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={{ gap: 2 }}>
          <Text style={styles.caption}>Gérant · accès complet</Text>
          <Text style={styles.title} numberOfLines={1}>{ownerName}</Text>
        </View>
        <View style={styles.legend}>
          {PARTS.map((p) => (
            <View key={p.key} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: p.color }]} />
              <Text style={styles.legendText}>
                {values[p.key]} {p.label.toLowerCase()}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    minHeight: 112,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 16,
    borderRadius: 24,
    backgroundColor: ST.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  ringWrap: { width: SIZE, height: SIZE },
  rotate: { transform: [{ rotate: "-90deg" }] },
  ringCenter: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  ringValue: { fontSize: 24, fontWeight: "800", letterSpacing: -0.8, color: ST.ink },
  ringCaption: { fontSize: 10, marginTop: 1 },
  body: { flex: 1, gap: 10 },
  caption: { fontSize: 12, fontWeight: "700", color: ST.accentText },
  title: { fontSize: 17, fontWeight: "800", color: ST.ink },
  legend: { flexDirection: "row", flexWrap: "wrap", columnGap: 10, rowGap: 4 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, fontWeight: "600", color: ST.text2 },
});
