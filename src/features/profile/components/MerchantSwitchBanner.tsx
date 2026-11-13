"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
// Carte « Passer en mode client / marchand » du profil marchand, copiee de
// CreateShopBanner (R16).
import { DS } from "@/src/theme/ds";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { t, useLanguage } from "@/src/i18n";

interface Props {
  isMerchantMode: boolean;
  onPress: () => void;
}

export function MerchantSwitchBanner({ isMerchantMode, onPress }: Props) {
  useLanguage();
  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <View style={styles.icon}>
          <Ionicons name="swap-horizontal" size={19} color={DS.accent} />
        </View>
        <Text style={styles.title}>{isMerchantMode ? t("Mode marchand actif") : t("Mode client actif")}</Text>
      </View>
      <Text style={styles.text}>
        {isMerchantMode
          ? t("Passez en mode client pour commander comme un client.")
          : t("Revenez en mode marchand pour gérer votre boutique et vos commandes.")}
      </Text>
      <TouchableOpacity style={styles.btn} onPress={onPress} activeOpacity={0.8}>
        <Text style={styles.btnText}>{isMerchantMode ? t("Passer en mode client") : t("Passer en mode marchand")}</Text>
        <Ionicons name="chevron-forward" size={14} color={DS.onInk} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    borderRadius: 16,
    backgroundColor: DS.accentTint,
    padding: 16,
    gap: 10,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DS.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontSize: 16, fontWeight: "800", color: DS.ink },
  text: { fontSize: 13, fontWeight: "500", lineHeight: 18, color: DS.accentText },
  btn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: DS.ink,
  },
  btnText: { fontSize: 13, fontWeight: "700", color: DS.onInk },
});
