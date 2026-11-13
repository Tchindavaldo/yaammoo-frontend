"use no memo"; // langue a chaud (cf. architecture/i18n.md)
import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { DS } from "@/src/theme/ds";

/**
 * Briques communes aux slides du carrousel du hero marchand : une zone
 * graphique de hauteur fixe + une rangee de 3 chiffres. Toutes les slides ont
 * ainsi la meme hauteur (pas de saut au glissement).
 */
export const BODY_H = 190;
export const LETTERS = ["L", "M", "M", "J", "V", "S", "D"];

export const SlideBody: React.FC<{ children: React.ReactNode; style?: ViewStyle }> = ({ children, style }) => (
  <View style={[styles.body, style]}>{children}</View>
);

export const SlideStats: React.FC<{ items: { value: string; label: string; tone?: "up" }[] }> = ({ items }) => (
  <View style={styles.stats}>
    {items.map((s, i) => (
      <View key={i} style={styles.stat}>
        <Text style={[styles.statValue, s.tone === "up" && styles.up]} numberOfLines={1}>{s.value}</Text>
        <Text style={styles.statLabel} numberOfLines={1}>{s.label}</Text>
      </View>
    ))}
  </View>
);

export const Legend: React.FC<{ items: { color: string; label: string }[] }> = ({ items }) => (
  <View style={styles.legend}>
    {items.map((it, i) => (
      <View key={i} style={styles.legendItem}>
        <View style={[styles.dot, { backgroundColor: it.color }]} />
        <Text style={styles.legendText} numberOfLines={1}>{it.label}</Text>
      </View>
    ))}
  </View>
);

export const Slide: React.FC<{ children: React.ReactNode }> = ({ children }) => <View style={styles.slide}>{children}</View>;

const styles = StyleSheet.create({
  slide: { gap: 10 },
  body: { height: BODY_H, borderRadius: 16, backgroundColor: DS.bg, overflow: "hidden" },
  stats: { flexDirection: "row", gap: 6 },
  stat: { flex: 1, gap: 1, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 14, backgroundColor: DS.bg },
  statValue: { fontSize: 16, fontWeight: "600", color: DS.ink },
  up: { color: DS.success },
  statLabel: { fontSize: 10, fontWeight: "500", letterSpacing: 0.4, color: DS.muted },
  legend: { flexDirection: "row", justifyContent: "center", gap: 10 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: 10, fontWeight: "500", color: DS.muted },
});
