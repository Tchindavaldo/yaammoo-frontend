"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
// Copie adaptee de StaffMemberCreateSheet (R16) : page « Nouveau livreur ».
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { DEFAULT_DIAL, toE164 } from "../utils/staffFormat";
import { StaffPrimaryButton } from "./StaffPrimaryButton";
import { StaffPage } from "./StaffPage";
import { ST } from "./staffTheme";
import { t, useLanguage } from "@/src/i18n";

export type DriverRecruitMode = "create" | "add" | "invite";
export interface DriverRecruitDraft {
  mode: DriverRecruitMode;
  phoneNumber: string;
  prenom?: string;
  nom?: string;
  email?: string;
  password?: string;
}

const MODES: { key: DriverRecruitMode; label: string; help: string }[] = [
  { key: "create", label: "Créer un compte", help: "Le compte est créé s'il n'existe pas, puis il devient livreur tout de suite." },
  { key: "add", label: "Ajouter", help: "Il a déjà un compte : il devient livreur tout de suite et reçoit une notification." },
  { key: "invite", label: "Inviter", help: "Il a déjà un compte : il reçoit une invitation et doit l'accepter." },
];

interface Props {
  slotLabel: string;
  saving: boolean;
  onSubmit: (draft: DriverRecruitDraft) => Promise<boolean>;
  onClose: () => void;
}

/** Page « Nouveau livreur » : mode (créer / ajouter / inviter), numéro, et identifiants pour créer le compte. */
export const StaffDriverCreateSheet: React.FC<Props> = ({ slotLabel, saving, onSubmit, onClose }) => {
  useLanguage();
  const [mode, setMode] = useState<DriverRecruitMode>("add");
  const [phone, setPhone] = useState("");
  const [phoneFocus, setPhoneFocus] = useState(false);
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const e164 = toE164(phone);
  const phoneError = !phoneFocus && phone.trim().length > 0 && !e164;
  const create = mode === "create";
  const credsValid = !create || (/^\S+@\S+\.\S+$/.test(email.trim()) && password.length >= 6);
  const canSubmit = !!e164 && credsValid && !saving;

  const submit = async () => {
    if (!canSubmit || !e164) return;
    const ok = await onSubmit({
      mode,
      phoneNumber: e164,
      ...(create
        ? { prenom: prenom.trim() || undefined, nom: nom.trim() || undefined, email: email.trim(), password }
        : {}),
    });
    if (ok) onClose();
  };

  const current = MODES.find((m) => m.key === mode)!;
  return (
    <StaffPage
      header={
        <View style={styles.head}>
          <View style={{ gap: 3 }}>
            <Text style={styles.title}>{t("Nouveau livreur")}</Text>
            <Text style={styles.subtitle}>{slotLabel}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn} accessibilityLabel={t("Fermer")}>
            <Ionicons name="close" size={16} color={ST.ink} />
          </Pressable>
        </View>
      }
      footer={
        <StaffPrimaryButton
          label={mode === "invite" ? t("Envoyer l'invitation") : t("Ajouter le livreur")}
          onPress={submit}
          disabled={!canSubmit}
          loading={saving}
        />
      }
    >
      <View style={styles.field}>
        <View style={styles.chips}>
          {MODES.map((m) => {
            const on = m.key === mode;
            return (
              <Pressable key={m.key} onPress={() => setMode(m.key)} style={[styles.chip, on && styles.chipOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                <Text style={[styles.chipText, on && { color: "#fff" }]}>{t(m.label)}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.help}>{t(current.help)}</Text>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>{t("Numéro de téléphone")}</Text>
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
            accessibilityLabel={t("Numéro de téléphone")}
          />
        </View>
        {phoneError && <Text style={[styles.help, { color: ST.danger }]}>{t("Numéro invalide : 9 chiffres, ou le numéro complet avec +")}</Text>}
      </View>

      {create && (
        <>
          <View style={styles.pair}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>{t("Prénom")}</Text>
              <TextInput value={prenom} onChangeText={setPrenom} placeholder={t("Facultatif")} placeholderTextColor={ST.faint} style={styles.input} autoCapitalize="words" />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>{t("Nom")}</Text>
              <TextInput value={nom} onChangeText={setNom} placeholder={t("Facultatif")} placeholderTextColor={ST.faint} style={styles.input} autoCapitalize="words" />
            </View>
          </View>
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
              placeholder={t("Mot de passe")}
              placeholderTextColor={ST.faint}
              secureTextEntry
              autoCapitalize="none"
              style={styles.input}
            />
            <Text style={styles.help}>{t("Utilisés seulement si le numéro n'a pas encore de compte. 6 caractères minimum.")}</Text>
          </View>
        </>
      )}
    </StaffPage>
  );
};

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingHorizontal: 20 },
  title: { fontSize: 22, fontWeight: "800", letterSpacing: -0.3, color: ST.ink },
  subtitle: { fontSize: 13, fontWeight: "600", color: ST.muted },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: ST.surface },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: "700", color: ST.text2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { height: 40, paddingHorizontal: 16, borderRadius: 20, justifyContent: "center", backgroundColor: ST.surface },
  chipOn: { backgroundColor: ST.ink },
  chipText: { fontSize: 14, fontWeight: "700", color: ST.ink },
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
  dial: { height: 40, paddingHorizontal: 10, borderRadius: 10, justifyContent: "center", backgroundColor: "#fff" },
  dialText: { fontSize: 15, fontWeight: "700", color: ST.ink },
  phoneInput: { flex: 1, fontSize: 17, fontWeight: "700", color: ST.ink, paddingVertical: 0 },
  help: { fontSize: 12.5, color: ST.muted },
  pair: { flexDirection: "row", gap: 10 },
  input: { height: 52, paddingHorizontal: 14, borderRadius: 14, backgroundColor: ST.surface, fontSize: 16, fontWeight: "600", color: ST.ink },
});
