import { Theme } from "@/src/theme";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export interface DatePillOption {
  iso: string;
  label: string;
}

interface DatePillProps {
  options: DatePillOption[];
  /** ISO sélectionné, ou null = aujourd'hui (premier équivalent). */
  selected: string | null;
  todayISO: string;
  onSelect: (iso: string | null) => void;
  /** Nombre de dates visibles à l'état compact (avant le "+N"). */
  collapsedCount?: number;
}

/**
 * Pilule de sélection de date, style "Tout marquer lu" (orange clair).
 * Compacte : affiche `collapsedCount` dates + un "+N". Au clic sur "+N" elle
 * s'agrandit en ligne pour afficher toutes les dates cliquables.
 */
export const DatePill: React.FC<DatePillProps> = ({
  options,
  selected,
  todayISO,
  onSelect,
  collapsedCount = 2,
}) => {
  const [expanded, setExpanded] = useState(false);

  if (options.length === 0) return null;

  const isActive = (iso: string) =>
    (selected === null && iso === todayISO) || selected === iso;

  const visible = expanded ? options : options.slice(0, collapsedCount);
  const hiddenCount = options.length - visible.length;

  return (
    <View style={styles.pill}>
      {visible.map(({ iso, label }) => {
        const active = isActive(iso);
        return (
          <TouchableOpacity
            key={iso}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onSelect(selected === iso ? null : iso)}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.chipText, active && styles.chipTextActive]}
              numberOfLines={1}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}

      {hiddenCount > 0 && (
        <TouchableOpacity
          style={styles.more}
          onPress={() => setExpanded(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.moreText}>+{hiddenCount}</Text>
        </TouchableOpacity>
      )}

      {expanded && (
        <TouchableOpacity
          style={styles.more}
          onPress={() => setExpanded(false)}
          activeOpacity={0.7}
        >
          <Text style={styles.moreText}>×</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 14,
  },
  chipActive: {
    backgroundColor: Theme.colors.primary,
  },
  chipText: {
    fontSize: 11,
    fontWeight: "600",
    color: Theme.colors.primary,
  },
  chipTextActive: {
    color: "#fff",
  },
  more: {
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  moreText: {
    fontSize: 11,
    fontWeight: "700",
    color: Theme.colors.primary,
  },
});
