import { useAuth } from "@/src/features/auth/context/AuthContext";
import { Theme } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const REQUIRED_CONFIRM = "SUPPRIMER";

interface Props {
  visible: boolean;
  onClose: () => void;
}

/**
 * Modal « Supprimer mon compte » de Settings (Zone de danger) : saisie de
 * confirmation, loader, erreur inline. Démonté avec l'écran quand l'utilisateur
 * n'est plus connecté, ce qui remet saisie / loader / erreur à zéro.
 */
export function DeleteAccountModal({ visible, onClose }: Props) {
  const { userData, deleteAccount } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Chaque ouverture repart d'une saisie vide et sans erreur. Fait pendant le
  // rendu (et non dans un effet) pour ne jamais afficher une frame périmée.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setConfirmText("");
      setError(null);
    }
  }

  const canConfirm = confirmText.trim().toUpperCase() === REQUIRED_CONFIRM;

  const cancel = () => {
    if (isDeleting) return;
    setConfirmText("");
    setError(null);
    onClose();
  };

  const confirm = async () => {
    // Le bouton "Supprimer" est déjà disabled tant que le texte ≠ REQUIRED_CONFIRM,
    // donc pas de re-validation ici (et plus d'Alert native).
    setIsDeleting(true);
    setError(null);
    try {
      // deleteAccount() fait signOut + setUserData(null) → le guard Stack.Protected
      // (app/_layout.tsx) bascule automatiquement vers (auth) et DÉMONTE settings.
      // On ne ferme PAS le modal et on ne coupe PAS le loader sur succès : il
      // tourne jusqu'au démontage (comme le logout). Pas d'Alert bloquante avant
      // la redirection. Sur succès, les lignes après sont injoignables (démontage).
      await deleteAccount();
    } catch (err: any) {
      setIsDeleting(false);
      // Erreur affichée INLINE dans le modal (pas d'Alert native).
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Impossible de supprimer le compte. Réessayez ou contactez le support.",
      );
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      // "none" : même raison que le modal de déconnexion. Sur succès, le modal
      // est arraché par le démontage de settings (redirection auto vers (auth)) ;
      // un fondu de fermeture révélerait "settings nu". Le loader reste plein
      // jusqu'au démontage, puis le fondu de navigation enchaîne.
      animationType="none"
      onRequestClose={cancel}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="warning" size={32} color={Theme.colors.danger} />
          </View>
          <Text style={styles.title}>Supprimer mon compte</Text>
          <Text style={styles.message}>
            Cette action est{" "}
            <Text style={{ fontWeight: "700" }}>
              définitive et irréversible
            </Text>
            .{"\n\n"}
            Toutes vos données seront supprimées :{"\n"}• Votre profil et
            identifiants{"\n"}• Vos commandes et transactions{"\n"}• Vos bonus
            et notifications{"\n"}
            {userData?.isMarchand ? "• Votre boutique et menus\n" : ""}
            {"\n"}Pour confirmer, tapez{" "}
            <Text style={{ fontWeight: "700", color: Theme.colors.danger }}>
              {REQUIRED_CONFIRM}
            </Text>{" "}
            ci-dessous.
          </Text>

          <TextInput
            style={styles.input}
            value={confirmText}
            onChangeText={(t) => {
              setConfirmText(t);
              if (error) setError(null);
            }}
            placeholder={REQUIRED_CONFIRM}
            placeholderTextColor={Theme.colors.gray[300]}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!isDeleting}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.btnCancel]}
              onPress={cancel}
              disabled={isDeleting}
              activeOpacity={0.7}
            >
              <Text style={styles.btnCancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.btn,
                styles.btnDanger,
                !canConfirm && { opacity: 0.5 },
              ]}
              onPress={confirm}
              disabled={isDeleting || !canConfirm}
              activeOpacity={0.8}
            >
              {isDeleting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.btnDangerText}>Supprimer</Text>
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
    backgroundColor: Theme.colors.danger + "20",
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
  input: {
    height: 48,
    borderWidth: 1.5,
    borderColor: Theme.colors.gray[200],
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: Theme.colors.dark,
    fontWeight: "600",
    marginBottom: 18,
    backgroundColor: Theme.colors.gray[100],
    textAlign: "center",
    letterSpacing: 2,
  },
  errorText: {
    color: Theme.colors.danger,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginTop: -8,
    marginBottom: 16,
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
