import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { onNetworkStateChange } from "@/src/services/network";

/**
 * Bandeau hors-ligne, monte une seule fois a la racine de l'app.
 *
 * ⚠️ Il ne depend d'AUCUNE requete : `onNetworkStateChange` est alimente par la
 * sonde autonome de `network.ts`, donc le bandeau apparait meme si l'utilisateur
 * ne touche a rien. Avant lui, une coupure restait invisible jusqu'a la
 * prochaine action, qui partait alors dans le vide.
 *
 * Positionne en absolu sous la barre de statut pour ne pas decaler la mise en
 * page des ecrans quand il apparait ou disparait.
 */
export const OfflineBanner = () => {
  const insets = useSafeAreaInsets();
  const [offline, setOffline] = useState(false);
  // `visible` reste vrai pendant l'animation de sortie, pour ne pas demonter la
  // vue avant la fin du fondu.
  const [visible, setVisible] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => onNetworkStateChange((online) => setOffline(!online)), []);

  useEffect(() => {
    if (offline) setVisible(true);

    Animated.timing(anim, {
      toValue: offline ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !offline) setVisible(false);
    });
  }, [offline, anim]);

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.banner,
        {
          paddingTop: insets.top + 8,
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [-20, 0],
              }),
            },
          ],
        },
      ]}
    >
      <Ionicons name="cloud-offline-outline" size={16} color="white" />
      <Text style={styles.text}>Pas de connexion Internet</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    // Au-dessus des ecrans et des sheets, sous les modales systeme.
    zIndex: 9999,
    elevation: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingBottom: 10,
    paddingHorizontal: 16,
    backgroundColor: "#C0392B",
  },
  text: {
    color: "white",
    fontSize: 13,
    fontWeight: "700",
  },
});
