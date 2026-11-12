"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useFastFoods } from "@/src/features/restaurants/hooks/useFastFoods";
import { t, useLanguage } from "@/src/i18n";
import { DS } from "@/src/theme/ds";

/**
 * « Nouveau design » : reste de la section Boutique (maquette G1), au style
 * des groupes de la page « Nouveau rôle » (StaffRoleSheet, copie R16).
 * Infos de droite = EXEMPLES (pas encore branche au backend).
 */
type Ion = React.ComponentProps<typeof Ionicons>["name"];
type Item = { icon: Ion; label: string; info: string; to: Href; hot?: boolean; wallet?: boolean };
const ITEMS: Item[] = [
  { icon: "information-circle-outline", label: "Information", info: "Ouverte", to: "/shop/edit" },
  { icon: "restaurant-outline", label: "Menu", info: "18 plats", to: "/shop/menu" },
  { icon: "wine-outline", label: "Boissons", info: "6", to: "/shop/drinks" },
  { icon: "people-outline", label: "Personnel", info: "3 membres", to: "/shop/staff" },
  { icon: "chatbubbles-outline", label: "Messages", info: "2 non lus", to: "/shop/messages", hot: true },
  { icon: "wallet-outline", label: "Portefeuille boutique", info: "128 500 F", to: "/shop/wallet", wallet: true },
];

export function ShopManageSection() {
  useLanguage();
  const { appleReviewMode } = useFastFoods();
  const items = ITEMS.filter((i) => !(i.wallet && appleReviewMode));
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 8 }}>
        <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 0.8, color: DS.muted }}>
          {t("BOUTIQUE")}
        </Text>
        <Text style={{ fontSize: 12, fontWeight: "700", color: DS.text2 }}>{items.length}</Text>
      </View>
      <View style={{ borderRadius: 20, padding: 6, gap: 4, backgroundColor: DS.surface }}>
        {items.map((i) => (
          <Pressable
            key={i.label}
            onPress={() => router.push(i.to)}
            accessibilityRole="button"
            style={{ height: 48, paddingLeft: 12, paddingRight: 10, borderRadius: 14, backgroundColor: DS.bg, flexDirection: "row", alignItems: "center", gap: 12 }}
          >
            <Ionicons name={i.icon} size={19} color={i.hot ? DS.accent : DS.ink} />
            <Text style={{ flex: 1, fontSize: 14.5, fontWeight: "600", color: DS.ink }}>{t(i.label)}</Text>
            <Text style={{ fontSize: 13, fontWeight: i.hot ? "600" : "500", color: i.hot ? DS.accentInk : DS.faint }}>
              {t(i.info)}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={DS.faint} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
