import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { StaffRole, StaffRoleDraft } from "../types/staff.types";
import { PERMISSION_GROUPS, type PermissionMeta } from "../utils/staffPermissions";
import { StaffPrimaryButton } from "./StaffPrimaryButton";
import { StaffPage } from "./StaffPage";
import { StaffSwitch } from "./StaffSwitch";
import { capsLabel, ST } from "./staffTheme";

const NAME_MAX = 40;

interface Props {
  /** Rôle modifié ; absent = création. */
  role?: StaffRole | null;
  /** Rôles existants : modèles « Partir de » et contrôle des doublons. */
  roles: StaffRole[];
  catalog: PermissionMeta[];
  saving: boolean;
  onSave: (draft: StaffRoleDraft) => Promise<boolean>;
  onClose: () => void;
}

/**
 * Feuille rôle (création ou modification) : nom, modèle de départ, puis un
 * interrupteur par permission, groupées Commandes / Boutique / Équipe.
 */
export const StaffRoleSheet: React.FC<Props> = ({ role, roles, catalog, saving, onSave, onClose }) => {
  const [name, setName] = useState(role?.name || "");
  const [focus, setFocus] = useState(false);
  const [perms, setPerms] = useState<string[]>(role?.permissions || []);

  const others = roles.filter((r) => r.id !== role?.id);
  const trimmed = name.trim();
  const duplicate = others.some((r) => r.name.trim().toLowerCase() === trimmed.toLowerCase());
  const known = catalog.filter((c) => perms.includes(c.key)).length;
  const canSave = trimmed.length > 0 && !duplicate && !saving;

  const toggle = (key: string, on: boolean) =>
    setPerms((prev) => (on ? [...prev.filter((k) => k !== key), key] : prev.filter((k) => k !== key)));

  const save = async () => {
    if (!canSave) return;
    // Clés hors catalogue (inconnues de l'app) conservées telles quelles.
    const ok = await onSave({ name: trimmed, permissions: perms });
    if (ok) onClose();
  };

  return (
    <StaffPage
      header={
        <View style={styles.head}>
          <Pressable onPress={onClose} hitSlop={10} style={styles.roundBtn} accessibilityLabel="Retour">
            <Ionicons name="chevron-back" size={18} color={ST.ink} />
          </Pressable>
          <Text style={styles.title}>{role ? "Modifier le rôle" : "Nouveau rôle"}</Text>
          <View style={styles.roundSpacer} />
        </View>
      }
      footer={
        <StaffPrimaryButton
          label="Enregistrer le rôle"
          badge={known}
          onPress={save}
          disabled={!canSave}
          loading={saving}
        />
      }
    >
      <View style={styles.field}>
        <Text style={styles.label}>Nom du rôle</Text>
        <TextInput
          value={name}
          onChangeText={(t) => setName(t.slice(0, NAME_MAX))}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          placeholder="Caisse, Cuisine, Gérant…"
          placeholderTextColor={ST.faint}
          maxLength={NAME_MAX}
          style={[styles.input, focus && styles.focused, duplicate && styles.errored]}
          accessibilityLabel="Nom du rôle"
        />
        {duplicate && <Text style={styles.error}>Un rôle porte déjà ce nom.</Text>}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.presets}
      >
        <Text style={styles.presetLabel}>Partir de</Text>
        {others.map((r) => (
          <Preset key={r.id} label={r.name} onPress={() => setPerms(r.permissions)} />
        ))}
        <Preset label="Tout" onPress={() => setPerms(catalog.map((c) => c.key))} />
        <Preset label="Rien" onPress={() => setPerms([])} />
      </ScrollView>

      {PERMISSION_GROUPS.map((g) => {
        const items = catalog.filter((c) => c.group === g.key);
        if (items.length === 0) return null;
        const on = items.filter((c) => perms.includes(c.key)).length;
        return (
          <View key={g.key} style={styles.group}>
            <View style={styles.groupHead}>
              <Text style={capsLabel}>{g.label}</Text>
              <Text style={styles.groupCount}>
                {on} / {items.length}
              </Text>
            </View>
            <View style={styles.block}>
              {items.map((p) => (
                <View key={p.key} style={[styles.row, !!p.hint && { height: 60 }]}>
                  <Ionicons name={p.icon} size={19} color={g.key === "team" ? ST.accentText : ST.ink} />
                  <View style={{ flex: 1, gap: 1 }}>
                    <Text style={styles.rowText}>{p.label}</Text>
                    {!!p.hint && <Text style={styles.rowHint}>{p.hint}</Text>}
                  </View>
                  <StaffSwitch
                    value={perms.includes(p.key)}
                    onValueChange={(v) => toggle(p.key, v)}
                    label={p.label}
                  />
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </StaffPage>
  );
};

const Preset = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <Pressable onPress={onPress} style={styles.preset} accessibilityRole="button">
    <Text style={styles.presetText}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  roundBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ST.surface,
  },
  roundSpacer: { width: 36, height: 36 },
  title: { fontSize: 18, fontWeight: "800", color: ST.ink },
  field: { gap: 6, paddingHorizontal: 4 },
  label: { fontSize: 13, fontWeight: "700", color: ST.text2 },
  input: {
    height: 52,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "transparent",
    backgroundColor: ST.surface,
    fontSize: 17,
    fontWeight: "700",
    color: ST.ink,
  },
  focused: { borderColor: ST.ink },
  errored: { borderColor: ST.danger },
  error: { fontSize: 12.5, color: ST.danger },
  presets: { alignItems: "center", gap: 8, paddingHorizontal: 4 },
  presetLabel: { fontSize: 12.5, fontWeight: "700", color: ST.muted },
  preset: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    justifyContent: "center",
    backgroundColor: ST.surface,
  },
  presetText: { fontSize: 13, fontWeight: "700", color: ST.ink },
  group: { gap: 6 },
  groupHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  groupCount: { fontSize: 12, fontWeight: "700", color: ST.text2 },
  block: { borderRadius: 20, padding: 6, gap: 4, backgroundColor: ST.surface },
  row: {
    height: 48,
    paddingLeft: 12,
    paddingRight: 10,
    borderRadius: 14,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowText: { fontSize: 14.5, fontWeight: "600", color: ST.ink },
  rowHint: { fontSize: 12, color: ST.muted },
});
