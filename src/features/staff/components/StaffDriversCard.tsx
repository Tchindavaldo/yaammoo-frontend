import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { DriverInfo } from "@/src/features/driver/services/driverService";
import { initialsOf, personName, plural } from "../utils/staffFormat";
import { StaffAvatar } from "./StaffAvatar";
import { ST } from "./staffTheme";

const MAX_STACK = 4;

interface Props {
  drivers: DriverInfo[];
  pending: number;
  onPress: () => void;
}

/**
 * Carte « Livreurs » en bas de l'onglet Équipe : les livreurs rejoignent le
 * personnel, un appui ouvre l'onglet Livreurs (demandes et équipe).
 */
export const StaffDriversCard: React.FC<Props> = ({ drivers, pending, onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}
    accessibilityRole="button"
    accessibilityLabel="Livreurs"
  >
    <View style={styles.row}>
      <View style={styles.title}>
        <Ionicons name="bicycle-outline" size={20} color={ST.ink} />
        <Text style={styles.name}>Livreurs</Text>
      </View>
      {pending > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{plural(pending, "demande")}</Text>
        </View>
      )}
    </View>

    <View style={styles.people}>
      {drivers.length > 0 && (
        <View style={styles.stack}>
          {drivers.slice(0, MAX_STACK).map((d, i) => (
            <StaffAvatar
              key={d.driverId}
              label={initialsOf(personName(d.infos))}
              size={34}
              variant="white"
              ringColor={ST.surface}
              style={i > 0 ? styles.stacked : undefined}
            />
          ))}
        </View>
      )}
      <Text style={styles.peopleText}>
        {drivers.length > 0 ? plural(drivers.length, "livreur actif", "livreurs actifs") : "Aucun livreur"}
      </Text>
      <View style={{ flex: 1 }} />
      <Ionicons name="chevron-forward" size={16} color={ST.faint} />
    </View>

    <View style={styles.chips}>
      <View style={styles.chip}>
        <Text style={styles.chipText}>Commandes déléguées</Text>
      </View>
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    backgroundColor: ST.surface,
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { fontSize: 20, fontWeight: "800", letterSpacing: -0.3, color: ST.ink },
  badge: {
    height: 24,
    paddingHorizontal: 10,
    borderRadius: 12,
    justifyContent: "center",
    backgroundColor: ST.accentInk,
  },
  badgeText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  people: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 34 },
  stack: { flexDirection: "row" },
  stacked: { marginLeft: -10 },
  peopleText: { fontSize: 13, fontWeight: "600", color: ST.muted },
  chips: { flexDirection: "row", gap: 6 },
  chip: {
    height: 24,
    paddingHorizontal: 9,
    borderRadius: 8,
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  chipText: { fontSize: 12, fontWeight: "700", color: ST.ink },
});
