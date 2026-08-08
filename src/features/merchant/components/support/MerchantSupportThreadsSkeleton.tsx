import { Theme } from "@/src/theme";
import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

/**
 * Indicateur de chargement de la liste des discussions reçues par la boutique :
 * spinner centré sur toute la zone disponible. Rendu hors `ScrollView` par
 * l'appelant pour que le `flex: 1` s'étire et que le spinner tombe au centre.
 */
export const MerchantSupportThreadsSkeleton: React.FC = () => (
  <View style={styles.root}>
    <ActivityIndicator size="large" color={Theme.colors.primary} />
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center" },
});
