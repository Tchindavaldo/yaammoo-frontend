import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

/**
 * Skeleton de chargement du PANIER — réplique la structure de `CartOrderCard`
 * (avatar rond à gauche, ligne prix + nom, chips extras/boisson en bas,
 * bouton « annuler » à droite) pour éviter le saut visuel pendant le fetch des
 * commandes « en cours ».
 *
 * Duplication dédiée : aucune dépendance à la vraie carte, elle disparaît sitôt
 * les données chargées.
 */
export const CartOrderSkeleton = () => {
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
        {/* Avatar rond (image rapide) */}
        <View style={styles.avatar} />

        <View style={styles.summaryInfo}>
          {/* Ligne du haut : prix + nom du plat */}
          <View style={styles.topRow}>
            <View style={styles.infoBlock}>
              <View style={styles.priceBar} />
              <View style={styles.nameBar} />
            </View>
            <View style={styles.rankBar} />
          </View>

          {/* Ligne du bas : chips Extras / Boisson + bouton annuler */}
          <View style={styles.bottomRow}>
            <View style={styles.chipsRow}>
              <View style={styles.chip} />
            </View>
            <View style={styles.deleteBar} />
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

const skeletonColor = "#e5e7eb";

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    paddingHorizontal: 16,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    backgroundColor: "white",
  },
  avatar: {
    width: 50,
    height: 55,
    borderRadius: 25,
    backgroundColor: skeletonColor,
    marginRight: 14,
  },
  summaryInfo: {
    flex: 1,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  infoBlock: {
    flex: 1,
    marginRight: 12,
    gap: 6,
  },
  priceBar: {
    width: 64,
    height: 14,
    borderRadius: 4,
    backgroundColor: skeletonColor,
  },
  nameBar: {
    width: "80%",
    height: 12,
    borderRadius: 4,
    backgroundColor: skeletonColor,
  },
  rankBar: {
    width: 26,
    height: 18,
    borderRadius: 6,
    backgroundColor: skeletonColor,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chipsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chip: {
    width: 88,
    height: 24,
    borderRadius: 12,
    backgroundColor: skeletonColor,
  },
  deleteBar: {
    width: 74,
    height: 30,
    borderRadius: 15,
    backgroundColor: skeletonColor,
  },
});
