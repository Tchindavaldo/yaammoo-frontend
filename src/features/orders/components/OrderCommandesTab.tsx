import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { ScrollView, Text, View } from "react-native";
import { DS } from "@/src/theme/ds";
import { OrderItem } from "../utils/buildOrderItems";

/**
 * Onglet « Commandes » du détail client (`OrderBottomSheet`) : plat, extras,
 * boissons, ligne livraison et total. Sorti d'`OrderBottomSheet` (R4), rendu
 * inchangé.
 */

// Icônes alignées sur le bottom sheet du home (checkout/tabs/DetailTab).
const ITEM_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  menu: "fast-food-outline",
  extra: "add-circle-outline",
  drink: "wine-outline",
};

const ITEM_LABEL: Record<string, string> = {
  menu: "Menu",
  extra: "Extra",
  drink: "Boisson",
};

const CURRENCY = "XAF";

export function OrderCommandesTab({
  items,
  total,
  zone = "",
  deliveryPrice = 0,
  deliveryOffered = false,
  deliveryGrouped = false,
}: {
  items: OrderItem[];
  total: number;
  zone?: string;
  deliveryPrice?: number;
  /** Livraison offerte (deliveryOffer actif, couvert par le fastfood). */
  deliveryOffered?: boolean;
  /** La commande partage son deliveryGroupId avec au moins une autre du sheet. */
  deliveryGrouped?: boolean;
}) {
  const hasDelivery =
    deliveryPrice > 0 || !!zone || deliveryOffered || deliveryGrouped;
  // Offert prime sur le groupé : le client ne paie rien dans les deux cas, mais
  // « Offert » porte l'info commerciale (bonus / campagne).
  const deliveryLabel = deliveryOffered
    ? "Offert"
    : deliveryGrouped
      ? "Cmd groupée"
      : deliveryPrice > 0
        ? `${deliveryPrice} ${CURRENCY}`
        : "Inclus";
  if (items.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: 40,
        }}
      >
        <Text style={{ fontSize: 13, color: "#9CA3AF", fontStyle: "italic" }}>
          Aucun détail de commande disponible
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 0,
      }}
    >
      {/* Container arrondi : items scrollables + total fixe. Remplit la hauteur
          restante du sheet, collé net à la bande safe-area. */}
      <View
        style={{
          flex: 1,
          backgroundColor: DS.gray50,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: DS.gray100,
          overflow: "hidden",
        }}
      >
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 12 }}
        >
          {items.map((o, i) => {
            const unitPrice = o.unitPrice || 0;
            const lineTotal = unitPrice * o.qty;
            const icon = ITEM_ICONS[o.type || "menu"];
            const typeLabel = ITEM_LABEL[o.type || "menu"];

            return (
              <View
                key={i}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingVertical: 11,
                  borderBottomWidth:
                    i < items.length - 1 || hasDelivery ? 1 : 0,
                  borderBottomColor: DS.gray100,
                }}
              >
                {/* Plat : visuel du menu. Extra / boisson : icône. */}
                {o.type === "menu" && o.image ? (
                  <Image
                    source={{ uri: o.image }}
                    style={{ width: 34, height: 34, borderRadius: 9 }}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={150}
                  />
                ) : (
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 9,
                      backgroundColor:
                        o.type === "extra"
                          ? DS.accent50
                          : o.type === "drink"
                            ? "#EFF6FF"
                            : "#F0FDF4",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name={icon} size={16} color={DS.accent} />
                  </View>
                )}

                {/* Nom + type label */}
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: "#111827",
                    }}
                    numberOfLines={1}
                  >
                    {o.name}
                  </Text>
                  <Text
                    style={{
                      fontSize: 10,
                      color: "#9CA3AF",
                      marginTop: 1,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                      fontWeight: "600",
                    }}
                  >
                    {typeLabel}
                  </Text>
                </View>

                {/* Prix */}
                <View style={{ alignItems: "flex-end" }}>
                  {o.hasQty && o.qty > 1 ? (
                    <>
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "700",
                          color: "#111827",
                        }}
                      >
                        {lineTotal} {CURRENCY}
                      </Text>
                      <Text
                        style={{ fontSize: 10, color: "#9CA3AF", marginTop: 1 }}
                      >
                        {unitPrice} {CURRENCY} × {o.qty}
                      </Text>
                    </>
                  ) : (
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: "#111827",
                      }}
                    >
                      {unitPrice > 0 ? `${unitPrice} ${CURRENCY}` : "Inclus"}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}

          {/* Ligne livraison : zone + prix (comme la tab Commandes marchand) */}
          {hasDelivery && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingVertical: 11,
              }}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  backgroundColor: "#FEF2F2",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="bicycle-outline" size={16} color={DS.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ fontSize: 13, fontWeight: "600", color: "#111827" }}
                  numberOfLines={1}
                >
                  Livraison
                </Text>
                {zone ? (
                  <Text
                    style={{
                      fontSize: 11,
                      color: "#6B7280",
                      marginTop: 1,
                      fontWeight: "600",
                    }}
                  >
                    {zone}
                  </Text>
                ) : null}
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text
                  style={[
                    { fontSize: 13, fontWeight: "700", color: "#111827" },
                    // Offert / groupé : vert, comme chez le marchand.
                    (deliveryOffered || deliveryGrouped) && {
                      color: "#16A34A",
                      fontSize: 12,
                    },
                  ]}
                >
                  {deliveryLabel}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Total */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            padding: 14,
            borderTopWidth: 1,
            borderTopColor: DS.gray100,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827" }}>
            {deliveryGrouped ? "Total" : "Total commande"}
          </Text>
          <Text style={{ fontSize: 16, fontWeight: "900", color: DS.accent }}>
            {total} {CURRENCY}
          </Text>
        </View>
      </View>
    </View>
  );
}
