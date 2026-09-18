import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { Theme } from "@/src/theme";

/**
 * Skeleton d'une ligne du PORTEFEUILLE MARCHAND — copie dédiée (R16 : jamais de
 * composant partagé entre deux écrans).
 *
 * Il réplique `WalletDayStatItem` : une ligne par JOUR (libellé du jour + nombre
 * de commandes, chiffre d'affaires à droite). Le portefeuille client, lui,
 * liste des transactions unitaires — même gabarit aujourd'hui, mais deux écrans
 * qui divergeront.
 *
 * ⚠️ Affiché au PREMIER chargement, déclenché à l'ouverture de l'écran depuis
 * que les stats ne se chargent plus au boot. Sans lui, la seule indication était
 * `refreshing={loading}` de la `FlatList` : la roue du pull-to-refresh
 * s'activait toute seule, sans que l'utilisateur ait tiré.
 */
export const WalletDayStatSkeleton = () => {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 650,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <View style={styles.icon} />

      <View style={styles.details}>
        <View style={styles.day} />
        <View style={styles.count} />
      </View>

      <View style={styles.amount} />
    </Animated.View>
  );
};

const skeletonColor = Theme.colors.gray[200];

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.gray[100],
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: Theme.spacing.md,
    backgroundColor: skeletonColor,
  },
  details: {
    flex: 1,
    gap: 6,
  },
  day: {
    width: "45%",
    height: 13,
    borderRadius: 4,
    backgroundColor: skeletonColor,
  },
  count: {
    width: "30%",
    height: 11,
    borderRadius: 4,
    backgroundColor: skeletonColor,
  },
  amount: {
    width: 72,
    height: 14,
    borderRadius: 4,
    backgroundColor: skeletonColor,
  },
});
