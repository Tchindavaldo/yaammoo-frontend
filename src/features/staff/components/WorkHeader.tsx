"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
// Header du mode travail, copie de MerchantHomeHeader (R16) en miroir :
// avatar de la boutique (+ pastille) a GAUCHE, nom de la boutique + contact,
// et a DROITE le bouton filtres a la place de la pastille « Mode client ».
// Avatar et textes identiques a l'original (boutique).
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { DS } from "@/src/theme/ds";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useShopIdentity } from "@/src/features/merchant/hooks/useShopIdentity";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useMerchantMode } from "@/src/features/merchant/context/MerchantModeContext";
import { showToast } from "@/src/services/globalToast";
import { t, useLanguage } from "@/src/i18n";

export function WorkHeader({ onFilter }: { onFilter?: () => void }) {
  useLanguage();
  const { user, userData } = useAuth();
  const { fastFoodId, isDriverMode, can } = useMerchantMode();
  const contact = userData?.infos.email || user?.email || userData?.infos.numero?.toString() || "";
  const shop = useShopIdentity(isDriverMode ? null : fastFoodId);
  // Livreur : pas de boutique, son nom a la place.
  const person = [userData?.infos.prenom, userData?.infos.nom].filter(Boolean).join(" ");
  const name = isDriverMode ? person : shop?.name || "";
  const openShop = () => {
    if (isDriverMode) return;
    if (!can("fastfood.update")) return showToast(t("Vous n'avez pas les droits pour accéder à cela"), "error");
    router.push("/shop/edit");
  };

  return (
    <View style={styles.row}>
      {/* Avatar : ouvre les infos de la boutique (modification). */}
      <Pressable onPress={openShop} hitSlop={6} accessibilityRole="button" accessibilityLabel={t("Informations de la boutique")} style={styles.avatar}>
        {!isDriverMode && shop?.imageUrl ? (
          <Image source={{ uri: shop.imageUrl }} style={styles.logo} cachePolicy="memory-disk" transition={0} />
        ) : (
          <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
        )}
        {!isDriverMode && (
          <View style={styles.badge}>
            <Ionicons name="chevron-down" size={10} color={DS.onInk} />
          </View>
        )}
      </Pressable>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        {!!contact && <Text style={styles.contact} numberOfLines={1}>{contact}</Text>}
      </View>
      <Pressable onPress={onFilter} disabled={!onFilter} hitSlop={8} accessibilityRole="button" accessibilityLabel={t("Filtres")} style={[styles.pill, !onFilter && { opacity: 0.4 }]}>
        <Ionicons name="options-outline" size={18} color={DS.ink} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  pill: { height: 36, paddingHorizontal: 12, borderRadius: 18, backgroundColor: DS.surface, flexDirection: "row", alignItems: "center", gap: 6 },
  info: { flex: 1, minWidth: 0, alignItems: "flex-start" },
  name: { fontSize: 17, fontWeight: "800", color: DS.ink },
  contact: { marginTop: 3, fontSize: 13, fontWeight: "500", color: DS.muted },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: DS.bg, borderWidth: 1, borderColor: DS.line, justifyContent: "center", alignItems: "center" },
  logo: { width: 44, height: 44, borderRadius: 22 },
  avatarText: { color: DS.accent, fontSize: 20, fontWeight: "800" },
  badge: { position: "absolute", right: -3, bottom: -3, width: 20, height: 20, borderRadius: 10, backgroundColor: DS.ink, borderWidth: 2, borderColor: DS.bg, alignItems: "center", justifyContent: "center" },
});
