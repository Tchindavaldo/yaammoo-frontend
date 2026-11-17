"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
// Formulaire d'adhesion du Marchand (Annexe 3 des CGU), en bottom sheet
// OBLIGATOIRE sur l'accueil apres la creation de la boutique : affiche tant que
// `GET /legal/status` renvoie `merchantAdhesionPending`, impossible a fermer.
// Qualite en texte libre (les suggestions pre-remplissent le champ), denomination
// facultative, case d'acceptation. L'adresse est deduite de la boutique (backend).
import { GlobalToastHost } from "@/src/components/GlobalToastHost";
import { useSheetSafeInsets } from "@/src/hooks/usePageBottomInset";
import { useSheetAnimation } from "@/src/hooks/useSheetAnimation";
import { showToast } from "@/src/services/globalToast";
import { DS } from "@/src/theme/ds";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Animated, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { t, useLanguage } from "@/src/i18n";
import { useLegal } from "../context/LegalContext";
import { LegalReadSheet } from "./LegalReadSheet";

const SUGGESTIONS = ["Gérant", "Directeur", "Propriétaire"];

export function MerchantAdhesionSheet() {
  useLanguage();
  const insets = useSheetSafeInsets();
  const { status, document, loadDocument, submitAdhesion } = useLegal();
  const visible = !!status?.merchantAdhesionPending && !status?.mustAccept;
  const anim = useSheetAnimation(visible);
  const [role, setRole] = useState("");
  const [legalName, setLegalName] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [sending, setSending] = useState(false);
  const [reading, setReading] = useState(false);

  useEffect(() => {
    if (visible && !document) loadDocument();
  }, [visible, document, loadDocument]);

  const ready = !!role.trim() && accepted && !sending;
  const submit = async () => {
    if (!ready) return;
    setSending(true);
    const ok = await submitAdhesion(role.trim(), legalName.trim());
    setSending(false);
    if (!ok) showToast(t("Envoi impossible, réessayez dans un instant"), "error");
  };

  if (!anim.mounted) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={() => {}} statusBarTranslucent>
      <Animated.View style={[styles.backdrop, anim.backdropStyle]} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.wrap}>
        <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom }, anim.sheetStyle]} onLayout={anim.onSheetLayout}>
          <Text style={styles.title}>{t("Finaliser votre boutique")}</Text>
          <Text style={styles.sub}>{t("Formulaire d'adhésion du Marchand, à remplir une seule fois.")}</Text>

          <Text style={styles.label}>{t("Votre qualité")}</Text>
          <View style={styles.chips}>
            {SUGGESTIONS.map(s => {
              const on = role.trim() === t(s);
              return (
                <TouchableOpacity key={s} style={[styles.chip, on && styles.chipOn]} onPress={() => setRole(t(s))} activeOpacity={0.8}>
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{t(s)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TextInput style={styles.input} value={role} onChangeText={setRole} placeholder={t("Ex. : Manager")} placeholderTextColor={DS.muted} maxLength={60} />

          <Text style={styles.label}>{t("Dénomination légale de l'entreprise (facultatif)")}</Text>
          <TextInput style={styles.input} value={legalName} onChangeText={setLegalName} placeholder={t("Ex. : RAUVAL SARL")} placeholderTextColor={DS.muted} />

          <TouchableOpacity style={styles.row} onPress={() => setAccepted(v => !v)} activeOpacity={0.7}>
            <View style={[styles.box, accepted && styles.boxOn]}>{accepted && <Ionicons name="checkmark" size={14} color={DS.onInk} />}</View>
            <Text style={styles.checkText}>
              {t("J'ai lu et j'accepte les Conditions générales, l'Annexe 1 (Marchands) et les conditions des Partenaires de paiement. Cette validation vaut signature.")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setReading(true)} hitSlop={8}>
            <Text style={styles.link}>{t("Lire les conditions")}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.btn, !ready && styles.btnOff]} onPress={submit} disabled={!ready} activeOpacity={0.85}>
            {sending ? <ActivityIndicator color={DS.onInk} /> : <Text style={styles.btnText}>{t("Valider")}</Text>}
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
      <LegalReadSheet visible={reading} onClose={() => setReading(false)} />
      <GlobalToastHost modal />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: DS.backdrop },
  wrap: { flex: 1, justifyContent: "flex-end" },
  sheet: { backgroundColor: DS.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 16, paddingTop: 18, gap: 8 },
  title: { fontSize: 19, fontWeight: "700", color: DS.ink },
  sub: { fontSize: 13, color: DS.text2, marginBottom: 6 },
  label: { fontSize: 13, fontWeight: "600", color: DS.ink, marginTop: 4 },
  chips: { flexDirection: "row", gap: 8 },
  chip: { flex: 1, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: DS.slate200, alignItems: "center", backgroundColor: DS.bg },
  chipOn: { borderColor: DS.accent, backgroundColor: DS.accentTint },
  chipText: { fontSize: 13, color: DS.text2, fontWeight: "600" },
  chipTextOn: { color: DS.accentText },
  input: { borderWidth: 1, borderColor: DS.slate200, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: DS.ink, backgroundColor: DS.bg },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 8 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: DS.slate300, alignItems: "center", justifyContent: "center", marginTop: 1 },
  boxOn: { borderColor: DS.accent, backgroundColor: DS.accent },
  checkText: { flex: 1, fontSize: 13, lineHeight: 18, color: DS.text2 },
  link: { fontSize: 13, fontWeight: "700", color: DS.accentText, marginLeft: 32 },
  btn: { height: 50, borderRadius: 25, backgroundColor: DS.accent, alignItems: "center", justifyContent: "center", marginTop: 10, marginBottom: 6 },
  btnOff: { opacity: 0.4 },
  btnText: { color: DS.onInk, fontSize: 16, fontWeight: "700" },
});
