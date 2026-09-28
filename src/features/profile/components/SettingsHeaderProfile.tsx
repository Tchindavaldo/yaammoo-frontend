// Contenu du TabHeader de Settings (maquette D, sans titre ni bouton d'edition) :
// avatar, nom + badge Marchand, contact.
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { DS } from "@/src/theme/ds";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export function SettingsHeaderProfile() {
  const { user, userData } = useAuth();

  const firebaseName = user?.displayName || "";
  const initiale =
    (userData?.infos.prenom || userData?.infos.nom || firebaseName)
      ?.charAt(0)
      ?.toUpperCase() || "U";
  const nomComplet =
    [userData?.infos.prenom, userData?.infos.nom].filter(Boolean).join(" ") ||
    firebaseName ||
    "Utilisateur";
  const contact =
    userData?.infos.email ||
    user?.email ||
    userData?.infos.numero?.toString() ||
    "";

  return (
    <View>
      <View style={styles.profileRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initiale}</Text>
        </View>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {nomComplet}
            </Text>
            {userData?.isMarchand && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Marchand</Text>
              </View>
            )}
          </View>
          {!!contact && (
            <Text style={styles.contact} numberOfLines={1}>
              {contact}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: DS.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: DS.bg,
    fontSize: 24,
    fontWeight: "800",
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  name: {
    flexShrink: 1,
    fontSize: 17,
    fontWeight: "800",
    color: DS.ink,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: DS.accentTint,
  },
  badgeText: {
    color: DS.accentText,
    fontSize: 11,
    fontWeight: "800",
  },
  contact: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: "500",
    color: DS.muted,
  },
});
