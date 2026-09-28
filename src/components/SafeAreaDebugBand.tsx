import React from "react";
import { StyleSheet, View } from "react-native";
import {
  SAFE_AREA_BG,
  SAFE_AREA_DEBUG,
  useBottomSafeArea,
} from "@/src/hooks/usePageBottomInset";

/**
 * Bande de verification de la safe-area basse (R19). Ne rend rien tant que
 * `SAFE_AREA_DEBUG` est faux. A poser en DERNIER enfant d'un conteneur qui
 * descend jusqu'au bord bas de l'ecran (pied fixe, tab bar, sheet) : elle
 * peint exactement la bande reservee, par-dessus le fond du conteneur.
 *
 * Utilitaire de mise au point sans design propre : partage volontairement par
 * tous les ecrans (un seul interrupteur, une seule couleur).
 */
export const SafeAreaDebugBand: React.FC<{ height?: number }> = ({ height }) => {
  const band = useBottomSafeArea();
  if (!SAFE_AREA_DEBUG) return null;
  return <View pointerEvents="none" style={[styles.band, { height: height ?? band }]} />;
};

const styles = StyleSheet.create({
  band: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: SAFE_AREA_BG,
  },
});
