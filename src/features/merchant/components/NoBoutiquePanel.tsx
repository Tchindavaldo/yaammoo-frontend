"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTabBarHeight } from "@/src/hooks/useTabBarHeight";
import { Theme } from "@/src/theme";
import { CreateBoutiquePanel } from "./CreateBoutiquePanel";
import { DS } from "@/src/theme/ds";
import { t, useLanguage } from "@/src/i18n";

/**
 * Écran affiché quand l'utilisateur n'a pas encore de boutique. Présente un
 * appel à l'action ; au clic sur « Continuer », bascule vers l'écran PLEINE PAGE
 * de création (`CreateBoutiquePanel`) coiffé du header global.
 */
interface Props {
  /** Ouvre directement la creation (bandeau du profil) ; Annuler = retour. */
  direct?: boolean;
  onExit?: () => void;
}

export const NoBoutiquePanel = ({ direct = false, onExit }: Props) => {
  useLanguage();
  // Hauteur REELLE de la navbar, safe-area comprise (source unique R19).
  const tabBarHeight = useTabBarHeight();
  const [creating, setCreating] = useState(direct);

  if (creating) {
    return (
      <CreateBoutiquePanel
        onCancel={() => (direct && onExit ? onExit() : setCreating(false))}
      />
    );
  }

  return (
    <View
      style={[
        styles.initialCtn,
        { paddingBottom: tabBarHeight + 8 },
      ]}
    >
      {/* Image en haut */}
      <View style={styles.ctnImg}>
        <Ionicons
          name="fast-food"
          size={250}
          color={DS.accent}
          style={{ opacity: 0.1 }}
        />
      </View>

      {/* Titre et Description */}
      <View style={styles.textCtn}>
        <Text style={styles.titre}>
          {t("Créez votre boutique et")}{"\n"}{t("recevez vos commandes")}
        </Text>
        <Text style={styles.description}>
          {t("Gérez facilement vos commandes, vos livraisons")}{"\n"}{t("et vos transactions avec votre Boutique")}
        </Text>
      </View>

      {/* Bouton */}
      <View style={styles.ctnBtn}>
        <TouchableOpacity style={styles.mainBtn} onPress={() => setCreating(true)}>
          <Text style={styles.mainBtnText}>{t("Continuer")}</Text>
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
