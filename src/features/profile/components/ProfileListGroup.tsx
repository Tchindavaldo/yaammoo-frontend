"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
// Liste groupee du profil (maquette P1 du canvas, page « Profil ») : un titre,
// puis une carte grise de lignes icone + libelle + valeur + chevron.
import { DS } from "@/src/theme/ds";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Ion = React.ComponentProps<typeof Ionicons>["name"];

export const ProfileListGroup: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  const rows = React.Children.toArray(children).filter(Boolean);
  if (rows.length === 0) return null;
  return (
    <View style={styles.group}>
      <Text style={styles.title}>{title}</Text>
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

const styles = StyleSheet.create({
  group: { gap: 8, marginTop: 16 },
  title: { marginHorizontal: 6, fontSize: 15, fontWeight: "600", color: DS.ink },
  // P1f : carte gris tres leger, aucun trait entre les lignes.
  card: { borderRadius: 16, backgroundColor: DS.surfaceSoft, overflow: "hidden" },
  row: { height: 46, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14 },
  pressed: { backgroundColor: DS.surface },
  label: { flex: 1, fontSize: 14, fontWeight: "500", color: DS.ink },
  hint: { maxWidth: 140, fontSize: 12.5, color: DS.faint },
});
