import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Theme } from "@/src/theme";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { driverService, DriverInfo } from "@/src/features/driver/services/driverService";

interface DelegateDriverSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Livrer soi-même (comportement "Lancer" actuel → status delivering). */
  onSelfDeliver: () => Promise<boolean | void> | void;
  /** Déléguer à un livreur (pose driverId). */
  onDelegate: (driver: DriverInfo) => Promise<boolean | void> | void;
}

const fullName = (infos?: { prenom?: string; nom?: string; email?: string }) => {
  const name = [infos?.prenom, infos?.nom].filter(Boolean).join(" ");
  if (name) return name;
  if (infos?.email) return infos.email.split("@")[0];
  return "Livreur";
};

/**
 * Feuille de choix "qui livre" déclenchée par le bouton Lancer d'une commande
 * prête. Le marchand choisit de livrer lui-même OU de déléguer à un livreur.
 */
export const DelegateDriverSheet: React.FC<DelegateDriverSheetProps> = ({
  visible,
  onClose,
  onSelfDeliver,
  onDelegate,
}) => {
  const { userData } = useAuth();
  const insets = useSafeAreaInsets();
  const fastFoodId = userData?.fastFoodId;
  const [loading, setLoading] = useState(false);
  const [drivers, setDrivers] = useState<DriverInfo[]>([]);
  // Action en cours : "self" | driverId → affiche un spinner sur la ligne.
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setPending(null);
      setError(null);
      return;
    }
    if (!fastFoodId) return;
    setLoading(true);
    driverService
      .getDrivers(fastFoodId)
      .then(setDrivers)
      .catch(() => setDrivers([]))
      .finally(() => setLoading(false));
  }, [visible, fastFoodId]);

  // Exécute l'action (self ou délégation), garde le sheet ouvert avec un
  // spinner ; ferme au succès, affiche une erreur inline sinon.
  const run = async (key: string, action: () => Promise<boolean | void> | void) => {
    if (pending) return;
    setPending(key);
    setError(null);
    try {
      const ok = await action();
      if (ok === false) {
        setError("Échec, réessayez.");
        setPending(null);
        return;
      }
      onClose();
    } catch {
      setError("Échec, réessayez.");
      setPending(null);
    }
  };

  const busy = pending !== null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* animationType="fade" → l'overlay noir apparaît EN FONDU (plus le
          sheet qui monte de façon brusque). */}
      <Pressable style={styles.backdrop} onPress={() => !busy && onClose()}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>Qui livre cette commande ?</Text>

          {/* Moi-même = comportement Lancer actuel */}
          <TouchableOpacity
            style={[styles.row, busy && pending !== "self" && styles.rowDisabled]}
            disabled={busy}
            onPress={() => run("self", onSelfDeliver)}
          >
            <View style={[styles.rowIcon, { backgroundColor: Theme.colors.primary + "15" }]}>
              <Ionicons name="storefront-outline" size={20} color={Theme.colors.primary} />
            </View>
            <Text style={styles.rowName}>Moi-même</Text>
            {pending === "self" ? (
              <ActivityIndicator size="small" color={Theme.colors.primary} />
            ) : (
              <Ionicons name="bicycle-outline" size={18} color={Theme.colors.gray[400]} />
            )}
          </TouchableOpacity>

          <Text style={styles.sectionLabel}>Mes livreurs</Text>

          {loading ? (
            <ActivityIndicator color={Theme.colors.primary} style={{ marginVertical: 20 }} />
          ) : drivers.length === 0 ? (
            <Text style={styles.empty}>Aucun livreur. Ajoutez-en dans Boutique → Livreurs.</Text>
          ) : (
            <ScrollView style={{ maxHeight: 260 }}>
              {drivers.map((d) => (
                <TouchableOpacity
                  key={d.driverId}
                  style={[styles.row, busy && pending !== d.driverId && styles.rowDisabled]}
                  disabled={busy}
                  onPress={() => run(d.driverId, () => onDelegate(d))}
                >
                  <View style={[styles.rowIcon, { backgroundColor: "#2563eb15" }]}>
                    <Ionicons name="bicycle" size={20} color="#2563eb" />
                  </View>
                  <Text style={styles.rowName} numberOfLines={1}>{fullName(d.infos)}</Text>
                  {pending === d.driverId ? (
                    <ActivityIndicator size="small" color="#2563eb" />
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={Theme.colors.gray[400]} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {error && <Text style={styles.error}>{error}</Text>}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Theme.colors.gray[200],
    marginBottom: 12,
  },
  title: { fontSize: 16, fontWeight: "700", color: Theme.colors.dark, marginBottom: 12 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: Theme.colors.gray[500],
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 14,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.gray[100],
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  rowDisabled: { opacity: 0.4 },
  rowName: { flex: 1, fontSize: 15, fontWeight: "600", color: Theme.colors.dark },
  empty: { fontSize: 13, color: Theme.colors.gray[400], paddingVertical: 16, textAlign: "center" },
  error: {
    color: Theme.colors.danger,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 10,
  },
});
