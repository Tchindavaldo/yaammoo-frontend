import { AppBlurView as BlurView } from "@/src/components/AppBlurView";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { Theme } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  onEditPress: () => void;
}

/**
 * En-tête fixe et flouté de Settings : avatar (initiale), nom, contact, badge
 * Marchand, bouton d'édition. Posé en absolu au-dessus de la liste qui défile.
 */
export function SettingsProfileCard({ onEditPress }: Props) {
  const { user, userData } = useAuth();
  const insets = useSafeAreaInsets();

  const firebaseName = user?.displayName || "";
  const initiales =
    (userData?.infos.prenom || userData?.infos.nom || firebaseName)
      ?.charAt(0)
      ?.toUpperCase() || "U";
  const nomComplet =
    [userData?.infos.prenom, userData?.infos.nom].filter(Boolean).join(" ") ||
    firebaseName ||
    "Utilisateur";
  const contact =
    userData?.infos.email ||
    user?.email ||
    userData?.infos.numero?.toString() ||
    "";

  return (
    <BlurView
      intensity={80}
      tint="light"
      pointerEvents="auto"
      style={[styles.profileCard, { paddingTop: insets.top + 20 }]}
      fallbackStyle={styles.profileCardOpaque}
    >
      <View style={styles.avatarContainer}>
        <Text style={styles.avatarText}>{initiales}</Text>
        <View style={styles.onlineDot} />
      </View>
      <View style={styles.profileInfo}>
        <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
          {nomComplet}
        </Text>
        <Text style={styles.userContact} numberOfLines={1} ellipsizeMode="tail">
          {contact}
        </Text>
        {userData?.isMarchand && (
          <View style={styles.merchantBadge}>
            <Ionicons name="storefront-outline" size={12} color="white" />
            <Text style={styles.merchantBadgeText}>Marchand</Text>
          </View>
        )}
      </View>
      <TouchableOpacity style={styles.editProfileBtn} onPress={onEditPress}>
        <Ionicons
          name="create-outline"
          size={18}
          color={Theme.colors.primary}
        />
      </TouchableOpacity>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  // Sans flou natif (Android < 12), fond opaque : le contenu qui scrolle
  // dessous ne doit pas transparaître.
  profileCardOpaque: {
    backgroundColor: "#ffffff",
  },
  profileCard: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    padding: Theme.spacing.lg,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.gray[100],
    gap: Theme.spacing.md,
  },
  avatarContainer: {
    position: "relative",
  },
  avatarText: {
    color: "white",
    fontSize: 26,
    fontWeight: "bold",
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Theme.colors.primary,
    textAlign: "center",
    lineHeight: 64,
  },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Theme.colors.success,
    borderWidth: 2,
    borderColor: Theme.colors.white,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: "bold",
    color: Theme.colors.dark,
  },
  userContact: {
    fontSize: 13,
    color: Theme.colors.gray[500],
    marginTop: 2,
  },
  merchantBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Theme.colors.primary,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 6,
    gap: 4,
  },
  merchantBadgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  editProfileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.colors.primary + "10",
    justifyContent: "center",
    alignItems: "center",
  },
});
