"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { t, useLanguage } from "@/src/i18n";
import { DS } from "@/src/theme/ds";
import { useMerchant } from "@/src/features/merchant/hooks/useMerchant";
import { ShopPeriod, periodLabel, toISO } from "./shopPeriod";
import { ShopPeriodSheet } from "./ShopPeriodSheet";

/**
 * « Nouveau design » : section Commandes (maquette O5), 6 statuts en grille
 * 3 colonnes + « Tout voir » vers la page commandes marchand.
 * Commandes de la boutique (MerchantContext) sur la periode choisie (defaut :
 * aujourd'hui ; appui sur le titre = choix de la date). Jour d'une commande =
 * date de livraison / retrait (a defaut, date de creation). Hors panier.
 */
type Ion = React.ComponentProps<typeof Ionicons>["name"];
type Tile = { label: string; icon: Ion; hot?: boolean; match: (status: string, delivered: boolean) => boolean };
const TILES: Tile[] = [
  { label: "En attente", icon: "time-outline", hot: true, match: (s) => s === "pending" },
  { label: "En cours", icon: "flame-outline", match: (s) => s === "processing" || s === "delivering" },
  // Terminees = pretes, pas encore remises (livraison ou retrait).
  { label: "Terminées", icon: "checkmark", match: (s) => s === "finished" },
  { label: "Livrées", icon: "bicycle-outline", match: (s, d) => s === "delivered" && d },
  { label: "Non livrées", icon: "close", match: (s) => s.startsWith("cancel") },
  { label: "Sur place", icon: "storefront-outline", match: (s, d) => s === "delivered" && !d },
];

export function ShopOrdersSection() {
  useLanguage();
  const { orders, ensureLoaded } = useMerchant();
  useEffect(() => {
    ensureLoaded();
  }, [ensureLoaded]);
  const todayISO = toISO(new Date());
  const [period, setPeriod] = useState<ShopPeriod>({ kind: "range", from: todayISO, to: todayISO });
  const [sheetOpen, setSheetOpen] = useState(false);
  const counts = useMemo(() => {
    const list = (orders || []).filter((o: any) => {
      if (!o || o.status === "pendingToBuy") return false;
      const day = o.delivery?.date || (o.createdAt ? toISO(new Date(o.createdAt)) : "");
      return day >= period.from && day <= period.to;
    });
    return TILES.map((tile) => list.filter((o: any) => tile.match(String(o.status || ""), o.delivery?.status === true)).length);
  }, [orders, period]);
  const label = period.from === period.to && period.from === todayISO ? t("Aujourd'hui") : periodLabel(period);
  // Onglet « Commandes » du marchand (navbar visible), pas la page plein ecran.
  const open = () => router.navigate("/(tabs)/boutique");
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 6 }}>
        <Pressable onPress={() => setSheetOpen(true)} hitSlop={8} accessibilityRole="button" style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: DS.ink }}>
            {t("Commandes")}
            <Text style={{ fontSize: 12, color: DS.faint }}>{"  " + label}</Text>
          </Text>
          <Ionicons name="chevron-down" size={13} color={DS.faint} />
        </Pressable>
        <Pressable onPress={open} hitSlop={10} style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: DS.accentInk }}>{t("Tout voir")}</Text>
          <Ionicons name="chevron-forward" size={14} color={DS.accentInk} />
        </Pressable>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {TILES.map((s, i) => (
          <Pressable
            key={s.label}
            onPress={open}
            style={{ flexBasis: "31%", flexGrow: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 20, backgroundColor: DS.surface, gap: 6 }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 22, fontWeight: "600", color: s.hot ? DS.accentInk : DS.ink }}>{counts[i]}</Text>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: DS.bg, alignItems: "center", justifyContent: "center" }}>
                <Ionicons name={s.icon} size={13} color={s.hot ? DS.accent : DS.ink} />
              </View>
            </View>
            <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: "500", color: DS.muted }}>{t(s.label)}</Text>
          </Pressable>
        ))}
      </View>
      <ShopPeriodSheet visible={sheetOpen} value={period} onClose={() => setSheetOpen(false)} onChange={setPeriod} />
    </View>
  );
}
