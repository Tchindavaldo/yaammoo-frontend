"use no memo"; // langue a chaud (cf. architecture/i18n.md)
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View, ViewStyle } from "react-native";
import { DS } from "@/src/theme/ds";

/**
 * Briques communes aux slides du carrousel du hero marchand : une zone
 * graphique de hauteur fixe + une rangee de 3 chiffres. Toutes les slides ont
 * ainsi la meme hauteur (pas de saut au glissement).
 */
export const BODY_H = 125;
/** Hauteur d'une slide sans cases : zone graphique + cases + leur ecart. */
export const FULL_H = BODY_H + 60;
export const LETTERS = ["L", "M", "M", "J", "V", "S", "D"];

/** Progression 0 -> 1 relancee a chaque nouvelle `version` (donnees recues). */
export const useGrow = (version: number) => {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    v.setValue(0);
    Animated.timing(v, { toValue: 1, duration: 650, useNativeDriver: true }).start();
  }, [version, v]);
  return v;
};

/** Element qui pousse depuis le bas (`up`) ou depuis la gauche (`right`). */
export const Grow: React.FC<{ p: Animated.Value; dir?: "up" | "right"; style?: ViewStyle | ViewStyle[]; children?: React.ReactNode }> = ({ p, dir = "up", style, children }) => (
  <Animated.View
    style={[
      style,
      dir === "up"
        ? { transformOrigin: "bottom", transform: [{ scaleY: p }] }
        : { transformOrigin: "left", transform: [{ scaleX: p }] },
    ]}
  >
    {children}
  </Animated.View>
);

export const SlideBody: React.FC<{ children: React.ReactNode; style?: ViewStyle; full?: boolean }> = ({ children, style, full }) => (
  <View style={[styles.body, full && { height: FULL_H }, style]}>{children}</View>
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
