"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
// Confirmation d'annulation d'UNE commande, cote marchand : remplace le contenu
// de l'onglet affiche. Design de StaffConfirmDialog (R16 : copie), INLINE.
// MAQUETTE : « Oui » n'est pas encore branche au backend.
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { DS } from "@/src/theme/ds";
import { t, useLanguage } from "@/src/i18n";

interface Props {
  /** Numero de la commande selectionnee (« Cmd N »). */
  rank: number;
  onNo: () => void;
  onYes: () => void;
}

export function MerchantOrderDeleteConfirm({ rank, onNo, onYes }: Props) {
  useLanguage();
  return (
    <View style={styles.zone}>
      <View style={styles.icon}>
        <Ionicons name="trash-outline" size={26} color={DS.dangerInk} />
      </View>
      <Text style={styles.title}>{t("Annuler la commande ?")}</Text>
      <Text style={styles.message}>
        {t("La commande Cmd {{a}} sera annulée et le client sera prévenu. Les autres commandes ne changent pas.", { a: rank })}
      </Text>
      <View style={styles.row}>
        <TouchableOpacity style={[styles.btn, styles.no]} onPress={onNo} activeOpacity={0.8}>
          <Text style={styles.noText}>{t("Non")}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.yes]} onPress={onYes} activeOpacity={0.8}>
          <Text style={styles.yesText}>{t("Oui, annuler")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  zone: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
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
