import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { StaffMember, StaffRole } from "../types/staff.types";
import { plural } from "../utils/staffFormat";
import { grantedOf, isFullAccess, type PermissionMeta } from "../utils/staffPermissions";
import { StaffMemberRow } from "./StaffMemberRow";
import { StaffSheet } from "./StaffSheet";
import { ST } from "./staffTheme";

const MAX_PERMS = 3;

interface Props {
  /** null = « Sans rôle ». */
  role: StaffRole | null;
  members: StaffMember[];
  catalog: PermissionMeta[];
  onMemberPress: (m: StaffMember) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onClose: () => void;
}

/**
 * Feuille ouverte depuis une carte de rôle : titre, puis les membres en
 * lignes blanches dans un bloc gris (style des rôles de la maquette « Bento »).
 */
export const StaffRoleMembersSheet: React.FC<Props> = ({
  role,
  members,
  catalog,
  onMemberPress,
  onEdit,
  onDelete,
  onClose,
}) => {
  const permissions = role?.permissions || [];
  const full = isFullAccess(permissions, catalog);
  const granted = grantedOf(permissions, catalog);
  const summary = full
    ? "Accès complet"
    : granted.length === 0
      ? "Aucune permission"
      : granted
          .slice(0, MAX_PERMS)
          .map((p) => p.short)
          .join(" · ") + (granted.length > MAX_PERMS ? ` +${granted.length - MAX_PERMS}` : "");

  const header = (
    <View style={styles.header}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.title} numberOfLines={1}>{role?.name || "Sans rôle"}</Text>
        <Text style={styles.sub}>{plural(members.length, "membre")}</Text>
      </View>
      {onEdit && (
        <Pressable onPress={onEdit} hitSlop={8} style={styles.edit} accessibilityRole="button">
          <Ionicons name="options-outline" size={15} color={ST.ink} />
          <Text style={styles.editText}>Modifier</Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <StaffSheet onClose={onClose} header={header}>
      <View style={styles.group}>
        <View style={styles.groupHead}>
          <Text style={styles.groupName}>Membres</Text>
          <Text style={[styles.groupSummary, full && styles.groupSummaryFull]} numberOfLines={1}>
            {summary}
          </Text>
        </View>
        {members.map((m) => (
          <StaffMemberRow key={m.id} member={m} tone="group" onPress={() => onMemberPress(m)} />
        ))}
        {members.length === 0 && (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText}>Aucun membre</Text>
            {onDelete && (
              <Pressable onPress={onDelete} hitSlop={8} style={styles.delete} accessibilityRole="button">
                <Ionicons name="trash-outline" size={15} color={ST.danger} />
                <Text style={styles.deleteText}>Supprimer le rôle</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </StaffSheet>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, gap: 12 },
  title: { fontSize: 22, fontWeight: "800", letterSpacing: -0.3, color: ST.ink },
  sub: { fontSize: 13, color: ST.muted },
  edit: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: ST.surface,
  },
  editText: { fontSize: 13, fontWeight: "700", color: ST.ink },
  group: { backgroundColor: ST.surface, borderRadius: 22, padding: 6, gap: 4 },
  groupHead: {
    height: 32,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  groupName: { fontSize: 14, fontWeight: "800", color: ST.ink },
  groupSummary: { flexShrink: 1, fontSize: 12, fontWeight: "600", color: ST.muted },
  groupSummaryFull: { fontWeight: "700", color: ST.accentText },
  emptyRow: {
    height: 52,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  emptyText: { fontSize: 14, color: ST.muted },
  delete: { flexDirection: "row", alignItems: "center", gap: 4 },
  deleteText: { fontSize: 13, fontWeight: "700", color: ST.danger },
});
