"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFastFoods } from "@/src/features/restaurants/hooks/useFastFoods";
import { t, useLanguage } from "@/src/i18n";
import { DS } from "@/src/theme/ds";

/**
 * « Nouveau design » : section Gestion (maquette S1A) — grille 3x2 puis une
 * ligne Portefeuille. DESIGN SEUL : rien n'est branche, montant = EXEMPLE.
 */
type Ion = React.ComponentProps<typeof Ionicons>["name"];
const TILES: { icon: Ion; label: string }[] = [
  { icon: "restaurant-outline", label: "Menu" },
  { icon: "wine-outline", label: "Boissons" },
  { icon: "people-outline", label: "Personnel" },
  { icon: "notifications-outline", label: "Notifications" },
  { icon: "chatbubbles-outline", label: "Messages" },
  { icon: "information-circle-outline", label: "Information" },
];

export function ShopManageGrid() {
  useLanguage();
  const { appleReviewMode } = useFastFoods();
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ paddingHorizontal: 6, fontSize: 16, fontWeight: "600", color: DS.ink }}>{t("Gestion")}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {TILES.map((x) => (
          <View key={x.label} style={{ flexBasis: "31%", flexGrow: 1, padding: 8, borderRadius: 18, backgroundColor: DS.surface, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: DS.bg, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={x.icon} size={14} color={DS.ink} />
            </View>
            <Text numberOfLines={1} style={{ flex: 1, fontSize: 12, fontWeight: "600", color: DS.ink }}>{t(x.label)}</Text>
          </View>
        ))}
      </View>
      {!appleReviewMode && (
        <View style={{ borderRadius: 20, padding: 6, backgroundColor: DS.surface }}>
          <View style={{ height: 48, paddingLeft: 12, paddingRight: 10, borderRadius: 14, backgroundColor: DS.bg, flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Ionicons name="wallet-outline" size={19} color={DS.ink} />
            <Text numberOfLines={1} style={{ flex: 1, fontSize: 14.5, fontWeight: "600", color: DS.ink }}>{t("Consulter le portefeuille")}</Text>
            <Text style={{ fontSize: 13, color: DS.faint }}>128 500 F</Text>
            <Ionicons name="chevron-forward" size={14} color={DS.faint} />
          </View>
        </View>
      )}
    </View>
  );
}
