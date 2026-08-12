import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { zoneListStyles as st } from "./ZoneListSheet.styles";

interface ZoneBannerProps {
  lieu: string;
  /** Sous-titre du bandeau (varie selon le nombre de zones). */
  sub: string;
  /** Plusieurs zones : les bandeaux se partagent la largeur, cliquables. */
  compact?: boolean;
  /** Zone affichee actuellement (sans effet quand il n'y en a qu'une). */
  active?: boolean;
  /** A 3 zones : l'icone ne tient pas, le nom prend toute la largeur. */
  hidePin?: boolean;
  onPress?: () => void;
}

/**
 * Bandeau nommant une zone de livraison (design variante C). Remplace les
 * chips quand la boutique a 3 zones ou moins ; le reste du sheet est
 * inchange.
 */
export const ZoneBanner: React.FC<ZoneBannerProps> = ({
  lieu,
  sub,
  compact,
  active,
  hidePin,
  onPress,
}) => (
  <TouchableOpacity
    disabled={!onPress}
    onPress={onPress}
    activeOpacity={0.8}
    style={[
      st.detected,
      compact && st.detectedCompact,
      compact && !active && st.detectedOff,
    ]}
  >
    {!hidePin && (
      <View style={[st.detectedPin, compact && !active && st.detectedPinOff]}>
        <Ionicons
          name="location-outline"
          size={16}
          color={compact && !active ? "#475569" : "#fff"}
        />
      </View>
    )}
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text
        style={[st.detectedTitle, compact && !active && st.detectedTitleOff]}
        numberOfLines={1}
      >
        {lieu}
      </Text>
      <Text
        style={[st.detectedSub, compact && !active && st.detectedSubOff]}
        numberOfLines={1}
      >
        {sub}
      </Text>
    </View>
  </TouchableOpacity>
);
