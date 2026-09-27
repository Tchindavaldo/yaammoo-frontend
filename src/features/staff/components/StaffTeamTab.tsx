import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { DriverInfo } from "@/src/features/driver/services/driverService";
import type { StaffMember, StaffRole } from "../types/staff.types";
import type { PermissionMeta } from "../utils/staffPermissions";
import { StaffDriversCard } from "./StaffDriversCard";
import { StaffRoleCard } from "./StaffRoleCard";
import { capsLabel, ST } from "./staffTheme";

/** Clé de la feuille « Sans rôle ». */
export const ORPHAN_KEY = "__orphans__";

interface Props {
  loaded: boolean;
  roles: StaffRole[];
  membersOf: (roleId: string) => StaffMember[];
  orphans: StaffMember[];
  catalog: PermissionMeta[];
  drivers: DriverInfo[];
  pending: number;
  /** Ouvre la feuille des membres d'un rôle (id, ou ORPHAN_KEY). */
  onOpenRole: (key: string) => void;
  onNewRole: () => void;
  onOpenDrivers: () => void;
}

/** Ligne « Rôles de la boutique » + « Nouveau rôle », fixe au-dessus de la liste. */
export const StaffTeamHead: React.FC<{ onNewRole: () => void }> = ({ onNewRole }) => (
  <View style={styles.head}>
    <Text style={capsLabel}>RÔLES DE LA BOUTIQUE</Text>
    <Pressable onPress={onNewRole} hitSlop={8} style={styles.link} accessibilityRole="button">
      <Ionicons name="add" size={16} color={ST.accentText} />
      <Text style={styles.linkText}>Nouveau rôle</Text>
    </Pressable>
  </View>
);

/**
 * Onglet Équipe : une carte par rôle (qui l'occupe, ce qu'il permet), les
 * membres sans rôle, puis la carte des livreurs.
 */
export const StaffTeamTab: React.FC<Props> = ({
  loaded,
  roles,
  membersOf,
  orphans,
  catalog,
  drivers,
  pending,
  onOpenRole,
  onNewRole,
  onOpenDrivers,
}) => {
  const empty = roles.length === 0 && orphans.length === 0;

  return (
    <>
      {!loaded ? (
        <View style={styles.loader}>
          <ActivityIndicator color={ST.accent} />
        </View>
      ) : empty ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="people-outline" size={22} color={ST.accentText} />
          </View>
          <Text style={styles.emptyTitle}>Aucun rôle pour l’instant</Text>
          <Text style={styles.emptyText}>
            Créez un rôle (Caisse, Cuisine…) avec ses permissions, puis ajoutez vos employés.
          </Text>
          <Pressable onPress={onNewRole} style={styles.emptyBtn} accessibilityRole="button">
            <Text style={styles.emptyBtnText}>Créer un rôle</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {/* Cartes de la maquette « Par rôle » (sombre si accès complet). */}
          {roles.map((r) => (
            <StaffRoleCard
              key={r.id}
              role={r}
              members={membersOf(r.id)}
              catalog={catalog}
              onPress={() => onOpenRole(r.id)}
            />
          ))}
          {orphans.length > 0 && (
            <StaffRoleCard
              role={null}
              members={orphans}
              catalog={catalog}
              onPress={() => onOpenRole(ORPHAN_KEY)}
            />
          )}
        </>
      )}

      <StaffDriversCard drivers={drivers} pending={pending} onPress={onOpenDrivers} />
    </>
  );
};

const styles = StyleSheet.create({
  head: {
    height: 32,
    paddingHorizontal: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  link: { flexDirection: "row", alignItems: "center", gap: 4 },
  linkText: { fontSize: 14, fontWeight: "700", color: ST.accentText },
  loader: { paddingVertical: 36, alignItems: "center" },
  empty: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 24,
    paddingHorizontal: 24,
    borderRadius: 22,
    backgroundColor: ST.surface,
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ST.accentTint,
  },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: ST.ink },
  emptyText: { fontSize: 13, lineHeight: 19, color: ST.muted, textAlign: "center" },
  emptyBtn: {
    marginTop: 6,
    height: 40,
    paddingHorizontal: 18,
    borderRadius: 20,
    justifyContent: "center",
    backgroundColor: ST.ink,
  },
  emptyBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
