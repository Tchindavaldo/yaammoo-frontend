"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
// Copie de ShopNewHeader pour le home marchand (maquette « Header variantes » D) :
// a gauche pastille « Mode client » (bascule le mode), a droite nom de la
// boutique + e-mail + logo/initiale avec pastille (pas encore branchee).
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { DS } from "@/src/theme/ds";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useShopIdentity } from "@/src/features/merchant/hooks/useShopIdentity";
import { Image } from "expo-image";
import { useMerchantMode } from "@/src/features/merchant/context/MerchantModeContext";
import { t, useLanguage } from "@/src/i18n";

export function MerchantHomeHeader() {
  useLanguage();
  const { setMerchantMode } = useMerchantMode();
  const { user, userData } = useAuth();
  const contact = userData?.infos.email || user?.email || userData?.infos.numero?.toString() || "";
  const fastFoodId = userData?.fastFoodId;
  const shop = useShopIdentity(fastFoodId);
  const name = shop?.name || "";

  return (
    <View style={styles.row}>
      <Pressable onPress={() => setMerchantMode(false)} hitSlop={8} accessibilityRole="button" style={styles.pill}>
        <Ionicons name="swap-horizontal" size={16} color={DS.ink} />
        <Text style={styles.pillText}>{t("Mode client")}</Text>
      </Pressable>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        {!!contact && <Text style={styles.contact} numberOfLines={1}>{contact}</Text>}
      </View>
      <View style={styles.avatar}>
        {shop?.imageUrl ? (
          <Image source={{ uri: shop.imageUrl }} style={styles.logo} cachePolicy="memory-disk" transition={0} />
        ) : (
          <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
        )}
        <View style={styles.badge}>
          <Ionicons name="chevron-down" size={10} color={DS.onInk} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  pill: { height: 36, paddingHorizontal: 12, borderRadius: 18, backgroundColor: DS.surface, flexDirection: "row", alignItems: "center", gap: 6 },
  pillText: { fontSize: 12.5, fontWeight: "600", color: DS.ink },
  info: { flex: 1, minWidth: 0, alignItems: "flex-end" },
  name: { fontSize: 17, fontWeight: "800", color: DS.ink },
  contact: { marginTop: 3, fontSize: 13, fontWeight: "500", color: DS.muted },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: DS.bg, borderWidth: 1, borderColor: DS.line, justifyContent: "center", alignItems: "center" },
  logo: { width: 44, height: 44, borderRadius: 22 },
  avatarText: { color: DS.accent, fontSize: 20, fontWeight: "800" },
  badge: { position: "absolute", right: -3, bottom: -3, width: 20, height: 20, borderRadius: 10, backgroundColor: DS.ink, borderWidth: 2, borderColor: DS.bg, alignItems: "center", justifyContent: "center" },
});
