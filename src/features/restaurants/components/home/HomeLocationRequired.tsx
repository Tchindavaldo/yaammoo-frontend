"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
// Home sans localisation accordee (ni ville choisie a la main) : pas de
// boutiques, un bouton pour activer la localisation et un lien pour choisir une
// ville (sheet des villes). Le choix d'une ville garde l'app utilisable sans
// GPS (Apple 5.1.1).
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { ActivityIndicator } from "@/src/components/CustomActivityIndicator";
import { DS } from "@/src/theme/ds";
import { t, useLanguage } from "@/src/i18n";
import type { HomeCity } from "../../hooks/useHomeCity";
import { HomeCitySheet } from "./HomeCitySheet";
import { homeStyles as styles } from "./homeScreenStyles";

interface Props {
  homeCity: HomeCity;
  canAskAgain: boolean;
  requesting: boolean;
  onEnable: () => void;
}

export const HomeLocationRequired: React.FC<Props> = ({ homeCity, canAskAgain, requesting, onEnable }) => {
  useLanguage();
  const [sheet, setSheet] = useState(false);
  return (
    <View style={styles.centered}>
      <Ionicons name="location-outline" size={54} color={DS.accent} />
      <Text style={styles.errorTitle}>{t("Activez la localisation")}</Text>
      <Text style={styles.errorText}>
        {t("Nous en avons besoin pour vous montrer les boutiques de votre ville.")}
      </Text>
      <TouchableOpacity style={styles.retryBtn} activeOpacity={0.8} onPress={onEnable} disabled={requesting}>
        {requesting ? (
          <ActivityIndicator size="small" color={DS.onInk} />
        ) : (
          <Ionicons name="navigate" size={17} color={DS.onInk} />
        )}
        <Text style={styles.retryText}>
          {canAskAgain ? t("Activer la localisation") : t("Ouvrir les réglages")}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setSheet(true)} activeOpacity={0.7} style={{ marginTop: 16, padding: 8 }}>
        <Text style={{ color: DS.accentDeep, fontSize: 14, fontWeight: "600" }}>{t("Choisir une ville")}</Text>
      </TouchableOpacity>
      <HomeCitySheet visible={sheet} homeCity={homeCity} placeLabel="" placeCity="" onClose={() => setSheet(false)} />
    </View>
  );
};
