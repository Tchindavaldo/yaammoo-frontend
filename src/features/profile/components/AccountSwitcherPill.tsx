// Pastille claire du header Settings (fond blanc, filet gris, comme les tuiles) :
// 1 compte → icone personne + chevron ; 2 comptes → 2 avatars empiles ;
// plus de 2 → 2 avatars + « +n ». Ouvre AccountSheet.
import { DS } from "@/src/theme/ds";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { AccountEntry } from "../hooks/useAccounts";

const MAX_AVATARS = 2;
// Initiale orange pour le compte courant, grise pour les suivants.
const AVATAR_TEXT = [DS.accent, DS.text2];

interface Props {
  accounts: AccountEntry[];
  onPress: () => void;
}

export function AccountSwitcherPill({ accounts, onPress }: Props) {
  const shown = accounts.slice(0, MAX_AVATARS);
  const rest = accounts.length - shown.length;

  return (
    <TouchableOpacity
      style={styles.pill}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="Comptes"
    >
      {accounts.length <= 1 ? (
        <Ionicons name="person-outline" size={18} color={DS.ink} />
      ) : (
        <View style={styles.stack}>
          {shown.map((a, i) => (
            <View key={a.id} style={[styles.mini, i > 0 && styles.overlap]}>
              <Text
                style={[
                  styles.miniText,
                  { color: AVATAR_TEXT[i % AVATAR_TEXT.length] },
                ]}
              >
                {a.initiale}
              </Text>
            </View>
          ))}
          {rest > 0 && (
            <View style={[styles.mini, styles.overlap]}>
              <Text style={styles.moreText}>+{rest}</Text>
            </View>
          )}
        </View>
      )}
      <Ionicons name="chevron-down" size={14} color={DS.muted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: DS.bg,
    borderWidth: 1,
    borderColor: DS.line,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stack: { flexDirection: "row", marginLeft: -6 },
  // Bordure blanche = decoupe entre avatars empiles.
  mini: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: DS.bg,
    backgroundColor: DS.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  overlap: { marginLeft: -9 },
  miniText: { fontSize: 11, fontWeight: "800" },
  moreText: { color: DS.text2, fontSize: 10, fontWeight: "800" },
});
