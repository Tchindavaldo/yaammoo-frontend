"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
// Confirmation d'annulation, au design de StaffConfirmDialog (R16 : copie) mais
// INLINE : OrderLivraisonTab la rend a la place de tout le contenu de l'onglet.
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { DS } from "@/src/theme/ds";
import { t, useLanguage } from "@/src/i18n";
import { OrderCancel } from "../hooks/useOrderCancel";

export function OrderCancelConfirm({ cancel }: { cancel: OrderCancel }) {
  useLanguage();
  return (
    <View style={styles.zone}>
      <View style={styles.icon}>
        <Ionicons name="close-circle-outline" size={26} color={DS.dangerInk} />
      </View>
      <Text style={styles.title}>{t("Annuler la commande ?")}</Text>
      <Text style={styles.message}>{cancel.confirmText}</Text>
      <View style={styles.row}>
        <TouchableOpacity style={[styles.btn, styles.no]} onPress={cancel.dismiss} disabled={cancel.busy} activeOpacity={0.8}>
          <Text style={styles.noText}>{t("Non")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.yes]} onPress={() => cancel.cancel()} disabled={cancel.busy} activeOpacity={0.8}>
          {cancel.busy ? <ActivityIndicator size="small" color={DS.onInk} /> : <Text style={styles.yesText}>{t("Oui, annuler")}</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  zone: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  icon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 12, backgroundColor: DS.dangerSoft },
  title: { fontSize: 17, fontWeight: "800", color: DS.ink, marginBottom: 6, textAlign: "center" },
  message: { fontSize: 14, lineHeight: 20, color: DS.muted, textAlign: "center", marginBottom: 20 },
  row: { flexDirection: "row", gap: 10, width: "100%" },
  btn: { flex: 1, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  no: { backgroundColor: DS.surface },
  noText: { fontSize: 15, fontWeight: "700", color: DS.ink },
  yes: { backgroundColor: DS.dangerInk },
  yesText: { fontSize: 15, fontWeight: "700", color: DS.onInk },
});
