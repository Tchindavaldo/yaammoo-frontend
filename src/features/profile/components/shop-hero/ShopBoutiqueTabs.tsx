"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFastFoods } from "@/src/features/restaurants/hooks/useFastFoods";
import { showToast } from "@/src/services/globalToast";
import { t, useLanguage } from "@/src/i18n";
import { DS } from "@/src/theme/ds";

/**
 * « Nouveau design » : section Boutique en chips (maquette B1). Chaque chip
 * affiche son contenu dessous ; seul Portefeuille est dessine (maquette Q1).
 * DESIGN SEUL : rien n'est branche, montants = EXEMPLES.
 */
type Ion = React.ComponentProps<typeof Ionicons>["name"];
type Key = "info" | "menu" | "drinks" | "staff" | "messages" | "wallet";
const CHIPS: { key: Key; icon: Ion; label: string }[] = [
  { key: "info", icon: "information-circle-outline", label: "Information" },
  { key: "menu", icon: "restaurant-outline", label: "Menu" },
  { key: "drinks", icon: "wine-outline", label: "Boissons" },
  { key: "staff", icon: "people-outline", label: "Personnel" },
  { key: "messages", icon: "chatbubbles-outline", label: "Messages" },
  { key: "wallet", icon: "wallet-outline", label: "Portefeuille" },
];

export function ShopBoutiqueTabs() {
  useLanguage();
  const { appleReviewMode } = useFastFoods();
  const chips = CHIPS.filter((c) => !(c.key === "wallet" && appleReviewMode));
  const [sel, setSel] = useState<Key>(appleReviewMode ? "info" : "wallet");
  return (
    <View style={{ gap: 10 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -16 }}
        contentContainerStyle={{ gap: 6, paddingHorizontal: 16 }}
      >
        {chips.map((c) => {
          const on = c.key === sel;
          return (
            <Pressable
              key={c.key}
              onPress={() => setSel(c.key)}
              accessibilityRole="button"
              style={{ height: 36, paddingLeft: 10, paddingRight: 14, borderRadius: 18, backgroundColor: on ? DS.ink : DS.surface, flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Ionicons name={c.icon} size={15} color={on ? DS.onInk : DS.ink} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: on ? DS.onInk : DS.ink }}>{t(c.label)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {sel === "wallet" ? <WalletTab /> : <View style={{ height: 150, borderRadius: 28, backgroundColor: DS.surface }} />}
    </View>
  );
}

const NETS = [
  { name: "ORANGE", color: DS.accent, value: "48 500 F", delta: "+ 4 500 F", up: true },
  { name: "MTN", color: DS.mtn, value: "80 000 F", delta: "− 20 000 F", up: false },
];

function WalletTab() {
  return (
    <View style={{ padding: 10, gap: 10, borderRadius: 28, backgroundColor: DS.surface }}>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {NETS.map((n) => (
          <View key={n.name} style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16, backgroundColor: DS.bg, gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: n.color }} />
              <Text style={{ fontSize: 10, fontWeight: "600", letterSpacing: 0.6, color: DS.muted }}>{n.name}</Text>
            </View>
            <Text style={{ fontSize: 20, fontWeight: "600", color: DS.ink }}>{n.value}</Text>
            <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: "600", color: n.up ? DS.ink : DS.accentInk }}>
              {n.delta} <Text style={{ fontWeight: "500", color: DS.faint }}>{t("aujourd'hui")}</Text>
            </Text>
          </View>
        ))}
      </View>
      <Pressable
        onPress={() => showToast(t("Bientôt disponible"), "info")}
        accessibilityRole="button"
        style={{ height: 44, borderRadius: 22, backgroundColor: DS.ink, alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ fontSize: 14, fontWeight: "600", color: DS.onInk }}>{t("Retirer")}</Text>
      </Pressable>
    </View>
  );
}
