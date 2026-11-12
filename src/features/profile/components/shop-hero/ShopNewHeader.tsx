"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
// Copie de SettingsHeaderProfile pour le « Nouveau design » (maquette H9) :
// a gauche retour + Home, a droite nom de la boutique + e-mail + logo/initiale
// avec pastille. DESIGN SEUL : boutons non branches, nom boutique = EXEMPLE.
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { DS } from "@/src/theme/ds";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLanguage } from "@/src/i18n";

const SHOP_NAME = "Chez Mama Ndolé";

export function ShopNewHeader() {
  useLanguage();
  const { user, userData } = useAuth();
  const contact = userData?.infos.email || user?.email || userData?.infos.numero?.toString() || "";
  const initiale = SHOP_NAME.charAt(0).toUpperCase();

  return (
    <View style={styles.row}>
      <View style={styles.pill}>
        <Ionicons name="chevron-back" size={14} color={DS.muted} />
        <Ionicons name="home-outline" size={18} color={DS.ink} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{SHOP_NAME}</Text>
        {!!contact && <Text style={styles.contact} numberOfLines={1}>{contact}</Text>}
      </View>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initiale}</Text>
        <View style={styles.badge}>
          <Ionicons name="chevron-down" size={10} color={DS.onInk} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 14 },
  pill: {
    height: 40,
    paddingLeft: 10,
    paddingRight: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: DS.line,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  info: { flex: 1, minWidth: 0, alignItems: "flex-end" },
  name: { fontSize: 17, fontWeight: "800", color: DS.ink },
  contact: { marginTop: 3, fontSize: 13, fontWeight: "500", color: DS.muted },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: DS.bg,
    borderWidth: 1,
    borderColor: DS.line,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: DS.accent, fontSize: 20, fontWeight: "800" },
  badge: {
    position: "absolute",
    right: -3,
    bottom: -3,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: DS.ink,
    borderWidth: 2,
    borderColor: DS.bg,
    alignItems: "center",
    justifyContent: "center",
  },
});
