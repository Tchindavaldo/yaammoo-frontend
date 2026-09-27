import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import type { StaffMember, StaffRole } from "../types/staff.types";
import { firstNameOf, memberInitials, memberName, plural } from "../utils/staffFormat";
import type { PermissionMeta } from "../utils/staffPermissions";
import { StaffAvatar } from "./StaffAvatar";
import { StaffSheet } from "./StaffSheet";
import { StaffSwitch } from "./StaffSwitch";
import { capsLabel, ST } from "./staffTheme";

interface Props {
  member: StaffMember;
  role: StaffRole | null;
  roles: StaffRole[];
  catalog: PermissionMeta[];
  /** Noms des autres membres du même rôle. */
  mates: string[];
  saving: boolean;
  onChangeRole: (roleId: string) => Promise<boolean>;
  onSetActive: (active: boolean) => Promise<boolean>;
  onRemove: () => void;
  onClose: () => void;
}

/** « Carine », « Carine et Brice », « Carine, Brice et 2 autres ». */
const joinNames = (names: string[]) => {
  if (names.length <= 2) return names.join(" et ");
  return `${names[0]}, ${names[1]} et ${plural(names.length - 2, "autre")}`;
};

/**
 * Fiche d'un membre : identité et statut, appeler / changer de rôle /
 * suspendre, ce que son rôle lui permet, puis accès et retrait.
 */
