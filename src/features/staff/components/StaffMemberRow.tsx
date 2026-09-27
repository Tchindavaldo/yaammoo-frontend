import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { StaffMember } from "../types/staff.types";
import { formatPhone, memberInitials, memberName } from "../utils/staffFormat";
import { StaffAvatar } from "./StaffAvatar";
import { ST } from "./staffTheme";

interface Props {
  member: StaffMember;
  /** Hôte : carte claire (défaut), sombre (« Accès complet ») ou groupe gris Bento (ligne blanche). */
  tone?: "light" | "dark" | "group";
  onPress: () => void;
}

/**
 * Ligne d'un membre dans une carte de rôle dépliée : avatar, nom, numéro, et
 * statut (invitation en attente / accès coupé) à la place du chevron.
 */
export const StaffMemberRow: React.FC<Props> = ({ member, tone = "light", onPress }) => {
  const dark = tone === "dark";
  const suspended = !member.active;
  const invited = !suspended && !member.userId;
  const sub = suspended
    ? "Accès suspendu"
    : invited
      ? "Pas encore connecté"
      : formatPhone(member.phoneNumber);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: dark ? "rgba(255,255,255,0.08)" : tone === "group" ? "#fff" : ST.surface },
        pressed && { opacity: 0.7 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={memberName(member)}
    >
      <StaffAvatar
        label={memberInitials(member)}
        variant={suspended ? "muted" : invited ? "invited" : dark ? "accent" : tone === "group" ? "light" : "white"}
      />
      <View style={styles.texts}>
        <Text
          style={[styles.name, { color: dark ? "#fff" : suspended ? ST.muted : ST.ink }]}
          numberOfLines={1}
        >
          {memberName(member)}
        </Text>
        <Text style={[styles.sub, dark && { color: "rgba(255,255,255,0.6)" }]} numberOfLines={1}>
          {sub}
        </Text>
      </View>
      {suspended ? (
        <View style={[styles.chip, { backgroundColor: dark ? "rgba(255,255,255,0.14)" : ST.track }]}>
          <Text style={[styles.chipText, { color: dark ? "#fff" : ST.text2 }]}>Accès coupé</Text>
        </View>
      ) : invited ? (
        <View style={[styles.chip, { backgroundColor: dark ? "rgba(236,73,19,0.2)" : ST.accentTint }]}>
          <Text style={[styles.chipText, { color: dark ? ST.accentOnInk : ST.accentText }]}>
            Invitation
          </Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={16} color={dark ? "rgba(255,255,255,0.5)" : ST.faint} />
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    height: 60,
    paddingHorizontal: 12,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  texts: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: "700" },
  sub: { fontSize: 13, color: ST.muted },
  chip: { height: 24, paddingHorizontal: 10, borderRadius: 12, justifyContent: "center" },
  chipText: { fontSize: 12, fontWeight: "700" },
});
