"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, StyleProp, Text, TouchableOpacity, View, ViewStyle } from "react-native";
import { styles } from "../CheckoutSheet.styles";
import { DS } from "@/src/theme/ds";

/**
 * Carte d'info de l'onglet Livraison (Lieux, Zone, Période, Contact, Vocale).
 * `loading` : le texte disparaît, un loader occupe le centre de la carte
 * (lecture des départs déjà payés avant d’ouvrir la liste des zones / créneaux).
 */
export const DeliveryInfoCard: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  filled: boolean;
  onPress?: () => void;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}> = ({ icon, title, filled, onPress, loading, style }) => (
  <TouchableOpacity
    style={[
      styles.infoBtnLarge,
      { backgroundColor: DS.slate100, borderColor: "#cbd5e1", borderWidth: 1 },
      filled && { borderColor: DS.accent, borderWidth: 2, backgroundColor: DS.accentAlpha(0.05) },
      loading && { alignItems: "center", justifyContent: "center" },
      style,
    ]}
    onPress={onPress}
    disabled={loading}
  >
    {loading ? (
      <ActivityIndicator size="small" color={DS.accent} />
    ) : (
      <>
        <Ionicons name={icon} size={20} color={filled ? DS.accent : "#94a3b8"} />
        <View style={styles.infoBtnText}>
          <Text style={[styles.infoBtnTitle, { color: filled ? DS.accent : "#0f172a" }]}>{title}</Text>
        </View>
      </>
    )}
  </TouchableOpacity>
);
