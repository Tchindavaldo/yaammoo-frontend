import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Theme } from "@/src/theme";
import { useAuthGate } from "@/src/features/auth/context/AuthGateContext";

/**
 * GuestGate — protège un écran entièrement lié au compte (panier, profil…).
 *
 * Si l'utilisateur est connecté, rend `children`. Sinon, affiche un écran
 * d'invitation à se connecter avec un bouton qui ouvre la sheet d'auth via
 * AuthGate (Apple 5.1.1(v) : le browsing reste libre, seules les fonctions
 * liées au compte exigent une connexion).
 */
export function GuestGate({
  icon = "lock-closed-outline",
  title,
  subtitle,
  children,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const { isSignedIn, requireAuth } = useAuthGate();
  const insets = useSafeAreaInsets();

  if (isSignedIn) return <>{children}</>;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.centered}>
        <View style={styles.iconCircle}>
          <Ionicons name={icon} size={34} color={Theme.colors.primary} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <TouchableOpacity
          style={styles.btn}
          activeOpacity={0.85}
          onPress={() => requireAuth()}
        >
          <Text style={styles.btnText}>Se connecter</Text>
          <Ionicons name="arrow-forward" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(236,73,19,0.10)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#141414",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: Theme.colors.gray[500],
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 8,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#141414",
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 999,
  },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
