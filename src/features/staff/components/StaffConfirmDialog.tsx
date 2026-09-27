import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { ST } from "./staffTheme";

export interface StaffConfirm {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
}

interface Props {
  confirm: StaffConfirm | null;
  busy: boolean;
  onCancel: () => void;
}

/** Confirmation d'une action destructive (retirer un membre, un livreur, supprimer un rôle). */
export const StaffConfirmDialog: React.FC<Props> = ({ confirm, busy, onCancel }) => (
  <Modal visible={!!confirm} transparent animationType="fade" onRequestClose={onCancel}>
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <View style={styles.icon}>
          <Ionicons name="trash-outline" size={26} color={ST.danger} />
        </View>
        <Text style={styles.title}>{confirm?.title}</Text>
        <Text style={styles.message}>{confirm?.message}</Text>
        <View style={styles.actions}>
          <Pressable
            onPress={onCancel}
            disabled={busy}
            style={[styles.btn, { backgroundColor: ST.surface }]}
            accessibilityRole="button"
          >
            <Text style={[styles.btnText, { color: ST.ink }]}>Annuler</Text>
          </Pressable>
          <Pressable
            onPress={confirm?.onConfirm}
            disabled={busy}
            style={[styles.btn, { backgroundColor: ST.danger }]}
            accessibilityRole="button"
          >
            {busy ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={[styles.btnText, { color: "#fff" }]}>{confirm?.confirmLabel}</Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(20,20,22,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    padding: 24,
    borderRadius: 24,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    backgroundColor: "rgba(180,35,24,0.1)",
  },
  title: { fontSize: 17, fontWeight: "800", color: ST.ink, marginBottom: 6, textAlign: "center" },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: ST.muted,
    textAlign: "center",
    marginBottom: 20,
  },
  actions: { flexDirection: "row", gap: 10, width: "100%" },
  btn: { flex: 1, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  btnText: { fontSize: 15, fontWeight: "700" },
});
