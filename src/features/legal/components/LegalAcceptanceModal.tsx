"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
// Écran d'acceptation des conditions d'utilisation et de la politique de
// confidentialité. Bloquant : affiché tant que `GET /legal/status` renvoie
// `mustAccept` (première fois, ou version importante). Le texte défile ; les
// deux cases et le bouton restent fixés en bas, sans obligation de lire.
import { GlobalToastHost } from "@/src/components/GlobalToastHost";
import { useSheetSafeInsets } from "@/src/hooks/usePageBottomInset";
import { showToast } from "@/src/services/globalToast";
import { DS } from "@/src/theme/ds";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { t, useLanguage } from "@/src/i18n";
import { useLegal } from "../context/LegalContext";
import { LegalText } from "./LegalText";

function CheckRow({ checked, label, onPress }: { checked: boolean; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.checkRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.box, checked && styles.boxOn]}>{checked && <Ionicons name="checkmark" size={14} color={DS.onInk} />}</View>
      <Text style={styles.checkLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export function LegalAcceptanceModal() {
  useLanguage();
  const insets = useSheetSafeInsets();
  const { status, document, loadDocument, accept } = useLegal();
  const visible = !!status?.mustAccept;
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (visible && !document) loadDocument();
  }, [visible, document, loadDocument]);

  const submit = async () => {
    if (!terms || !privacy || sending) return;
    setSending(true);
    const ok = await accept();
    setSending(false);
    if (!ok) showToast(t("Les conditions ont été mises à jour. Merci de les vérifier puis de valider à nouveau."), "error");
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={() => {}}>
      <View style={[styles.page, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.title}>{t("Conditions d'utilisation et confidentialité")}</Text>
        {document ? <Text style={styles.meta}>{t("Version {{v}}", { v: document.version })}</Text> : null}
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {document ? <LegalText content={document.content} /> : <ActivityIndicator color={DS.accent} style={{ marginTop: 40 }} />}
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: insets.bottom }]}>
          <CheckRow checked={terms} onPress={() => setTerms(v => !v)} label={t("J'accepte les conditions générales d'utilisation")} />
          <CheckRow checked={privacy} onPress={() => setPrivacy(v => !v)} label={t("J'ai lu la politique de confidentialité")} />
          <TouchableOpacity style={[styles.btn, !(terms && privacy && document) && styles.btnOff]} onPress={submit} disabled={!(terms && privacy && document) || sending} activeOpacity={0.85}>
            {sending ? <ActivityIndicator color={DS.onInk} /> : <Text style={styles.btnText}>{t("Continuer")}</Text>}
          </TouchableOpacity>
        </View>
      </View>
      <GlobalToastHost modal />
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: DS.bg, paddingHorizontal: 16 },
  title: { fontSize: 20, fontWeight: "700", color: DS.ink },
  meta: { fontSize: 12, color: DS.muted, marginTop: 4 },
  scroll: { flex: 1, marginTop: 12 },
  scrollContent: { paddingBottom: 16 },
  footer: { borderTopWidth: 1, borderTopColor: DS.line, paddingTop: 12, gap: 10, backgroundColor: DS.bg },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: DS.slate300, alignItems: "center", justifyContent: "center" },
  boxOn: { backgroundColor: DS.accent, borderColor: DS.accent },
  checkLabel: { flex: 1, fontSize: 14, color: DS.ink },
  btn: { height: 50, borderRadius: 25, backgroundColor: DS.accent, alignItems: "center", justifyContent: "center", marginTop: 4 },
  btnOff: { opacity: 0.4 },
  btnText: { color: DS.onInk, fontSize: 16, fontWeight: "700" },
});
