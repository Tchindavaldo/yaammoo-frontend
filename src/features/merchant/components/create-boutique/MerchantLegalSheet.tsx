"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
// Lecture des CGU depuis la creation de boutique (Annexe 3). Copie dediee de
// LegalReadSheet (R16) : la page `app/shop/create` est hors du LegalProvider,
// le texte est donc lu ici directement (`GET /legal/current`).
import { GlobalToastHost } from "@/src/components/GlobalToastHost";
import { useSheetSafeInsets } from "@/src/hooks/usePageBottomInset";
import { DS } from "@/src/theme/ds";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { t, useLanguage } from "@/src/i18n";
import { LegalText } from "@/src/features/legal/components/LegalText";
import type { LegalDocument } from "@/src/features/legal/services/legalService";

export function MerchantLegalSheet({ visible, onClose, document }: { visible: boolean; onClose: () => void; document: LegalDocument | null }) {
  useLanguage();
  const insets = useSheetSafeInsets();
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.page, { paddingTop: insets.top + 12, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <Text style={styles.title}>{t("Conditions d'utilisation et confidentialité")}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel={t("Fermer")}>
            <Ionicons name="close" size={24} color={DS.ink} />
          </TouchableOpacity>
        </View>
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
  scroll: { flex: 1, marginTop: 12 },
  scrollContent: { paddingBottom: 16 },
});
