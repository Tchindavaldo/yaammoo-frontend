import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { ClientOrderCard } from "./ClientOrderCard";
import type { CartOrderEntry, CartZoneGroup } from "../utils/groupCartOrders";

interface CartZoneTableProps {
  groups: CartZoneGroup[];
  onSelect: (entry: CartOrderEntry) => void;
  onDelete?: (id: string) => void;
  /** Paie toutes les commandes du groupe. Sans cette prop, pas de bouton. */
  onPayGroup?: (group: CartZoneGroup) => void;
}

const fmt = (n: number) => `${n.toLocaleString("fr-FR")} F`;

/**
 * Tableau des commandes du panier — même gabarit que le tableau des zones de
 * livraison de la boutique (`edit-boutique/DeliveryZoneList`) : une card par
 * zone/créneau, bandeau superieur portant zone + heure + prix total du groupe,
 * puis les commandes en lignes.
 */
export const CartZoneTable: React.FC<CartZoneTableProps> = ({
  groups,
  onSelect,
  onDelete,
  onPayGroup,
}) => (
  <View style={{ gap: 12 }}>
    {groups.map((g) => (
      <View
        key={g.key}
        style={{
          borderRadius: 14,
          overflow: "hidden",
          backgroundColor: "#fff",
          borderWidth: 1,
          borderColor: "#e2e8f0",
        }}
      >
        {/* Bandeau superieur : zone + heure a gauche, total du groupe a droite */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: "#f8fafc",
            borderBottomWidth: 1,
            borderBottomColor: "#f1f5f9",
            paddingVertical: 9,
            paddingHorizontal: 12,
          }}
        >
          <Ionicons
            name={
              g.type === "express"
                ? "flash"
                : g.type === "aucune"
                  ? "storefront"
                  : "location"
            }
            size={14}
            color="#ec4913"
          />
          <Text
            style={{
              flex: 1,
              color: "#0f172a",
              fontSize: 13,
              fontWeight: "bold",
              letterSpacing: 0.5,
            }}
            numberOfLines={1}
          >
            {g.zone.toUpperCase()}
            {g.type === "express" ? " · EXPRESS" : ""}
            {g.heure ? ` · ${g.heure}` : ""}
          </Text>
          <Text style={{ color: "#ec4913", fontSize: 12, fontWeight: "bold" }}>
            {fmt(g.total)}
          </Text>
        </View>

        {/* Corps : une ClientOrderCard par commande, design INCHANGÉ.
            Le separateur bas de la derniere card est masque : il doublerait le
            bord arrondi de la card de zone. */}
        {g.entries.map((e, i) => (
          <View
            key={e.order?.id?.toString() || `${g.key}-${i}`}
            style={
              i === g.entries.length - 1 ? { marginBottom: -1 } : undefined
            }
          >
            <ClientOrderCard
              order={e.order as any}
              onPress={() => onSelect(e)}
              onDelete={onDelete}
              showActions={!!onDelete}
            />
          </View>
        ))}

        {/* Pied de tableau : recap du groupe + paiement de la zone. */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            borderTopWidth: 1,
            borderTopColor: "#e2e8f0",
            backgroundColor: "#f8fafc",
            paddingVertical: 10,
            paddingHorizontal: 12,
            gap: 10,
          }}
        >
          {/* Deux colonnes cote a cote : le libelle en haut, son prix dessous. */}
          <View style={{ flex: 1, flexDirection: "row", gap: 18 }}>
            <View style={{ gap: 2 }}>
              <Text style={footLabel}>{g.entries.length} cmd</Text>
              <Text style={footValue}>{fmt(g.articles)}</Text>
            </View>
            <View style={{ gap: 2 }}>
              <Text style={footLabel}>Livraison</Text>
              <Text style={footValue}>
                {g.livraison > 0 ? fmt(g.livraison) : "Offerte"}
              </Text>
            </View>
          </View>

          {onPayGroup && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => onPayGroup(g)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                backgroundColor: "#ec4913",
                paddingHorizontal: 14,
                height: 38,
                borderRadius: 19,
              }}
            >
              <Ionicons name="card-outline" size={15} color="white" />
              <Text style={{ color: "white", fontSize: 12, fontWeight: "bold" }}>
                Tout payer
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    ))}
  </View>
);

const footLabel = {
  fontSize: 11,
  fontWeight: "600" as const,
  color: "#64748b",
};

const footValue = {
  fontSize: 12,
  fontWeight: "bold" as const,
  color: "#0f172a",
};
