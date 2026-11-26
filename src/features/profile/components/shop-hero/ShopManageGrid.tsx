"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import React from "react";
import { Pressable, Text, View } from "react-native";
import type { BackTone } from "./ShopNewHeader";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { t, useLanguage } from "@/src/i18n";
import { DS } from "@/src/theme/ds";
import { useMerchantMode } from "@/src/features/merchant/context/MerchantModeContext";
import { CardSkeleton } from "@/src/components/CardSkeleton";
import { Count, ShopManageInfo, useShopManageInfo } from "./useShopManageInfo";

/**
 * « Nouveau design » : section Gestion (maquette S1D) — grille 3x2 puis une
 * ligne Portefeuille. Chiffres reels (useShopManageInfo), squelette pendant le chargement.
 */
type Ion = React.ComponentProps<typeof Ionicons>["name"];
/** Libelle de case : `null` = squelette. */
const n = (c: Count, one: string, many: string): string | null => (c === null ? null : t(c > 1 ? many : one, { n: c }));
const TILES: { icon: Ion; label: string; info: (i: ShopManageInfo) => string | null; hot?: (i: ShopManageInfo) => boolean; tone?: BackTone; href: string; perm?: string }[] = [
  { icon: "restaurant-outline", label: "Menu", perm: "menus.manage", href: "/shop/menu", info: (i) => n(i.menus, "{{n}} plat", "{{n}} plats"), tone: "plain" },
  { icon: "wine-outline", label: "Boissons", perm: "menus.manage", href: "/shop/drinks", info: (i) => n(i.drinks, "{{n}} boisson", "{{n}} boissons"), tone: "black" },
  { icon: "people-outline", label: "Personnel", perm: "staff.manage", href: "/shop/staff", info: (i) => n(i.members, "{{n}} membre", "{{n}} membres"), tone: "grey" },
  { icon: "megaphone-outline", label: "Annonces", perm: "notifications.send", href: "/shop/notifications", info: (i) => n(i.broadcastsLeft, "{{n}} restante", "{{n}} restantes") },
  { icon: "chatbubbles-outline", label: "Messages", perm: "support.reply", href: "/shop/messages", info: (i) => n(i.unread, "{{n}} non lu", "{{n}} non lus"), hot: (i) => !!i.unread },
  { icon: "bicycle-outline", label: "Livreurs", perm: "staff.manage", href: "/shop/drivers", info: (i) => (i.driverRequests ? n(i.driverRequests, "{{n}} demande", "{{n}} demandes") : i.driverRequests === null ? null : t("Demandes et équipe")), hot: (i) => !!i.driverRequests },
];

/** Essai : Menu / Boissons / Personnel changent le bouton retour du header. */
/** Variante de case : S1D (defaut), S1C, S1A (maquettes du canvas). */
export type GridVariant = "S1D" | "S1C" | "S1A";

export function ShopManageGrid({ onTone, variant = "S1D", refreshTick = 0 }: { onTone?: (t: BackTone) => void; variant?: GridVariant; refreshTick?: number }) {
  useLanguage();
  const info = useShopManageInfo(refreshTick);
  // Mode personnel : case hors permissions du role = grisee et inactive.
  const { can } = useMerchantMode();
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ paddingHorizontal: 6, fontSize: 16, fontWeight: "600", color: DS.ink }}>{t("Gestion")}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {TILES.map((x) => (
          <Pressable key={x.label} disabled={!!x.perm && !can(x.perm)} onPress={() => (onTone ? x.tone && onTone(x.tone) : router.push(x.href as any))} style={{ flexBasis: "31%", flexGrow: 1, padding: variant === "S1A" ? 8 : 10, borderRadius: 18, backgroundColor: DS.surface, gap: variant === "S1C" ? 4 : 5, opacity: x.perm && !can(x.perm) ? 0.4 : 1 }}>
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
            {variant !== "S1A" && (() => {
              const label = x.info(info);
              const hot = !!x.hot?.(info);
              return label === null ? (
                <View style={{ height: 13, width: "60%", borderRadius: 6, overflow: "hidden" }}><CardSkeleton radius={6} /></View>
              ) : (
                <Text numberOfLines={1} style={{ fontSize: 11, lineHeight: 13, fontWeight: hot ? "600" : "500", color: hot ? DS.accentInk : DS.muted }}>{label}</Text>
              );
            })()}
          </Pressable>
        ))}
      </View>
    </View>
  );
}
