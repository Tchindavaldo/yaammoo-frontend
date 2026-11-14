"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
// Lecture seule des conditions d'utilisation et de la politique de
// confidentialité, ouverte depuis le menu compte (pastille du header Profil).
// Pas de case à cocher ici : l'acceptation passe par LegalAcceptanceModal.
import { GlobalToastHost } from "@/src/components/GlobalToastHost";
import { useSheetSafeInsets } from "@/src/hooks/usePageBottomInset";
import { DS } from "@/src/theme/ds";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { dateLocale, t, useLanguage } from "@/src/i18n";
import { useLegal } from "../context/LegalContext";
import { LegalText } from "./LegalText";

const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(dateLocale(), { day: "2-digit", month: "2-digit", year: "numeric" }) : "");

export function LegalReadSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  useLanguage();
  const insets = useSheetSafeInsets();
  const { status, document, loadDocument, markSeen } = useLegal();

  useEffect(() => {
    if (!visible) return;
    loadDocument();
    markSeen();
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.page, { paddingTop: insets.top + 12, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <Text style={styles.title}>{t("Conditions d'utilisation et confidentialité")}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("Fermer")}>
            <Ionicons name="close" size={24} color={DS.ink} />
          </TouchableOpacity>
        </View>
        {document ? (
          <Text style={styles.meta}>
            {t("Version {{v}} du {{d}}", { v: document.version, d: fmtDate(document.publishedAt) })}
            {status?.acceptedAt ? ` · ${t("Accepté le {{d}}", { d: fmtDate(status.acceptedAt) })}` : ""}
          </Text>
        ) : null}
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {document ? <LegalText content={document.content} /> : <ActivityIndicator color={DS.accent} style={{ marginTop: 40 }} />}
        </ScrollView>
      </View>
      <GlobalToastHost modal />
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: DS.bg, paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { flex: 1, fontSize: 20, fontWeight: "700", color: DS.ink },
  meta: { fontSize: 12, color: DS.muted, marginTop: 4 },
  scroll: { flex: 1, marginTop: 12 },
  scrollContent: { paddingBottom: 16 },
});
