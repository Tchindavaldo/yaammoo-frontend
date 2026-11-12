"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
// Copie de SettingsHeaderProfile pour le « Nouveau design » (maquette H9) :
// a gauche rond noir retour (vers l'accueil), a droite nom de la boutique + e-mail + logo/initiale
// avec pastille. Home -> accueil ; nom + photo = vraie boutique (GET /fastfood/:id).
// La pastille (bottom sheet) n'est pas encore branchee.
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { DS } from "@/src/theme/ds";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { broadcastService } from "@/src/features/merchant/services/broadcastService";
import { t, useLanguage } from "@/src/i18n";

export function ShopNewHeader() {
  useLanguage();
  const { user, userData } = useAuth();
  const contact = userData?.infos.email || user?.email || userData?.infos.numero?.toString() || "";
  const fastFoodId = userData?.fastFoodId;
  const [shop, setShop] = useState<{ name: string; imageUrl: string | null } | null>(null);
  useEffect(() => {
    if (!fastFoodId) return;
    let alive = true;
    broadcastService.getShop(fastFoodId).then((s) => alive && setShop(s), () => {});
    return () => {
      alive = false;
    };
  }, [fastFoodId]);
  const name = shop?.name || "";
  const initiale = name.charAt(0).toUpperCase();

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => router.navigate("/(tabs)")}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t("Retour à l'accueil")}
        style={styles.pill}
      >
        <Ionicons name="chevron-back" size={18} color={DS.onInk} />
      </Pressable>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        {!!contact && <Text style={styles.contact} numberOfLines={1}>{contact}</Text>}
      </View>
      <View style={styles.avatar}>
        {shop?.imageUrl ? (
          <Image source={{ uri: shop.imageUrl }} style={styles.logo} />
        ) : (
          <Text style={styles.avatarText}>{initiale}</Text>
        )}
        <View style={styles.badge}>
          <Ionicons name="chevron-down" size={10} color={DS.onInk} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 14 },
  pill: { width: 40, height: 40, borderRadius: 20, backgroundColor: DS.ink, alignItems: "center", justifyContent: "center" },
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
  logo: { width: 44, height: 44, borderRadius: 22 },
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
