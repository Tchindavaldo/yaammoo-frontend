import { DS } from "@/src/theme/ds";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

/**
 * Pilule de localisation du header home (`RestaurantHeader`), rendu choisi
 * par `LOCATION_PILL_STYLE` :
 * - "actuel" : fond orange clair, pin + texte orange.
 * - "c" : blanche bordee, pin blanc dans un rond orange, chevron gris.
 * - "d" : pastille sombre, pin orange clair, texte blanc.
 * - "e" : sans fond, pin dans un rond orange clair, texte noir en gras.
 * - "f" : blanche flottante avec ombre douce.
 * `string` volontaire, comme les `V*_STYLE` des cartes menu.
 */
export const LOCATION_PILL_STYLE: string = "f"; // "actuel" | "c" | "d" | "e" | "f"

export const LocationPill: React.FC<{
  location: string;
  onPress?: () => void;
}> = ({ location, onPress }) => {
  if (LOCATION_PILL_STYLE === "c") {
    return (
      <TouchableOpacity style={[styles.pill, styles.cPill]} onPress={onPress}>
        <View style={styles.cPin}>
          <Ionicons name="location-sharp" size={13} color={DS.onInk} />
        </View>
        <Text style={[styles.label, styles.cLabel]} numberOfLines={1}>
          {location}
        </Text>
      </TouchableOpacity>
    );
  }

  if (LOCATION_PILL_STYLE === "d") {
    return (
      <TouchableOpacity style={[styles.pill, styles.dPill]} onPress={onPress}>
        <Ionicons name="location-sharp" size={13} color={DS.accentOnInk} />
        <Text style={[styles.label, { color: DS.onInk }]} numberOfLines={1}>
          {location}
        </Text>
      </TouchableOpacity>
    );
  }

  if (LOCATION_PILL_STYLE === "e") {
    return (
      <TouchableOpacity style={styles.ePill} onPress={onPress}>
        <View style={styles.ePin}>
          <Ionicons name="location-sharp" size={15} color={DS.accentDeep} />
        </View>
        <Text style={[styles.label, styles.eLabel]} numberOfLines={1}>
          {location}
        </Text>
      </TouchableOpacity>
    );
  }

  if (LOCATION_PILL_STYLE === "f") {
    return (
      <TouchableOpacity style={[styles.pill, styles.fPill]} onPress={onPress}>
        <Ionicons name="location-sharp" size={13} color={DS.accentDeep} />
        <Text style={[styles.label, { color: DS.ink }]} numberOfLines={1}>
          {location}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.actuel} onPress={onPress}>
      <Ionicons name="location-sharp" size={12} color={DS.accentText} />
      <Text style={styles.actuelLabel} numberOfLines={1}>
        {location}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 12,
    gap: 6,
  },
  label: { flexShrink: 1, fontSize: 12, fontWeight: "700" },

  // Actuel
  actuel: {
    flexDirection: "row",
    alignItems: "center",
    // Fond doux (teinte accent legere) : le plein orange frappait trop.
    backgroundColor: DS.accentAlpha(0.12),
    paddingHorizontal: 12,
    borderRadius: 18,
    height: 33, // Meme hauteur que les boutons d'action
  },
  actuelLabel: {
    color: DS.accentText,
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },

  // C — blanche bordee
  cPill: {
    height: 36,
    borderRadius: 18,
    paddingLeft: 4,
    gap: 7,
    borderWidth: 1,
    borderColor: DS.line,
    backgroundColor: DS.bg,
  },
  cPin: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DS.accentDeep,
  },
  cLabel: { fontSize: 13, color: DS.ink },

  // D — pastille sombre
  dPill: { backgroundColor: DS.ink },

  // E — pin en cercle, sans fond
  ePill: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    gap: 8,
  },
  ePin: {
    width: 33,
    height: 33,
    borderRadius: 16.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DS.accentAlpha(0.12),
  },
  eLabel: { fontSize: 14, fontWeight: "800", color: DS.ink },

  // F — flottante ombree
  fPill: {
    paddingLeft: 10,
    gap: 5,
    backgroundColor: DS.bg,
    shadowColor: DS.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
});
