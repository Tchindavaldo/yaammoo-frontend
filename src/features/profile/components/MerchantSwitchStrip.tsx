"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
// Carte compacte « Passer en mode client / marchand » (une ligne), copiee de
// MerchantSwitchBanner (R16) pour tenir dans le bas du profil.
import { DS } from "@/src/theme/ds";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { t, useLanguage } from "@/src/i18n";

interface Props {
  isMerchantMode: boolean;
  onPress: () => void;
}

export function MerchantSwitchStrip({ isMerchantMode, onPress }: Props) {
  useLanguage();
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.icon}>
        <Ionicons name="swap-horizontal" size={17} color={DS.accent} />
      </View>
      <View style={styles.texts}>
        <Text style={styles.title} numberOfLines={1}>
          {isMerchantMode ? t("Mode marchand actif") : t("Mode client actif")}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {isMerchantMode ? t("Passer en mode client") : t("Passer en mode marchand")}
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
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: DS.bg, justifyContent: "center", alignItems: "center" },
  texts: { flex: 1, gap: 2 },
  title: { fontSize: 14.5, fontWeight: "800", color: DS.ink },
  sub: { fontSize: 12.5, fontWeight: "500", color: DS.accentText },
  btn: { width: 36, height: 36, borderRadius: 12, backgroundColor: DS.ink, justifyContent: "center", alignItems: "center" },
});
