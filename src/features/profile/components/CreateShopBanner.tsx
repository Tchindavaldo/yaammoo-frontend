"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
// Bandeau « Vendez sur Yaammoo » en haut du profil, pour un compte sans
// boutique (maquette P2 du canvas Design). Ouvre le parcours de creation.
import { DS } from "@/src/theme/ds";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { t, useLanguage } from "@/src/i18n";

interface Props {
  onPress: () => void;
}

export function CreateShopBanner({ onPress }: Props) {
  useLanguage();
  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <View style={styles.icon}>
          <Ionicons name="storefront-outline" size={19} color={DS.accent} />
        </View>
        <Text style={styles.title}>{t("Vendez sur Yaammoo")}</Text>
      </View>
      <Text style={styles.text}>
        {t("Créez votre boutique et recevez des commandes. Elle apparaît sur l'accueil dès 3 plats.")}
      </Text>
      <TouchableOpacity style={styles.btn} onPress={onPress} activeOpacity={0.8}>
        <Text style={styles.btnText}>{t("Créer ma boutique")}</Text>
        <Ionicons name="chevron-forward" size={14} color={DS.onInk} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 22,
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
