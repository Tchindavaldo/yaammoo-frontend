"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
// Header du mode travail (personnel / livreur), copie de MerchantHomeHeader (R16)
// INVERSEE : logo/initiale a gauche, nom + contact, et a droite l'icone de
// filtres (passe / futur / periodes) qui ouvre le sheet de filtres de la page.
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { DS } from "@/src/theme/ds";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useShopIdentity } from "@/src/features/merchant/hooks/useShopIdentity";
import { Image } from "expo-image";
import { useMerchantMode } from "@/src/features/merchant/context/MerchantModeContext";
import { t, useLanguage } from "@/src/i18n";

export function WorkHeader({ onFilter }: { onFilter?: () => void }) {
  useLanguage();
  const { user, userData } = useAuth();
  const { isDriverMode, fastFoodId, activeShop } = useMerchantMode();
  const contact = userData?.infos.email || user?.email || userData?.infos.numero?.toString() || "";
  const shop = useShopIdentity(isDriverMode ? null : fastFoodId);
  const person = [userData?.infos.prenom, userData?.infos.nom].filter(Boolean).join(" ");
  const name = isDriverMode ? person || t("Livreur") : shop?.name || activeShop?.name || "";
  const role = isDriverMode ? t("Livreur") : activeShop?.roleName || t("Personnel");

  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        {!isDriverMode && shop?.imageUrl ? (
          <Image source={{ uri: shop.imageUrl }} style={styles.logo} cachePolicy="memory-disk" transition={0} />
        ) : (
          <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <Text style={styles.contact} numberOfLines={1}>{contact ? `${role} · ${contact}` : role}</Text>
      </View>
      {!!onFilter && (
        <Pressable onPress={onFilter} hitSlop={8} accessibilityRole="button" accessibilityLabel={t("Filtres")} style={styles.filter}>
          <Ionicons name="options-outline" size={20} color={DS.ink} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  filter: { width: 40, height: 40, borderRadius: 20, backgroundColor: DS.surface, alignItems: "center", justifyContent: "center" },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 17, fontWeight: "800", color: DS.ink },
  contact: { marginTop: 3, fontSize: 13, fontWeight: "500", color: DS.muted },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: DS.bg, borderWidth: 1, borderColor: DS.line, justifyContent: "center", alignItems: "center" },
  logo: { width: 44, height: 44, borderRadius: 22 },
  avatarText: { color: DS.accent, fontSize: 20, fontWeight: "800" },
});
