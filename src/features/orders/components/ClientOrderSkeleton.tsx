import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

/**
 * Skeleton de la page SUIVI DES COMMANDES (`CartStatusPanel`) — copie dédiée de
 * `CartOrderSkeleton` (R16 : jamais de composant partagé entre deux écrans).
 *
 * Il réplique `ClientOrderCard`, pas `CartOrderCard` : la carte de suivi porte
 * une pastille de statut et une ligne de date que la carte du panier n'a pas.
 * Les deux écrans se ressemblent aujourd'hui mais divergeront ; ajouter une prop
 * à l'original pour couvrir les deux cas aurait fait porter au panier le risque
 * de casser à chaque évolution du suivi.
 *
 * Affiché pendant un rafraîchissement déclenché par le RETOUR dans l'app, à la
 * place des cartes : sans lui, la mise à jour se faisait sans le moindre signe
 * et l'utilisateur restait devant des statuts périmés.
 */
export const ClientOrderSkeleton = () => {
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
      <View style={styles.row}>
        <View style={styles.avatar} />

        <View style={styles.info}>
          <View style={styles.topRow}>
            <View style={styles.block}>
              <View style={styles.nameBar} />
              <View style={styles.shopBar} />
            </View>
            {/* Pastille de statut, propre au suivi. */}
            <View style={styles.statusPill} />
          </View>

          <View style={styles.bottomRow}>
            <View style={styles.dateBar} />
            <View style={styles.priceBar} />
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
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
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  block: {
    flex: 1,
    marginRight: 12,
    gap: 6,
  },
  nameBar: {
    width: "70%",
    height: 14,
    borderRadius: 4,
    backgroundColor: skeletonColor,
  },
  shopBar: {
    width: "45%",
    height: 11,
    borderRadius: 4,
    backgroundColor: skeletonColor,
  },
  statusPill: {
    width: 76,
    height: 24,
    borderRadius: 12,
    backgroundColor: skeletonColor,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateBar: {
    width: 110,
    height: 12,
    borderRadius: 4,
    backgroundColor: skeletonColor,
  },
  priceBar: {
    width: 64,
    height: 14,
    borderRadius: 4,
    backgroundColor: skeletonColor,
  },
});
