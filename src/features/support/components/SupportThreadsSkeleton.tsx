import { Theme } from "@/src/theme";
import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

/**
 * Indicateur de chargement de la liste des discussions : spinner centré sur
 * toute la zone disponible. Rendu hors `ScrollView` par l'appelant pour que le
 * `flex: 1` s'étire vraiment et que le spinner tombe au centre de la page.
 */
export const SupportThreadsSkeleton: React.FC = () => (
  <View style={styles.root}>
    <ActivityIndicator size="large" color={Theme.colors.primary} />
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center" },
});
