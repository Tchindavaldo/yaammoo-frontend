"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { t, useLanguage } from "@/src/i18n";
import { DS } from "@/src/theme/ds";

/**
 * « Nouveau design » : section Commandes (maquette O5), 6 statuts en grille
 * 3 colonnes + « Tout voir » vers la page commandes marchand.
 * Donnees d'EXEMPLE (pas encore branche au backend).
 */
type Ion = React.ComponentProps<typeof Ionicons>["name"];
const SAMPLE: { label: string; n: number; icon: Ion; hot?: boolean }[] = [
  { label: "En attente", n: 4, icon: "time-outline", hot: true },
  { label: "En cours", n: 3, icon: "flame-outline" },
  { label: "Terminées", n: 2, icon: "checkmark" },
  { label: "Livrées", n: 9, icon: "bicycle-outline" },
  { label: "Non livrées", n: 1, icon: "close" },
  { label: "Sur place", n: 5, icon: "storefront-outline" },
];

export function ShopOrdersSection() {
  useLanguage();
  // Onglet « Commandes » du marchand (navbar visible), pas la page plein ecran.
  const open = () => router.navigate("/(tabs)/boutique");
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 6 }}>
        <Text style={{ fontSize: 16, fontWeight: "600", color: DS.ink }}>
          {t("Commandes")}
          <Text style={{ fontSize: 12, color: DS.faint }}>{"  " + t("Aujourd'hui")}</Text>
        </Text>
        <Pressable onPress={open} hitSlop={10} style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: DS.accentInk }}>{t("Tout voir")}</Text>
          <Ionicons name="chevron-forward" size={14} color={DS.accentInk} />
        </Pressable>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {SAMPLE.map((s) => (
          <Pressable
            key={s.label}
            onPress={open}
            style={{ flexBasis: "31%", flexGrow: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 20, backgroundColor: DS.surface, gap: 6 }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 22, fontWeight: "600", color: s.hot ? DS.accentInk : DS.ink }}>{s.n}</Text>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: DS.bg, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={s.icon} size={13} color={s.hot ? DS.accent : DS.ink} />
              </View>
            </View>
            <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: "500", color: DS.muted }}>{t(s.label)}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
