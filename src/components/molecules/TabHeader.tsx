import { Theme } from "@/src/theme";
import { BlurView } from "expo-blur";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface TabHeaderProps {
  /** Titre principal de la page (ex. "Boutique", "Notifications"). */
  title: string;
  /** Texte secondaire affiché sous le titre (ex. date sélectionnée, "27 non lues"). */
  subtitle?: string;
  /** Zone de droite : contenu spécifique à la page (liste de dates, bouton "Tout marquer lu", etc.). */
  right?: React.ReactNode;
  /** Reçoit la hauteur mesurée du header pour décaler le contenu en dessous. */
  onHeightChange?: (height: number) => void;
}

/**
 * Header générique de page d'onglet, calqué sur le header de la page notifications.
 * Gère une fois pour toutes : positionnement absolu, safe-area (insets.top),
 * effet blur et fond. Chaque page fournit son titre, son sous-titre et sa zone droite.
 */
export const TabHeader: React.FC<TabHeaderProps> = ({
  title,
  subtitle,
  right,
  onHeightChange,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.header, { paddingTop: insets.top }]}
      onLayout={(e) => onHeightChange?.(e.nativeEvent.layout.height)}
    >
      <BlurView tint="light" intensity={120} style={StyleSheet.absoluteFill} />
      <View style={styles.left}>
        <Text style={styles.title}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {!!right && <View style={styles.right}>{right}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Theme.spacing.md,
    backgroundColor: "rgba(255, 255, 255, 0.015)",
    borderBottomWidth: 0.4,
    borderBottomColor: Theme.colors.primary,
    overflow: "hidden",
  },
  left: {
    flexShrink: 0,
  },
  right: {
    flex: 1,
    marginLeft: 12,
    alignItems: "flex-end",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: Theme.colors.dark,
  },
  subtitle: {
    fontSize: 13,
    color: Theme.colors.primary,
    marginTop: 2,
    fontWeight: "600",
  },
});
