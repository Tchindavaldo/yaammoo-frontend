import { Theme } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "./ClientFilterSheet.styles";

/**
 * Sous-composants de présentation du ClientFilterSheet (tuile de créneau,
 * card de lot de dates, ligne cochable). Propres au client : rien de partagé
 * avec le sheet marchand.
 */

/** Nb de chips occupant la ligne de dates (complétée par des « Aucune »). */
export const DATE_CHIP_SLOTS = 4;

export const PERIOD_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  express: "flash-outline",
  surplace: "restaurant-outline",
};

/** Tuile de créneau horaire, calquée sur l'item Extra du bottom sheet home. */
export const PeriodTile = ({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity style={styles.tile} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.tileIcon, active && styles.tileIconActive]}>
      <Text style={[styles.tileHour, active && styles.tileLabelActive]}>
        {label}
      </Text>
      {/* Badge = nb de commandes du créneau (coché : fond plein). */}
      <View style={[styles.tileBadge, !active && styles.tileBadgeIdle]}>
        <Text
          style={[styles.tileBadgeText, !active && styles.tileBadgeTextIdle]}
        >
          {count}
        </Text>
      </View>
    </View>
  </TouchableOpacity>
);

/** Card de choix du lot de dates listé en dessous (à venir / passées). */
export const DateScopeCard = ({
  icon,
  label,
  count,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.scopeCard, active && styles.scopeCardActive]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.scopeTop}>
      <Ionicons name={icon} size={18} color={active ? "#1A1916" : "#888780"} />
      <View style={[styles.countBadge, active && styles.countBadgeActive]}>
        <Text style={[styles.countText, active && styles.countTextActive]}>
          {count}
        </Text>
      </View>
    </View>
    <Text
      style={[styles.scopeLabel, active && styles.scopeLabelActive]}
      numberOfLines={2}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

/** Ligne cochable d'un mode de livraison (+ « Toutes les périodes »). */
export const Row = ({
  icon,
  label,
  count,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.row, active && styles.rowActive]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Ionicons
      name={icon}
      size={18}
      color={active ? Theme.colors.primary : "#888780"}
    />
    <Text
      style={[styles.rowLabel, active && styles.rowLabelActive]}
      numberOfLines={1}
    >
      {label}
    </Text>
    <View style={[styles.countBadge, active && styles.countBadgeRowActive]}>
      <Text style={[styles.countText, active && styles.countTextActive]}>
        {count}
      </Text>
    </View>
    <Ionicons
      name={active ? "checkbox" : "square-outline"}
      size={18}
      color={active ? Theme.colors.primary : "#C9C7C0"}
    />
  </TouchableOpacity>
);
