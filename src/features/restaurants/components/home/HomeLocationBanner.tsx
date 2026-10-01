import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ActivityIndicator } from "@/src/components/CustomActivityIndicator";
import { Theme } from "@/src/theme";
import { DS } from "@/src/theme/ds";

interface Props {
  canAskAgain: boolean;
  requesting: boolean;
  onEnable: () => void;
}

/**
 * Bandeau du home quand la localisation n'est pas accordée (voir
 * `useLocationAccess`) : posé sous l'en-tête, au-dessus des boutiques, sans
 * rien bloquer. Le bouton relance la demande (écran de divulgation puis popup
 * système) ou, refusée définitivement, ouvre les réglages de l'app.
 */
export const HomeLocationBanner: React.FC<Props> = ({
  canAskAgain,
  requesting,
  onEnable,
}) => (
  <View style={styles.card}>
    <View style={styles.iconWrap}>
      <Ionicons name="location" size={18} color={DS.accent} />
    </View>
    <View style={styles.texts}>
      <Text style={styles.title}>Localisation désactivée</Text>
      <Text style={styles.text} numberOfLines={2}>
        {canAskAgain
          ? "Activez-la pour voir les boutiques qui livrent autour de vous."
          : "Autorisez-la dans les réglages pour voir les boutiques autour de vous."}
      </Text>
    </View>
    <TouchableOpacity
      style={styles.btn}
      activeOpacity={0.8}
      onPress={onEnable}
      disabled={requesting}
    >
      {requesting ? (
        <ActivityIndicator size="small" color={DS.onInk} />
      ) : (
        <Text style={styles.btnText}>
          {canAskAgain ? "Activer" : "Réglages"}
        </Text>
      )}
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: Theme.design.horizontalPadding,
    marginTop: 8,
    marginBottom: 4,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 8,
    borderRadius: 16,
    backgroundColor: DS.accentSoft,
    borderWidth: 1,
    borderColor: DS.accentTint,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DS.accentTint,
  },
  texts: {
    flex: 1,
  },
  title: {
    fontSize: 13.5,
    fontWeight: "700",
    color: DS.ink,
  },
  text: {
    fontSize: 12,
    color: DS.muted,
    marginTop: 1,
  },
  btn: {
    // Hauteur fixe : le loader ne doit pas agrandir le bouton.
    minWidth: 76,
    height: 34,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: Theme.borderRadius.pill,
    backgroundColor: DS.accent,
  },
  btnText: {
    color: DS.onInk,
    fontSize: 13,
    fontWeight: "700",
  },
});
