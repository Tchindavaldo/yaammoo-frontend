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
 * affiche son contenu dessous ; seul Portefeuille est dessine (maquette Q1b).
 * Conteneur gris (comme le hero) qui prend tout l'espace restant de la page :
 * chips + cartes en haut, « Retirer » tout en bas.
 * DESIGN SEUL : rien n'est branche, montants = EXEMPLES.
 */
type Ion = React.ComponentProps<typeof Ionicons>["name"];
type Key = "info" | "messages" | "wallet";
const CHIPS: { key: Key; icon: Ion; label: string }[] = [
  { key: "info", icon: "information-circle-outline", label: "Boutique" },
  { key: "messages", icon: "settings-outline", label: "Général" },
  { key: "wallet", icon: "wallet-outline", label: "Portefeuille" },
];
const ROWS: { icon: Ion; label: string }[] = [
  { icon: "restaurant-outline", label: "Gestion des menus" },
  { icon: "wine-outline", label: "Gestion des boissons" },
  { icon: "people-outline", label: "Gestion du personnel" },
];

const GEN_ROWS: { icon: Ion; label: string }[] = [
  { icon: "create-outline", label: "Modifier les informations" },
  { icon: "chatbubbles-outline", label: "Consulter les messages" },
  { icon: "notifications-outline", label: "Gestion des notifications" },
];

/** Liste empilee (maquette R1) — non branchee, design seul. */
function InfoTab({ rows = ROWS }: { rows?: { icon: Ion; label: string }[] }) {
  return (
    <View style={{ gap: 4 }}>
      {rows.map((r) => (
        <View key={r.label} style={{ height: 48, paddingLeft: 12, paddingRight: 10, borderRadius: 14, backgroundColor: DS.bg, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Ionicons name={r.icon} size={19} color={DS.ink} />
          <Text numberOfLines={1} style={{ flex: 1, fontSize: 14.5, fontWeight: "600", color: DS.ink }}>{t(r.label)}</Text>
          <Ionicons name="chevron-forward" size={14} color={DS.faint} />
        </View>
      ))}
    </View>
  );
}

export function ShopBoutiqueTabs() {
  useLanguage();
  const { appleReviewMode } = useFastFoods();
  const chips = CHIPS.filter((c) => !(c.key === "wallet" && appleReviewMode));
  const [sel, setSel] = useState<Key>(appleReviewMode ? "info" : "wallet");
  return (
    <View style={{ flex: 1, gap: 10, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 28, backgroundColor: DS.surface }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -10, flexGrow: 0 }}
        contentContainerStyle={{ gap: 6, paddingHorizontal: 10 }}
      >
        {chips.map((c) => {
          const on = c.key === sel;
          return (
            <Pressable
              key={c.key}
              onPress={() => setSel(c.key)}
              accessibilityRole="button"
              style={{ height: 36, paddingLeft: 10, paddingRight: 14, borderRadius: 18, backgroundColor: on ? DS.ink : DS.bg, flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Ionicons name={c.icon} size={15} color={on ? DS.onInk : DS.ink} />
              <Text style={{ fontSize: 13, fontWeight: "600", color: on ? DS.onInk : DS.ink }}>{t(c.label)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {sel === "wallet" ? <WalletTab /> : sel === "info" ? <InfoTab /> : sel === "messages" ? <InfoTab rows={GEN_ROWS} /> : <View style={{ height: 150, borderRadius: 16, backgroundColor: DS.bg }} />}
    </View>
  );
}

const NETS = [
  { name: "ORANGE", color: DS.accent, value: "48 500 F", delta: "+ 4 500 F", up: true, orders: "46 200 F", fees: "2 300 F", pct: 95 },
  { name: "MTN", color: DS.mtn, value: "80 000 F", delta: "− 20 000 F", up: false, orders: "76 400 F", fees: "3 600 F", pct: 95.5 },
];

function WalletTab() {
  return (
    <View style={{ flex: 1, justifyContent: "space-between", gap: 10 }}>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {NETS.map((n) => (
          <View key={n.name} style={{ flex: 1, padding: 12, borderRadius: 16, backgroundColor: DS.bg, gap: 5 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: n.color }} />
              <Text style={{ fontSize: 10, fontWeight: "600", letterSpacing: 0.6, color: DS.muted }}>{n.name}</Text>
            </View>
            <View>
              <Text style={{ fontSize: 22, fontWeight: "600", color: DS.ink }}>{n.value}</Text>
              <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: "600", marginTop: 2, color: n.up ? DS.ink : DS.accentInk }}>
                {n.delta} <Text style={{ fontWeight: "500", color: DS.faint }}>{t("aujourd'hui")}</Text>
              </Text>
            </View>
            <View style={{ flexDirection: "row", height: 6, borderRadius: 3, overflow: "hidden", backgroundColor: DS.track, marginVertical: 3 }}>
              <View style={{ width: `${n.pct}%`, backgroundColor: DS.accent }} />
              <View style={{ width: `${100 - n.pct}%`, backgroundColor: DS.ink }} />
            </View>
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
