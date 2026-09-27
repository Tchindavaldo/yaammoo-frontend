import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { StaffMemberDraft, StaffRole } from "../types/staff.types";
import { DEFAULT_DIAL, toE164 } from "../utils/staffFormat";
import { grantedOf, isFullAccess, type PermissionMeta } from "../utils/staffPermissions";
import { StaffPrimaryButton } from "./StaffPrimaryButton";
import { StaffPage } from "./StaffPage";
import { StaffSwitch } from "./StaffSwitch";
import { capsLabel, ST } from "./staffTheme";

interface Props {
  roles: StaffRole[];
  catalog: PermissionMeta[];
  /** « Poste 6 sur 8 ». */
  slotLabel: string;
  /** Rôle choisi, piloté par l'écran (un rôle créé depuis ici est présélectionné). */
  roleId: string | null;
  onSelectRole: (roleId: string) => void;
  saving: boolean;
  onSubmit: (draft: StaffMemberDraft) => Promise<boolean>;
  onNewRole: () => void;
  onEditRole: (role: StaffRole) => void;
  onClose: () => void;
}

/**
 * Feuille « Nouveau membre » : numéro (connexion par code SMS), prénom et
 * nom, rôle avec l'aperçu de ce qu'il permet, et connexion email facultative.
 */
