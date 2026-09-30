// Contenu du TabHeader de Settings (maquette D, sans titre ni bouton d'edition) :
// avatar, nom + badge Marchand, contact, pastille comptes a droite.
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { DS } from "@/src/theme/ds";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAccounts } from "../hooks/useAccounts";
import { AccountSheet } from "./AccountSheet";
import { AccountSwitcherPill } from "./AccountSwitcherPill";

interface Props {
  onAddAccount: () => void;
}

export function SettingsHeaderProfile({ onAddAccount }: Props) {
  const { user, userData } = useAuth();
  const accounts = useAccounts();
  const [sheetOpen, setSheetOpen] = useState(false);

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
        <AccountSwitcherPill
          accounts={accounts}
          onPress={() => setSheetOpen(true)}
        />
      </View>
      <AccountSheet
        visible={sheetOpen}
        accounts={accounts}
        onClose={() => setSheetOpen(false)}
        onSelect={() => setSheetOpen(false)}
        onAddAccount={() => {
          setSheetOpen(false);
          onAddAccount();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  // Meme theme que l'avatar du header de l'accueil : fond blanc, filet
  // gris, initiale orange.
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: DS.bg,
    borderWidth: 1,
    borderColor: DS.line,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: DS.accent,
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
