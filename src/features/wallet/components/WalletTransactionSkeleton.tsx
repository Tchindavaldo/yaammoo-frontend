import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { Theme } from "@/src/theme";

/**
 * Skeleton d'une ligne de transaction du PORTEFEUILLE CLIENT — copie dédiée
 * (R16 : jamais de composant partagé entre deux écrans).
 *
 * Il réplique `WalletTransactionItem` : pastille ronde à gauche, libellé + date
 * au centre, montant + moyen de paiement alignés à droite.
 *
 * ⚠️ Affiché au PREMIER chargement, déclenché à l'ouverture de l'écran depuis
 * que les transactions ne se chargent plus au boot. Sans lui, la seule
 * indication était `refreshing={loading}` de la `FlatList` : la roue du
 * pull-to-refresh s'activait toute seule, sans que l'utilisateur ait tiré.
 */
export const WalletTransactionSkeleton = () => {
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
        <View style={styles.name} />
        <View style={styles.date} />
      </View>

      <View style={styles.amountContainer}>
        <View style={styles.amount} />
        <View style={styles.payBy} />
      </View>
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
  name: {
    width: "55%",
    height: 13,
    borderRadius: 4,
    backgroundColor: skeletonColor,
  },
  date: {
    width: "35%",
    height: 11,
    borderRadius: 4,
    backgroundColor: skeletonColor,
  },
  amountContainer: {
    alignItems: "flex-end",
    gap: 6,
  },
  amount: {
    width: 62,
    height: 14,
    borderRadius: 4,
    backgroundColor: skeletonColor,
  },
  payBy: {
    width: 40,
    height: 9,
    borderRadius: 4,
    backgroundColor: skeletonColor,
  },
});
