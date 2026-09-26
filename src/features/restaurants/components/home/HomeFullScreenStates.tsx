import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  LayoutChangeEvent,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ActivityIndicator } from "@/src/components/CustomActivityIndicator";
import { Theme } from "@/src/theme";
import { homeStyles as styles } from "./homeScreenStyles";

type OnLayout = (event: LayoutChangeEvent) => void;

/**
 * Écran de chargement plein du home — RÉSERVÉ au tout premier affichage (la
 * condition vit dans l'écran : voir la garde `!searchQuery`).
 */
export const HomeLoadingScreen: React.FC<{ onLayout: OnLayout }> = ({ onLayout }) => (
  <SafeAreaView style={styles.container} onLayout={onLayout}>
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={Theme.colors.primary} />
      <Text style={styles.loadingText}>Recherche des meilleurs plats...</Text>
    </View>
  </SafeAreaView>
);

/**
 * Échec du chargement initial : la page entière est remplacée par un message
 * centré et un bouton de relance. Rien d'autre n'est affiché — ni header, ni
 * liste : il n'y a aucune donnée à montrer, et un contenu partiel donnerait
 * l'impression d'une page cassée plutôt que d'un réseau indisponible.
 */
export const HomeErrorScreen: React.FC<{ onLayout: OnLayout; onRetry: () => void }> = ({
  onLayout,
  onRetry,
}) => (
  <SafeAreaView style={styles.container} onLayout={onLayout}>
    <View style={styles.centered}>
      <Ionicons name="cloud-offline-outline" size={54} color={Theme.colors.gray[300]} />
      <Text style={styles.errorTitle}>Connexion indisponible</Text>
      <Text style={styles.errorText}>
        Impossible de charger le contenu. Vérifiez votre connexion.
      </Text>
      <TouchableOpacity style={styles.retryBtn} activeOpacity={0.8} onPress={onRetry}>
        <Ionicons name="refresh" size={17} color={Theme.colors.white} />
        <Text style={styles.retryText}>Réessayer</Text>
      </TouchableOpacity>
    </View>
  </SafeAreaView>
);
