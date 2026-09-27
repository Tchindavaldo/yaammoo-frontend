import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { BroadcastAudience } from "../../types/broadcast.types";
import { BC } from "./broadcastTheme";

const OPTIONS: {
  key: BroadcastAudience;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: "customers", label: "Mes clients", icon: "people-outline" },
  { key: "city", label: "Ma ville", icon: "location-outline" },
  { key: "all", label: "Tout le monde", icon: "globe-outline" },
];

/** Libellé court d'une audience, pour l'historique. */
export const audienceLabel = (audience: BroadcastAudience, city?: string) =>
  audience === "city" ? city || "Ville" : audience === "all" ? "Tout le monde" : "Mes clients";

interface Props {
  /** Audiences permises par le plan. */
  audiences: BroadcastAudience[];
  /** Villes desservies par la boutique (audience « ville »). */
  cities: string[];
  audience: BroadcastAudience;
  city: string | null;
  onChange: (audience: BroadcastAudience, city: string | null) => void;
}

/**
 * Destinataires de la notification. « Ma ville » prend le nom de la ville quand
 * la boutique n'en dessert qu'une ; sinon une seconde rangée propose les villes.
 * Sans ville desservie, l'option est masquée.
 */
export const BroadcastAudiencePicker: React.FC<Props> = ({
  audiences,
  cities,
  audience,
  city,
  onChange,
}) => {
  const options = OPTIONS.filter(
    (o) => audiences.includes(o.key) && (o.key !== "city" || cities.length > 0),
  );
  if (options.length === 0) return null;

  const pick = (key: BroadcastAudience) =>
    onChange(key, key === "city" ? city || (cities.length === 1 ? cities[0] : null) : null);

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        keyboardShouldPersistTaps="handled"
      >
        {options.map((o) => {
          const on = audience === o.key;
          const label = o.key === "city" && cities.length === 1 ? cities[0] : o.label;
          return (
            <Pressable
              key={o.key}
              onPress={() => pick(o.key)}
              style={[styles.chip, on && styles.chipOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Ionicons name={o.icon} size={15} color={on ? "#fff" : BC.ink} />
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {audience === "city" && cities.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
          keyboardShouldPersistTaps="handled"
        >
          {cities.map((c) => {
            const on = city === c;
            return (
              <Pressable
                key={c}
                onPress={() => onChange("city", c)}
                style={[styles.cityChip, on && styles.cityChipOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.cityText, on && styles.cityTextOn]}>{c}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  row: { gap: 8, paddingHorizontal: 2 },
  chip: {
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: BC.surface,
  },
  chipOn: { backgroundColor: BC.ink },
  chipText: { fontSize: 13, fontWeight: "600", color: BC.ink },
  chipTextOn: { color: "#fff" },
  cityChip: {
    height: 32,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BC.line,
  },
  cityChipOn: { borderColor: BC.accent, backgroundColor: BC.accentTint },
  cityText: { fontSize: 12, fontWeight: "600", color: BC.muted },
  cityTextOn: { color: BC.accentInk },
});
