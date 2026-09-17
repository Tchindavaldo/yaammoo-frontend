import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { MERCHANT_CARD_HEIGHT } from "./MerchantOrderCard";

/**
 * Skeleton des commandes MARCHAND — copie dédiée (R16 : jamais de composant
 * partagé entre deux écrans).
 *
 * Il réplique `MerchantOrderCard`, dont la mise en page diffère de la carte
 * client : avatar carré à coins arrondis, ligne nom + prix, rangée de chips
 * d'action. Réutiliser le skeleton du suivi client aurait affiché une forme qui
 * ne correspond à rien ici, et fait sauter la liste à l'arrivée des données.
 *
 * ⚠️ Hauteur calée sur `MERCHANT_CARD_HEIGHT` : la liste marchand est
 * virtualisée avec `getItemLayout`, donc un skeleton d'une autre hauteur
 * décalerait les positions calculées.
 *
 * Affiché pendant un rafraîchissement déclenché par le RETOUR dans l'app.
 */
export const MerchantOrderSkeleton = () => {
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
    <Animated.View style={[styles.wrapper, { opacity }]}>
      <View style={styles.summaryRow}>
        <View style={styles.avatar} />

        <View style={styles.info}>
          <View style={styles.topRow}>
            <View style={styles.nameBar} />
            <View style={styles.priceBar} />
          </View>

          <View style={styles.chipsRow}>
            <View style={styles.chip} />
            <View style={styles.chip} />
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

const skeletonColor = "#e5e7eb";

const styles = StyleSheet.create({
  wrapper: {
    height: MERCHANT_CARD_HEIGHT,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 50,
    height: 55,
    borderRadius: 25,
    backgroundColor: skeletonColor,
    marginRight: 14,
  },
  info: {
    flex: 1,
    gap: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  nameBar: {
    width: "55%",
    height: 14,
    borderRadius: 4,
    backgroundColor: skeletonColor,
  },
  priceBar: {
    width: 64,
    height: 14,
    borderRadius: 4,
    backgroundColor: skeletonColor,
  },
  chipsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chip: {
    width: 84,
    height: 24,
    borderRadius: 12,
    backgroundColor: skeletonColor,
  },
});