export const StaffMemberCreateSheet: React.FC<Props> = ({
  roles,
  catalog,
  slotLabel,
  roleId,
  onSelectRole,
  saving,
  onSubmit,
  onNewRole,
  onEditRole,
  onClose,
}) => {
  const [phone, setPhone] = useState("");
  const [phoneFocus, setPhoneFocus] = useState(false);
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [emailOn, setEmailOn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const e164 = toE164(phone);
  const phoneError = !phoneFocus && phone.trim().length > 0 && !e164;
  const role = roles.find((r) => r.id === roleId) || null;
  const emailValid = !emailOn || (/^\S+@\S+\.\S+$/.test(email.trim()) && password.length >= 6);
  const canSubmit = !!e164 && !!role && emailValid && !saving;

  const submit = async () => {
    if (!canSubmit || !e164 || !role) return;
    const ok = await onSubmit({
      phoneNumber: e164,
      roleId: role.id,
      prenom: prenom.trim() || undefined,
      nom: nom.trim() || undefined,
      email: emailOn ? email.trim() : undefined,
      password: emailOn ? password : undefined,
    });
    if (ok) onClose();
  };

  const granted = role ? grantedOf(role.permissions, catalog) : [];
  const full = role ? isFullAccess(role.permissions, catalog) : false;

  return (
    <StaffPage
      header={
        <View style={styles.head}>
          <View style={{ gap: 3 }}>
            <Text style={styles.title}>Nouveau membre</Text>
            <Text style={styles.subtitle}>{slotLabel}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn} accessibilityLabel="Fermer">
            <Ionicons name="close" size={16} color={ST.ink} />
          </Pressable>
        </View>
      }
      footer={
        <StaffPrimaryButton
          label="Créer le membre"
          onPress={submit}
          disabled={!canSubmit}
          loading={saving}
        />
      }
    >
      <View style={styles.field}>
        <Text style={styles.label}>Numéro de téléphone</Text>
        <View style={[styles.phoneBox, phoneFocus && styles.focused, phoneError && styles.errored]}>
          <View style={styles.dial}>
            <Text style={styles.dialText}>{DEFAULT_DIAL}</Text>
          </View>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            onFocus={() => setPhoneFocus(true)}
            onBlur={() => setPhoneFocus(false)}
            placeholder="6 77 45 90 12"
            placeholderTextColor={ST.faint}
            keyboardType="phone-pad"
            style={styles.phoneInput}
            accessibilityLabel="Numéro de téléphone"
          />
        </View>
        <Text style={[styles.help, phoneError && { color: ST.danger }]}>
          {phoneError
            ? "Numéro invalide : 9 chiffres, ou le numéro complet avec +"
            : "Il se connectera avec ce numéro, par code SMS."}
        </Text>
      </View>

      <View style={styles.pair}>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={styles.label}>Prénom</Text>
          <TextInput
            value={prenom}
            onChangeText={setPrenom}
            placeholder="Facultatif"
            placeholderTextColor={ST.faint}
            style={styles.input}
            autoCapitalize="words"
          />
        </View>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={styles.label}>Nom</Text>
          <TextInput
            value={nom}
            onChangeText={setNom}
            placeholder="Facultatif"
            placeholderTextColor={ST.faint}
            style={styles.input}
            autoCapitalize="words"
          />
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Rôle</Text>
        <View style={styles.chips}>
          {roles.map((r) => {
            const on = r.id === roleId;
            return (
              <Pressable
                key={r.id}
                onPress={() => onSelectRole(r.id)}
                style={[styles.roleChip, on && styles.roleChipOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                {on && <Ionicons name="checkmark" size={15} color={ST.accent} />}
                <Text style={[styles.roleChipText, on && { color: "#fff" }]}>{r.name}</Text>
              </Pressable>
            );
          })}
          <Pressable onPress={onNewRole} style={styles.newRole} accessibilityRole="button">
            <Ionicons name="add" size={16} color={ST.accentText} />
            <Text style={styles.newRoleText}>Nouveau rôle</Text>
          </Pressable>
        </View>

        {role && (
          <View style={styles.preview}>
            <View style={styles.previewHead}>
              <Text style={capsLabel} numberOfLines={1}>
                {role.name.toUpperCase()} PEUT
              </Text>
              <Pressable onPress={() => onEditRole(role)} hitSlop={8} accessibilityRole="button">
                <Text style={styles.link}>Modifier</Text>
              </Pressable>
            </View>
            <View style={styles.permChips}>
              {full ? (
                <PermChip icon="shield-checkmark-outline" label="Accès complet" />
              ) : granted.length === 0 ? (
                <Text style={styles.help}>Aucune permission : seule la connexion est possible.</Text>
              ) : (
                granted.map((p) => <PermChip key={p.key} icon={p.icon} label={p.short} />)
              )}
            </View>
          </View>
        )}
      </View>

      <View style={styles.switchRow}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.switchTitle}>Connexion par email aussi</Text>
          <Text style={styles.help}>Facultatif : email et mot de passe en plus du code SMS.</Text>
        </View>
        <StaffSwitch value={emailOn} onValueChange={setEmailOn} label="Connexion par email aussi" />
      </View>

      {emailOn && (
        <>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={ST.faint}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
          <View style={styles.field}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Mot de passe"
              placeholderTextColor={ST.faint}
              secureTextEntry
              autoCapitalize="none"
              style={styles.input}
            />
            <Text style={styles.help}>6 caractères minimum. Transmis au membre par vos soins.</Text>
          </View>
        </>
      )}
    </StaffPage>
  );
};

const PermChip = ({ icon, label }: { icon: PermissionMeta["icon"]; label: string }) => (
  <View style={styles.permChip}>
    <Ionicons name={icon} size={15} color={ST.ink} />
    <Text style={styles.permChipText}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  head: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  title: { fontSize: 22, fontWeight: "800", letterSpacing: -0.3, color: ST.ink },
  subtitle: { fontSize: 13, fontWeight: "600", color: ST.muted },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ST.surface,
  },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: "700", color: ST.text2 },
  phoneBox: {
    height: 52,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "transparent",
    backgroundColor: ST.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  focused: { borderColor: ST.ink },
  errored: { borderColor: ST.danger },
  dial: {
    height: 40,
    paddingHorizontal: 10,
    borderRadius: 10,
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  dialText: { fontSize: 15, fontWeight: "700", color: ST.ink },
  phoneInput: { flex: 1, fontSize: 17, fontWeight: "700", color: ST.ink, paddingVertical: 0 },
  help: { fontSize: 12.5, color: ST.muted },
  pair: { flexDirection: "row", gap: 10 },
  input: {
    height: 52,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: ST.surface,
    fontSize: 16,
    fontWeight: "600",
    color: ST.ink,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
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
  newRole: {
    height: 40,
    paddingLeft: 12,
    paddingRight: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: ST.accentInk,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  newRoleText: { fontSize: 14, fontWeight: "700", color: ST.accentText },
  preview: {
    marginTop: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: ST.surface,
    gap: 10,
  },
  previewHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  link: { fontSize: 13, fontWeight: "700", color: ST.accentText },
  permChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  permChip: {
    height: 30,
    paddingLeft: 8,
    paddingRight: 10,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
  },
  permChipText: { fontSize: 13, fontWeight: "700", color: ST.ink },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 2 },
  switchTitle: { fontSize: 15, fontWeight: "700", color: ST.ink },
});
