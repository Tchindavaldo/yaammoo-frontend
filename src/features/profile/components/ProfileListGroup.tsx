"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
// Liste groupee du profil (maquette P1 du canvas, page « Profil ») : un titre,
// puis une carte grise de lignes icone + libelle + valeur + chevron.
import { DS } from "@/src/theme/ds";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Ion = React.ComponentProps<typeof Ionicons>["name"];

export const ProfileListGroup: React.FC<{ title?: string; compact?: boolean; children: React.ReactNode }> = ({ title, compact, children }) => {
  const rows = React.Children.toArray(children).filter(Boolean);
  if (rows.length === 0) return null;
  return (
    <View style={[styles.group, compact && styles.groupCompact]}>
      {!!title && <Text style={styles.title}>{title}</Text>}
      <View style={styles.card}>
        {rows.map((row, i) => (
          <React.Fragment key={i}>{row}</React.Fragment>
        ))}
      </View>
    </View>
  );
};

export const ProfileListRow: React.FC<{
  icon: Ion;
  title: string;
  hint?: string;
  onPress: () => void;
}> = ({ icon, title, hint, onPress }) => (
  <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
    <Ionicons name={icon} size={18} color={DS.ink} />
    <Text style={styles.label} numberOfLines={1}>{title}</Text>
    {!!hint && <Text style={styles.hint} numberOfLines={1}>{hint}</Text>}
    <Ionicons name="chevron-forward" size={14} color={DS.idle} />
  </Pressable>
);

/** Tuiles sur une ligne (maquette P1a2) : icone au-dessus du libelle. */
export const ProfileTiles: React.FC<{ items: { icon: Ion; title: string; onPress: () => void }[] }> = ({ items }) => (
  <View style={styles.tiles}>
    {items.map((it) => (
      <Pressable key={it.title} onPress={it.onPress} accessibilityRole="button" style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}>
        <Ionicons name={it.icon} size={20} color={DS.ink} />
        <Text style={styles.tileLabel} numberOfLines={1}>{it.title}</Text>
      </Pressable>
    ))}
  </View>
);

const styles = StyleSheet.create({
  tiles: { flexDirection: "row", gap: 8 },
  tile: { flex: 1, height: 72, borderRadius: 16, backgroundColor: DS.surface, justifyContent: "center", gap: 8, paddingHorizontal: 12 },
  tilePressed: { opacity: 0.7 },
  tileLabel: { fontSize: 13.5, fontWeight: "600", color: DS.ink },
  group: { gap: 8, marginTop: 16 },
  groupCompact: { marginTop: 4 },
  title: { marginHorizontal: 6, fontSize: 15, fontWeight: "600", color: DS.ink },
  // P1f : carte gris tres leger, aucun trait entre les lignes.
  card: { borderRadius: 16, backgroundColor: DS.bg, overflow: "hidden" },
  row: { height: 46, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14 },
  pressed: { backgroundColor: DS.surface },
  label: { flex: 1, fontSize: 14, fontWeight: "500", color: DS.ink },
  hint: { maxWidth: 140, fontSize: 12.5, color: DS.faint },
});
