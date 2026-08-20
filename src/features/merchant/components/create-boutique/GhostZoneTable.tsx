import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";
import { colHeader } from "./DeliveryZoneList";

/** Hauteur d'une ligne vide du tableau fantome (plus compacte qu'une ligne
 *  reelle : on en affiche ainsi davantage dans le meme espace libre). */
export const GHOST_ROW_HEIGHT = 26;
/** Socle de la card fantome : bandeau de zone + en-tete de colonnes + paddings. */
export const GHOST_HEADER_HEIGHT = 68;
/** Vide minimal a partir duquel la card fantome est affichee (meme tronquee). */
export const GHOST_MIN_VISIBLE = 40;

/**
 * Card fantome : meme gabarit qu'une zone reelle (bandeau + en-tete de
 * colonnes + lignes), en pointilles et sans contenu. Comble l'espace libre.
 */
export const GhostTable: React.FC<{ rows: number }> = ({ rows }) => (
  <View
    style={{
      borderRadius: 14,
      overflow: "hidden",
      backgroundColor: "#fff",
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: "#cbd5e1",
    }}
  >
    {/* Bandeau de zone fantome */}
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: "#f1f5f9",
        borderBottomWidth: 1,
        borderBottomColor: "#e2e8f0",
        paddingVertical: 9,
        paddingHorizontal: 12,
      }}
    >
      <Ionicons name="location-outline" size={14} color="#94a3b8" />
      <View
        style={{
          flex: 1,
          height: 9,
          borderRadius: 5,
          backgroundColor: "#cbd5e1",
          maxWidth: 120,
        }}
      />
    </View>

    {/* Corps : memes colonnes que le tableau reel */}
    <View style={{ padding: 10 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingBottom: 6,
          borderBottomWidth: 1,
          borderBottomColor: "#e2e8f0",
        }}
      >
        <Text style={[colHeader, { color: "#94a3b8" }]}>Heure</Text>
        <Text style={[colHeader, { color: "#94a3b8", textAlign: "right" }]}>
          Périod.
        </Text>
        <Text style={[colHeader, { color: "#94a3b8", textAlign: "right" }]}>
          Express
        </Text>
      </View>

      {/* Lignes fantomes */}
      {Array.from({ length: rows }).map((_, i) => (
        <View
          key={i}
          style={{
            flexDirection: "row",
            alignItems: "center",
            height: GHOST_ROW_HEIGHT,
            borderBottomWidth: i === rows - 1 ? 0 : 1,
            borderBottomColor: "#f1f5f9",
          }}
        >
          <GhostCell align="left" />
          <GhostCell align="right" />
          <GhostCell align="right" />
        </View>
      ))}
    </View>
  </View>
);

/** Barre grise tenant lieu de valeur dans une cellule fantome. */
const GhostCell: React.FC<{ align: "left" | "right" }> = ({ align }) => (
  <View
    style={{
      flex: 1,
      alignItems: align === "left" ? "flex-start" : "flex-end",
    }}
  >
    <View
      style={{
        width: 42,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#cbd5e1",
      }}
    />
  </View>
);
