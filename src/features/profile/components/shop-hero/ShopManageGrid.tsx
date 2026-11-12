"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import React from "react";
import { Pressable, Text, View } from "react-native";
import type { PillTone } from "./ShopNewHeader";
import { Ionicons } from "@expo/vector-icons";
import { useFastFoods } from "@/src/features/restaurants/hooks/useFastFoods";
import { t, useLanguage } from "@/src/i18n";
import { DS } from "@/src/theme/ds";

/**
 * « Nouveau design » : section Gestion (maquette S1D) — grille 3x2 puis une
 * ligne Portefeuille. DESIGN SEUL : rien n'est branche, montant = EXEMPLE.
 */
type Ion = React.ComponentProps<typeof Ionicons>["name"];
const TILES: { icon: Ion; label: string; info: string; hot?: boolean; tone?: PillTone }[] = [
  { icon: "restaurant-outline", label: "Menu", info: "18 plats", tone: "white" },
  { icon: "wine-outline", label: "Boissons", info: "6 boissons", tone: "black" },
  { icon: "people-outline", label: "Personnel", info: "3 membres", tone: "orange" },
  { icon: "notifications-outline", label: "Notifications", info: "Activées" },
  { icon: "chatbubbles-outline", label: "Messages", info: "2 non lus", hot: true },
  { icon: "information-circle-outline", label: "Information", info: "Ouverte" },
];

/** Essai : Menu / Boissons / Personnel changent le fond du bouton Home (blanc / noir / orange). */
export function ShopManageGrid({ onTone }: { onTone?: (t: PillTone) => void }) {
  useLanguage();
  const { appleReviewMode } = useFastFoods();
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ paddingHorizontal: 6, fontSize: 16, fontWeight: "600", color: DS.ink }}>{t("Gestion")}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {TILES.map((x) => (
          <Pressable key={x.label} onPress={() => x.tone && onTone?.(x.tone)} style={{ flexBasis: "31%", flexGrow: 1, padding: 10, borderRadius: 18, backgroundColor: DS.surface, gap: 5 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: DS.bg, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={x.icon} size={12} color={DS.ink} />
              </View>
              <Text numberOfLines={1} style={{ flex: 1, fontSize: 11.5, fontWeight: "600", color: DS.ink }}>{t(x.label)}</Text>
            </View>
            <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: x.hot ? "600" : "500", color: x.hot ? DS.accentInk : DS.muted }}>{t(x.info)}</Text>
          </Pressable>
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
