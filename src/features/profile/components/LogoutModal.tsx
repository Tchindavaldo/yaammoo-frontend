import { Theme } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useLogout } from "../hooks/useLogout";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface Props {
  visible: boolean;
  onClose: () => void;
}

/**
 * Modal de confirmation de déconnexion de Settings (section Session).
 * Démonté avec l'écran quand l'utilisateur n'est plus connecté, ce qui remet
 * le loader à zéro.
 */
export function LogoutModal({ visible, onClose }: Props) {
  // Logique (push-token/remove, signOut, loader jusqu'au démontage) : useLogout.
  const { isLoggingOut, logout: confirm } = useLogout();

  const cancel = () => {
    if (isLoggingOut) return;
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      // "none" : pas d'animation de fermeture propre au Modal. Au logout, on ne
      // ferme jamais ce modal (le démontage de settings l'arrache) ; avec "fade",
      // Android joue quand même un fondu de fermeture qui révèle "settings nu"
      // avant la transition de navigation vers (auth). Avec "none", le modal
      // reste plein (loader visible) jusqu'au démontage, puis le fondu de
      // navigation enchaîne directement → pas d'étape intermédiaire.
      animationType="none"
      onRequestClose={cancel}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons
              name="exit-outline"
              size={32}
              color={Theme.colors.danger}
            />
          </View>
          <Text style={styles.title}>Déconnexion</Text>
          <Text style={styles.message}>
            Êtes-vous sûr de vouloir vous déconnecter ?
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.btnCancel]}
              onPress={cancel}
              disabled={isLoggingOut}
              activeOpacity={0.7}
            >
              <Text style={styles.btnCancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnDanger]}
              onPress={confirm}
              disabled={isLoggingOut}
              activeOpacity={0.8}
            >
              {isLoggingOut ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.btnDangerText}>Déconnecter</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
  iconWrap: {
    alignSelf: "center",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Theme.colors.danger + "15",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: Theme.colors.dark,
    textAlign: "center",
    marginBottom: 6,
  },
  message: {
    fontSize: 14,
    color: Theme.colors.gray[500],
    textAlign: "left",
    marginBottom: 18,
    lineHeight: 20,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  btnCancel: {
    backgroundColor: Theme.colors.gray[100],
  },
  btnCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: Theme.colors.dark,
  },
  btnDanger: {
    backgroundColor: Theme.colors.danger,
  },
  btnDangerText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});
