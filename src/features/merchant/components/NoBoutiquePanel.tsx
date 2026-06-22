import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Theme } from "@/src/theme";
import { CreateBoutiquePanel } from "./CreateBoutiquePanel";

// Hauteur approximative de la tab bar (navbar du bas) à réserver sous le bouton.
const TAB_BAR_HEIGHT = 60;

/**
 * Écran affiché quand l'utilisateur n'a pas encore de boutique. Présente un
 * appel à l'action ; au clic sur « Continuer », bascule vers l'écran PLEINE PAGE
 * de création (`CreateBoutiquePanel`) coiffé du header global.
 */
export const NoBoutiquePanel = () => {
  const insets = useSafeAreaInsets();
  const [creating, setCreating] = useState(false);

  if (creating) {
    return <CreateBoutiquePanel onCancel={() => setCreating(false)} />;
  }

  return (
    <View
      style={[
        styles.initialCtn,
        { paddingBottom: insets.bottom + TAB_BAR_HEIGHT + 20 },
      ]}
    >
      {/* Image en haut */}
      <View style={styles.ctnImg}>
        <Ionicons
          name="fast-food"
          size={250}
          color="rgba(236,73,19,1.00)"
          style={{ opacity: 0.1 }}
        />
      </View>

      {/* Titre et Description */}
      <View style={styles.textCtn}>
        <Text style={styles.titre}>
          Créez votre boutique et{"\n"}recevez vos commandes
        </Text>
        <Text style={styles.description}>
          Gérez facilement vos commandes, vos livraisons{"\n"}et vos
          transactions avec votre Boutique
        </Text>
      </View>

      {/* Bouton */}
      <View style={styles.ctnBtn}>
        <TouchableOpacity style={styles.mainBtn} onPress={() => setCreating(true)}>
          <Text style={styles.mainBtnText}>Continuer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  initialCtn: {
    flex: 1,
    backgroundColor: "white",
    flexDirection: "column",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
  },
  ctnImg: {
    alignItems: "center",
    marginBottom: "20%",
  },
  textCtn: {
    alignItems: "center",
    marginBottom: 20,
  },
  titre: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    color: "black",
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    textAlign: "center",
    color: "#000000a6",
    fontWeight: "100",
    lineHeight: 20,
  },
  ctnBtn: {
    marginBottom: 0,
  },
  mainBtn: {
    backgroundColor: Theme.colors.primary,
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: "center",
  },
  mainBtnText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
