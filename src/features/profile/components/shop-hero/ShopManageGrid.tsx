"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import React from "react";
import { Pressable, Text, View } from "react-native";
import type { BackTone } from "./ShopNewHeader";
import { Ionicons } from "@expo/vector-icons";
import { t, useLanguage } from "@/src/i18n";
import { DS } from "@/src/theme/ds";

/**
 * « Nouveau design » : section Gestion (maquette S1D) — grille 3x2 puis une
 * ligne Portefeuille. DESIGN SEUL : rien n'est branche, montant = EXEMPLE.
 */
type Ion = React.ComponentProps<typeof Ionicons>["name"];
const TILES: { icon: Ion; label: string; info: string; hot?: boolean; tone?: BackTone }[] = [
  { icon: "restaurant-outline", label: "Menu", info: "18 plats", tone: "plain" },
  { icon: "wine-outline", label: "Boissons", info: "6 boissons", tone: "black" },
  { icon: "people-outline", label: "Personnel", info: "3 membres", tone: "grey" },
  { icon: "notifications-outline", label: "Notifications", info: "Activées" },
  { icon: "chatbubbles-outline", label: "Messages", info: "2 non lus", hot: true },
  { icon: "information-circle-outline", label: "Information", info: "Ouverte" },
];

/** Essai : Menu / Boissons / Personnel changent le bouton retour du header. */
/** Variante de case : S1D (defaut), S1C, S1A (maquettes du canvas). */
export type GridVariant = "S1D" | "S1C" | "S1A";

export function ShopManageGrid({ onTone, variant = "S1D" }: { onTone?: (t: BackTone) => void; variant?: GridVariant }) {
  useLanguage();
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ paddingHorizontal: 6, fontSize: 16, fontWeight: "600", color: DS.ink }}>{t("Gestion")}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {TILES.map((x) => (
          <Pressable key={x.label} onPress={() => x.tone && onTone?.(x.tone)} style={{ flexBasis: "31%", flexGrow: 1, padding: variant === "S1A" ? 8 : 10, borderRadius: 18, backgroundColor: DS.surface, gap: variant === "S1C" ? 4 : 5 }}>
            {variant === "S1C" ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text numberOfLines={1} style={{ flex: 1, fontSize: 12, fontWeight: "600", color: DS.ink }}>{t(x.label)}</Text>
                <Ionicons name={x.icon} size={14} color={DS.ink} />
              </View>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: variant === "S1A" ? 8 : 6 }}>
                <View style={{ width: variant === "S1A" ? 28 : 22, height: variant === "S1A" ? 28 : 22, borderRadius: 14, backgroundColor: DS.bg, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={x.icon} size={variant === "S1A" ? 14 : 12} color={DS.ink} />
                </View>
                <Text numberOfLines={1} style={{ flex: 1, fontSize: variant === "S1A" ? 12 : 11.5, fontWeight: "600", color: DS.ink }}>{t(x.label)}</Text>
              </View>
            )}
            {variant !== "S1A" && (
              <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: x.hot ? "600" : "500", color: x.hot ? DS.accentInk : DS.muted }}>{t(x.info)}</Text>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}
