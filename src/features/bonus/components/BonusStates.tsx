import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Ces états s'affichent sur le fond coloré de la page → tons blancs translucides.
const GLASS = "rgba(255,255,255,0.16)";
const GLASS_SOFT = "rgba(255,255,255,0.10)";
const LIGHT = "#ffffff";
const LIGHT_DIM = "rgba(255,255,255,0.8)";

/** Placeholder (skeleton) pendant le chargement des bonus, sur fond coloré. */
export const BonusSkeleton: React.FC = () => (
  <View style={styles.skelCard}>
    <View style={styles.skelHeader}>
      <View style={styles.skelMedallion} />
      <View style={styles.skelPill} />
    </View>
    <View style={[styles.skelLine, { width: "40%", height: 26, alignSelf: "center", marginTop: 8 }]} />
    <View style={[styles.skelLine, { width: "60%", alignSelf: "center" }]} />
    <View style={[styles.skelLine, { width: "80%", alignSelf: "center" }]} />
    <View style={[styles.skelBar, { marginTop: 20 }]} />
    <View style={[styles.skelBtn]} />
  </View>
);

/** État vide / erreur, avec message et icône (sur fond coloré). */
export const BonusEmptyState: React.FC<{ icon?: any; title: string; subtitle?: string }> = ({
  icon = "gift-outline",
  title,
  subtitle,
}) => (
  <View style={styles.empty}>
    <View style={styles.emptyIcon}>
      <Ionicons name={icon} size={40} color={LIGHT} />
    </View>
    <Text style={styles.emptyTitle}>{title}</Text>
    {!!subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}
  </View>
);

const styles = StyleSheet.create({
  skelCard: { flex: 1, marginHorizontal: 32, justifyContent: "center", gap: 12 },
  skelHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  skelMedallion: { width: 60, height: 60, borderRadius: 22, backgroundColor: GLASS },
  skelPill: { width: 90, height: 26, borderRadius: 13, backgroundColor: GLASS },
  skelLine: { height: 12, borderRadius: 6, backgroundColor: GLASS_SOFT },
  skelBar: { height: 8, borderRadius: 4, backgroundColor: GLASS_SOFT },
  skelBtn: { height: 48, borderRadius: 24, backgroundColor: GLASS, marginTop: 8 },
  empty: { alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 10 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: GLASS, justifyContent: "center", alignItems: "center" },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: LIGHT, textAlign: "center" },
  emptySubtitle: { fontSize: 13, color: LIGHT_DIM, textAlign: "center", lineHeight: 19 },
});
