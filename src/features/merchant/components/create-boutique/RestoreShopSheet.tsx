"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
// Proposition de restauration d'une boutique supprimee avec le compte, affichee
// a l'ouverture de la creation de boutique : « Restaurer » ou « Creer une
// nouvelle boutique ».
import { GlobalToastHost } from "@/src/components/GlobalToastHost";
import { useSheetSafeInsets } from "@/src/hooks/usePageBottomInset";
import { DS } from "@/src/theme/ds";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { dateLocale, t, useLanguage } from "@/src/i18n";
import type { RestorableShop } from "./useRestorableShops";

interface Props {
  visible: boolean;
  shops: RestorableShop[];
  restoringId: string | null;
  onRestore: (id: string) => void;
  onCreateNew: () => void;
}

const fmt = (iso: string) => new Date(iso).toLocaleDateString(dateLocale(), { day: "2-digit", month: "2-digit", year: "numeric" });

export function RestoreShopSheet({ visible, shops, restoringId, onRestore, onCreateNew }: Props) {
  useLanguage();
  const { bottom } = useSheetSafeInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCreateNew}>
      <Pressable style={styles.backdrop} onPress={onCreateNew} />
      <View style={[styles.sheet, { paddingBottom: bottom }]}>
        <Text style={styles.title}>{t("Vous avez déjà eu une boutique")}</Text>
        <Text style={styles.sub}>{t("Restaurez-la avec ses plats et son historique, ou créez une nouvelle boutique.")}</Text>
        <ScrollView style={styles.list} contentContainerStyle={{ gap: 10 }}>
          {shops.map(s => (
            <View key={s.id} style={styles.row}>
              {s.image ? <Image source={{ uri: s.image }} style={styles.img} /> : <View style={[styles.img, styles.imgEmpty]}><Ionicons name="storefront-outline" size={20} color={DS.muted} /></View>}
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>{s.name}</Text>
                <Text style={styles.date}>{t("Supprimée le {{d}}", { d: fmt(s.deletedAt) })}</Text>
              </View>
              <TouchableOpacity style={styles.restoreBtn} onPress={() => onRestore(s.id)} disabled={!!restoringId} activeOpacity={0.85}>
                {restoringId === s.id ? <ActivityIndicator size="small" color={DS.onInk} /> : <Text style={styles.restoreText}>{t("Restaurer")}</Text>}
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
        <TouchableOpacity style={styles.newBtn} onPress={onCreateNew} disabled={!!restoringId} activeOpacity={0.7}>
          <Text style={styles.newText}>{t("Créer une nouvelle boutique")}</Text>
        </TouchableOpacity>
      </View>
      <GlobalToastHost modal />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: DS.backdrop },
  sheet: { backgroundColor: DS.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 22, maxHeight: "80%" },
  title: { fontSize: 18, fontWeight: "700", color: DS.ink, textAlign: "center" },
  sub: { fontSize: 13, lineHeight: 18, color: DS.text2, textAlign: "center", marginTop: 6 },
  list: { marginTop: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 16, backgroundColor: DS.slate50, borderWidth: 1, borderColor: DS.slate200 },
  img: { width: 44, height: 44, borderRadius: 12 },
  imgEmpty: { backgroundColor: DS.slate200, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 14, fontWeight: "700", color: DS.ink },
  date: { fontSize: 12, color: DS.muted, marginTop: 2 },
  restoreBtn: { height: 38, paddingHorizontal: 16, borderRadius: 999, backgroundColor: DS.ink, alignItems: "center", justifyContent: "center", minWidth: 96 },
  restoreText: { fontSize: 13, fontWeight: "600", color: DS.onInk },
  newBtn: { height: 50, borderRadius: 999, borderWidth: 1, borderColor: DS.slate200, alignItems: "center", justifyContent: "center", marginTop: 16, marginBottom: 8 },
  newText: { fontSize: 15, fontWeight: "600", color: DS.ink },
});
