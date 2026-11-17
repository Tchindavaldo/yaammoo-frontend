"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { ActivityIndicator } from "@/src/components/CustomActivityIndicator";
import { t, useLanguage } from "@/src/i18n";
import { Theme } from "@/src/theme";
import { DS } from "@/src/theme/ds";

/**
 * Loader d'un tab categorie, par-dessus sa liste (copie dediee de
 * `HomeLoadingScreen`, R16). Pendant la requete du tab ; la liste, dessous, se
 * prepare sans etre vue.
 */
export const CategoryLoadingScreen: React.FC<{ bottomInset: number }> = ({ bottomInset }) => {
  useLanguage();
  return (
    <View style={[StyleSheet.absoluteFill, styles.cover, { paddingBottom: bottomInset }]}>
      <ActivityIndicator size="large" color={Theme.colors.primary} />
      <Text style={styles.text}>{t("Recherche des meilleurs plats...")}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  cover: {
    backgroundColor: DS.bg,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  text: {
    color: Theme.colors.gray[500],
    fontSize: 14,
  },
});
