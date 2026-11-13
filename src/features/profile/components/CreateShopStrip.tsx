"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
// Carte compacte « Vendez sur Yaammoo » (une ligne) pour un compte sans
// boutique, copiee de MerchantSwitchStrip (R16). Icone et texte
// alignes sur les lignes du dessus (padding 14, icone 18, gap 12).
import { DS } from "@/src/theme/ds";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { t, useLanguage } from "@/src/i18n";

interface Props {
  onPress: () => void;
}

export function CreateShopStrip({ onPress }: Props) {
  useLanguage();
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <Ionicons name="storefront-outline" size={18} color={DS.accent} />
      <View style={styles.texts}>
        <Text style={styles.title} numberOfLines={1}>
          {t("Vendez sur Yaammoo")}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {t("Créer ma boutique")}
        </Text>
      </View>
      <View style={styles.btn}>
        <Ionicons name="chevron-forward" size={16} color={DS.onInk} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    height: 60,
    borderRadius: 16,
    backgroundColor: DS.accentTint,
    paddingLeft: 14,
    paddingRight: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  texts: { flex: 1, gap: 2 },
  title: { fontSize: 14.5, fontWeight: "800", color: DS.ink },
  sub: { fontSize: 12.5, fontWeight: "500", color: DS.accentText },
  btn: { width: 36, height: 36, borderRadius: 12, backgroundColor: DS.ink, justifyContent: "center", alignItems: "center" },
});