export const StaffMemberSheet: React.FC<Props> = ({
  member,
  role,
  roles,
  catalog,
  mates,
  saving,
  onChangeRole,
  onSetActive,
  onRemove,
  onClose,
}) => {
  const [pickRole, setPickRole] = useState(false);
  const [showDenied, setShowDenied] = useState(false);

  const perms = role?.permissions || [];
  const granted = catalog.filter((c) => perms.includes(c.key));
  const denied = catalog.filter((c) => !perms.includes(c.key));
  const suspended = !member.active;
  const invited = !suspended && !member.userId;
  const status = suspended
    ? { label: "Accès coupé", dot: ST.faint }
    : invited
      ? { label: "Invitation", dot: ST.accent }
      : { label: "Compte relié", dot: ST.success };

  const call = () => Linking.openURL(`tel:${member.phoneNumber}`).catch(() => {});

  const chooseRole = async (roleId: string) => {
    if (roleId === member.roleId) return setPickRole(false);
    if (await onChangeRole(roleId)) setPickRole(false);
  };

  return (
    <StaffSheet
      onClose={onClose}
      header={
        <View style={styles.head}>
          <StaffAvatar
            label={memberInitials(member)}
            size={64}
            variant={suspended ? "muted" : invited ? "invited" : "ink"}
          />
          <View style={styles.identity}>
            <Text style={styles.name} numberOfLines={2}>{memberName(member)}</Text>
            <View style={styles.tags}>
              <View style={[styles.tag, { backgroundColor: ST.ink }]}>
                <Text style={[styles.tagText, { color: "#fff" }]} numberOfLines={1}>
                  {role?.name || "Sans rôle"}
                </Text>
              </View>
              <View style={[styles.tag, { backgroundColor: ST.surface }]}>
                <View style={[styles.dot, { backgroundColor: status.dot }]} />
                <Text style={[styles.tagText, { color: ST.text2 }]}>{status.label}</Text>
              </View>
            </View>
          </View>
          <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn} accessibilityLabel="Fermer">
            <Ionicons name="close" size={16} color={ST.ink} />
          </Pressable>
        </View>
      }
    >
      <View style={styles.actions}>
        <Action icon="call-outline" label="Appeler" onPress={call} />
        <Action
          icon="shield-checkmark-outline"
          label="Changer de rôle"
          on={pickRole}
          onPress={() => setPickRole((v) => !v)}
        />
        <Action
          icon={suspended ? "lock-open-outline" : "lock-closed-outline"}
          label={suspended ? "Réactiver" : "Suspendre"}
          onPress={() => onSetActive(suspended)}
          disabled={saving}
        />
      </View>

      {pickRole ? (
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={capsLabel}>CHOISIR UN RÔLE</Text>
            {saving && <ActivityIndicator size="small" color={ST.accent} />}
          </View>
          <View style={styles.roleChips}>
            {roles.map((r) => {
              const on = r.id === member.roleId;
              return (
                <Pressable
                  key={r.id}
                  onPress={() => chooseRole(r.id)}
                  disabled={saving}
                  style={[styles.roleChip, on && styles.roleChipOn]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  {on && <Ionicons name="checkmark" size={15} color={ST.accent} />}
                  <Text style={[styles.roleChipText, on && { color: "#fff" }]}>{r.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : (
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={capsLabel} numberOfLines={1}>
              CE QUE {firstNameOf(member).toUpperCase()} PEUT FAIRE
            </Text>
            <Text style={styles.count}>
              {granted.length} / {catalog.length}
            </Text>
          </View>
          <View style={styles.block}>
            {granted.map((p) => (
              <View key={p.key} style={styles.permRow}>
                <View style={styles.checkOn}>
                  <Ionicons name="checkmark" size={13} color="#fff" />
                </View>
                <Text style={styles.permText}>{p.label}</Text>
              </View>
            ))}
            {showDenied &&
              denied.map((p) => (
                <View key={p.key} style={[styles.permRow, styles.permRowOff]}>
                  <View style={styles.checkOff} />
                  <Text style={[styles.permText, { color: ST.muted }]}>{p.label}</Text>
                </View>
              ))}
            {denied.length > 0 && (
              <Pressable
                onPress={() => setShowDenied((v) => !v)}
                style={styles.deniedToggle}
                accessibilityRole="button"
                accessibilityState={{ expanded: showDenied }}
              >
                {!showDenied && <View style={styles.checkOff} />}
                <Text style={styles.deniedText}>
                  {showDenied
                    ? "Masquer les permissions non accordées"
                    : `${denied.length} autre${denied.length > 1 ? "s" : ""} non accordée${denied.length > 1 ? "s" : ""}`}
                </Text>
                <Ionicons name={showDenied ? "chevron-up" : "chevron-down"} size={14} color={ST.muted} />
              </Pressable>
            )}
          </View>
          <Text style={styles.note}>
            {role
              ? `Hérité du rôle ${role.name}${mates.length ? `, partagé avec ${joinNames(mates)}` : ""}.`
              : "Aucun rôle : choisissez-en un pour lui donner des permissions."}
          </Text>
        </View>
      )}

      <View style={styles.block}>
        <View style={styles.accessRow}>
          <View style={{ flex: 1, gap: 1 }}>
            <Text style={styles.accessTitle}>Accès actif</Text>
            <Text style={styles.accessSub}>Désactiver suspend sans supprimer</Text>
          </View>
          <StaffSwitch
            value={member.active}
            onValueChange={(v) => onSetActive(v)}
            label="Accès actif"
            disabled={saving}
          />
        </View>
        <Pressable onPress={onRemove} style={styles.removeRow} accessibilityRole="button">
          <Ionicons name="trash-outline" size={18} color={ST.danger} />
          <Text style={styles.removeText}>Retirer de la boutique</Text>
        </Pressable>
      </View>
    </StaffSheet>
  );
};

const Action = ({
  icon,
  label,
  onPress,
  on,
  disabled,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
  on?: boolean;
  disabled?: boolean;
}) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    style={({ pressed }) => [
      styles.action,
      on && { backgroundColor: ST.ink },
      (pressed || disabled) && { opacity: 0.6 },
    ]}
    accessibilityRole="button"
    accessibilityState={{ selected: !!on, disabled: !!disabled }}
  >
    <Ionicons name={icon} size={20} color={on ? "#fff" : ST.ink} />
    <Text style={[styles.actionText, on && { color: "#fff" }]}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20 },
  identity: { flex: 1, gap: 6 },
  name: { fontSize: 22, fontWeight: "800", letterSpacing: -0.3, color: ST.ink },
  tags: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  tag: {
    height: 24,
    maxWidth: 160,
    paddingHorizontal: 10,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  tagText: { fontSize: 12, fontWeight: "700" },
  dot: { width: 7, height: 7, borderRadius: 4 },
  closeBtn: {
    alignSelf: "flex-start",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ST.surface,
  },
  actions: { flexDirection: "row", gap: 8 },
  action: {
    flex: 1,
    height: 74,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: ST.surface,
  },
  actionText: { fontSize: 13, fontWeight: "700", color: ST.ink },
  section: { gap: 6 },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 8,
  },
  count: { fontSize: 12, fontWeight: "700", color: ST.text2 },
  roleChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 4 },
  roleChip: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: ST.surface,
  },
  roleChipOn: { backgroundColor: ST.ink, paddingLeft: 12 },
  roleChipText: { fontSize: 14, fontWeight: "700", color: ST.ink },
  block: { borderRadius: 20, padding: 6, gap: 4, backgroundColor: ST.surface },
  permRow: {
    height: 46,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  permRowOff: { backgroundColor: "transparent" },
  permText: { flex: 1, fontSize: 14.5, fontWeight: "600", color: ST.ink },
  checkOn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ST.accent,
  },
  checkOff: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: "#B8B8BE" },
  deniedToggle: {
    height: 44,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  deniedText: { flex: 1, fontSize: 14, fontWeight: "600", color: ST.muted },
  note: { paddingHorizontal: 8, fontSize: 12.5, color: ST.muted },
  accessRow: {
    height: 60,
    paddingLeft: 12,
    paddingRight: 10,
    borderRadius: 14,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  accessTitle: { fontSize: 14.5, fontWeight: "700", color: ST.ink },
  accessSub: { fontSize: 12, color: ST.muted },
  removeRow: {
    height: 48,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  removeText: { fontSize: 14.5, fontWeight: "700", color: ST.danger },
});
