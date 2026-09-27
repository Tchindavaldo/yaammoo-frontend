import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { StaffTab } from "../types/staff.types";
import { ST } from "./staffTheme";

interface Props {
  tab: StaffTab;
  onChange: (tab: StaffTab) => void;
  members: number;
  drivers: number;
  /** Demandes de livreur en attente : pastille orange sur l'onglet Livreurs. */
  pending: number;
}

/** Sélecteur Équipe / Livreurs (contrôle segmenté de la maquette). */
export const StaffTabs: React.FC<Props> = ({ tab, onChange, members, drivers, pending }) => (
  <View style={styles.track} accessibilityRole="tablist">
    <Segment on={tab === "team"} onPress={() => onChange("team")} label="Équipe" count={members} />
    <Segment
      on={tab === "drivers"}
      onPress={() => onChange("drivers")}
      label="Livreurs"
      count={pending > 0 ? undefined : drivers}
      badge={pending > 0 ? pending : undefined}
    />
  </View>
);

const Segment = ({
  on,
  onPress,
  label,
  count,
  badge,
}: {
  on: boolean;
  onPress: () => void;
  label: string;
  count?: number;
  badge?: number;
}) => (
  <Pressable
    onPress={onPress}
    style={[styles.segment, on && styles.segmentOn]}
    accessibilityRole="tab"
    accessibilityState={{ selected: on }}
  >
    <Text style={[styles.label, on && styles.labelOn]}>
      {label}
      {count !== undefined && <Text style={styles.count}> {count}</Text>}
    </Text>
    {badge !== undefined && (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{badge}</Text>
      </View>
    )}
  </Pressable>
);

const styles = StyleSheet.create({
  track: { flexDirection: "row", padding: 4, gap: 4, borderRadius: 14, backgroundColor: ST.surface },
  segment: {
    flex: 1,
    height: 36,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  segmentOn: {
    backgroundColor: "#fff",
    shadowColor: ST.ink,
    shadowOpacity: 0.1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  label: { fontSize: 14, fontWeight: "600", color: ST.muted },
  labelOn: { fontWeight: "700", color: ST.ink },
  count: { fontWeight: "600", color: ST.muted },
  badge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ST.accentInk,
  },
  badgeText: { fontSize: 11, fontWeight: "800", color: "#fff" },
});
