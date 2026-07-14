import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TabHeader } from "@/src/components/molecules/TabHeader";
import { HeaderPill } from "@/src/components/molecules/HeaderPill";
import { Theme } from "@/src/theme";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { useDriver } from "../hooks/useDriver";
import { ApplicationEvent } from "../context/DriverContext";
import {
  driverService,
  DriverApplication,
  DriverInfo,
} from "../services/driverService";
import { Toast } from "@/src/components/Toast";

interface DriverManageModalProps {
  visible: boolean;
  onClose: () => void;
}

// Le backend enrichit chaque entrée avec `user.infos.{prenom, nom, email}`.
// Nom complet, sinon email (avant @), sinon "Utilisateur".
const fullName = (infos?: { prenom?: string; nom?: string; email?: string }) => {
  const name = [infos?.prenom, infos?.nom].filter(Boolean).join(" ");
  if (name) return name;
  if (infos?.email) return infos.email.split("@")[0];
  return "Utilisateur";
};

// Dédup par candidat (userId) : une seule demande visible par personne, la plus
// récente — filet au cas où l'API renvoie un doublon transitoire.
// Construit un DriverInfo (forme "Mes livreurs") depuis une demande acceptée,
// pour l'ajouter EN LOCAL sans refetch.
const applicationToDriver = (app: DriverApplication): DriverInfo => ({
  uid: app.userId,
  driverId: app.userId,
  isDriver: true,
  infos: app.user?.infos,
});

// Ajoute un livreur à la liste locale sans doublon (par driverId).
const addDriverLocal = (list: DriverInfo[], d: DriverInfo): DriverInfo[] =>
  list.some((x) => x.driverId === d.driverId) ? list : [d, ...list];

const dedupeByUser = (list: DriverApplication[]): DriverApplication[] => {
  const byUser = new Map<string, DriverApplication>();
  for (const app of list) {
    const prev = byUser.get(app.userId);
    const t = (a: DriverApplication) => a.updatedAt || a.createdAt || "";
    if (!prev || t(app) >= t(prev)) byUser.set(app.userId, app);
  }
  return Array.from(byUser.values());
};

/**
 * Écran plein écran « Livreurs » (Settings → Boutique). Le marchand voit les
 * demandes reçues (accepter / refuser) et la liste de ses livreurs assignés.
 */
export const DriverManageModal: React.FC<DriverManageModalProps> = ({
  visible,
  onClose,
}) => {
  const { userData } = useAuth();
  const { registerApplicationHandler, unregisterApplicationHandler } = useDriver();
  const fastFoodId = userData?.fastFoodId;
  const [headerHeight, setHeaderHeight] = useState(70);
  const [loading, setLoading] = useState(false);
  const [firstLoadDone, setFirstLoadDone] = useState(false);
  const [applications, setApplications] = useState<DriverApplication[]>([]);
  const [drivers, setDrivers] = useState<DriverInfo[]>([]);
  const [deciding, setDeciding] = useState<Record<string, boolean>>({});
  const [toRemove, setToRemove] = useState<DriverInfo | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const load = useCallback(async () => {
    if (!fastFoodId) return;
    setLoading(true);
    try {
      const [apps, drv] = await Promise.all([
        driverService.getApplications(fastFoodId),
        driverService.getDrivers(fastFoodId),
      ]);
      // "Demandes reçues" = uniquement les PENDING (une demande décidée ne doit
      // pas « revenir » ici). + dédup par candidat.
      setApplications(dedupeByUser(apps.filter((a) => a.status === "pending")));
      setDrivers(drv);
    } catch {
      setToast({ message: "Erreur de chargement", type: "error" });
    } finally {
      setLoading(false);
      setFirstLoadDone(true);
    }
  }, [fastFoodId]);

  useEffect(() => {
    if (visible) {
      setFirstLoadDone(false);
      load();
    }
  }, [visible, load]);

  // Temps réel : ne traite que les demandes de CETTE boutique.
  useEffect(() => {
    if (!visible) return;
    const handler = (e: ApplicationEvent) => {
      // Un livreur retiré depuis un AUTRE appareil marchand → l'enlever du team.
      if (e.type === "merchant_driver_removed") {
        setDrivers((prev) => prev.filter((d) => d.driverId !== e.driverId));
        return;
      }
      // Le retrait côté livreur (type "removed") ne concerne pas cet écran.
      if (e.type === "removed") return;
      const app = e.application;
      if (!app || app.fastFoodId !== fastFoodId) return;
      if (e.type === "created") {
        // Nouvelle demande → remplace une éventuelle demande du même candidat
        // (relance) puis ajoute en tête. Jamais 2 lignes pour le même userId.
        setApplications((prev) => [
          app,
          ...prev.filter((a) => a.userId !== app.userId),
        ]);
      } else if (e.type === "decided" || e.type === "merchant_decided") {
        // Décidée (ici ou sur un autre appareil marchand) → retirer de "en
        // attente" ; si acceptée, ajouter aux livreurs EN LOCAL (pas de refetch).
        setApplications((prev) => prev.filter((a) => a.id !== app.id));
        if (app.status === "accepted") {
          setDrivers((prev) => addDriverLocal(prev, applicationToDriver(app)));
        }
      }
    };
    registerApplicationHandler(handler);
    return () => unregisterApplicationHandler(handler);
  }, [visible, fastFoodId, registerApplicationHandler, unregisterApplicationHandler]);

  const decide = async (
    app: DriverApplication,
    decision: "accepted" | "refused",
  ) => {
    setDeciding((p) => ({ ...p, [app.id]: true }));
    try {
      await driverService.decideApplication(app.id, decision);
      setApplications((prev) => prev.filter((a) => a.id !== app.id));
      // Accepté → ajout du livreur EN LOCAL (pas de refetch).
      if (decision === "accepted") {
        setDrivers((prev) => addDriverLocal(prev, applicationToDriver(app)));
      }
      setToast({
        message: decision === "accepted" ? "Livreur accepté ✅" : "Demande refusée",
        type: "success",
      });
    } catch {
      setToast({ message: "Action échouée", type: "error" });
    } finally {
      setDeciding((p) => ({ ...p, [app.id]: false }));
    }
  };

  const confirmRemove = async () => {
    if (!toRemove || !fastFoodId) return;
    const driverId = toRemove.driverId;
    setRemovingId(driverId);
    try {
      await driverService.removeDriver(driverId, fastFoodId);
      setDrivers((prev) => prev.filter((d) => d.driverId !== driverId));
      setToRemove(null);
      setToast({ message: "Livreur retiré", type: "success" });
    } catch {
      setToast({ message: "Retrait échoué", type: "error" });
    } finally {
      setRemovingId(null);
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={[styles.contentBg, { top: headerHeight }]} pointerEvents="none" />

      <TabHeader
        title="Livreurs"
        subtitle="Demandes & équipe"
        right={<HeaderPill label="Retour" icon="arrow-back-outline" onPress={onClose} />}
        onHeightChange={setHeaderHeight}
      />

      {!firstLoadDone ? (
        <View style={[styles.loader, { paddingTop: headerHeight }]}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
          <Text style={styles.loaderText}>Chargement des livreurs…</Text>
        </View>
      ) : (
      <ScrollView
        contentContainerStyle={{ paddingTop: headerHeight + 12, paddingHorizontal: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} progressViewOffset={headerHeight} />
        }
      >
        {/* Demandes en attente */}
        <Text style={styles.sectionTitle}>Demandes reçues</Text>
        {applications.length === 0 ? (
          <Text style={styles.empty}>Aucune demande en attente</Text>
        ) : (
          applications.map((app) => (
            <View key={app.id} style={styles.card}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {fullName(app.user?.infos).charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>{fullName(app.user?.infos)}</Text>
                {!!app.user?.infos?.email && (
                  <Text style={styles.sub} numberOfLines={1}>{app.user.infos.email}</Text>
                )}
              </View>
              {deciding[app.id] ? (
                <ActivityIndicator size="small" color={Theme.colors.primary} />
              ) : (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.iconBtn, { backgroundColor: "#16a34a" }]}
                    onPress={() => decide(app, "accepted")}
                  >
                    <Ionicons name="checkmark" size={18} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.iconBtn, { backgroundColor: Theme.colors.danger }]}
                    onPress={() => decide(app, "refused")}
                  >
                    <Ionicons name="close" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}

        {/* Livreurs assignés */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Mes livreurs</Text>
        {drivers.length === 0 ? (
          <Text style={styles.empty}>Aucun livreur pour le moment</Text>
        ) : (
          drivers.map((d) => (
            <View key={d.driverId} style={styles.card}>
              <View style={[styles.avatar, { backgroundColor: Theme.colors.primary }]}>
                <Ionicons name="bicycle" size={18} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>{fullName(d.infos)}</Text>
                {!!d.infos?.email && (
                  <Text style={styles.sub} numberOfLines={1}>{d.infos.email}</Text>
                )}
              </View>
              {removingId === d.driverId ? (
                <ActivityIndicator size="small" color={Theme.colors.danger} />
              ) : (
                <TouchableOpacity
                  style={[styles.iconBtn, { backgroundColor: Theme.colors.gray[100] }]}
                  onPress={() => setToRemove(d)}
                >
                  <Ionicons name="trash-outline" size={18} color={Theme.colors.danger} />
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>
      )}

      {/* Confirmation de retrait d'un livreur */}
      <Modal visible={!!toRemove} transparent animationType="fade" onRequestClose={() => setToRemove(null)}>
        <View style={styles.confirmBackdrop}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIcon}>
              <Ionicons name="trash-outline" size={28} color={Theme.colors.danger} />
            </View>
            <Text style={styles.confirmTitle}>Retirer ce livreur ?</Text>
            <Text style={styles.confirmMsg}>
              {fullName(toRemove?.infos)} ne pourra plus livrer les commandes de votre boutique.
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.confirmCancel]}
                onPress={() => setToRemove(null)}
                disabled={!!removingId}
              >
                <Text style={styles.confirmCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.confirmDanger]}
                onPress={confirmRemove}
                disabled={!!removingId}
              >
                {removingId ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.confirmDangerText}>Retirer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {toast && (
        <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 2000 },
  contentBg: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loaderText: {
    fontSize: 14,
    color: Theme.colors.gray[500],
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: Theme.colors.gray[500],
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  empty: { color: Theme.colors.gray[400], fontSize: 13, marginBottom: 8 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.colors.gray[100],
    backgroundColor: "#fff",
    marginBottom: 6,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Theme.colors.primary + "20",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 16, fontWeight: "800", color: Theme.colors.primary },
  name: { fontSize: 14, fontWeight: "600", color: Theme.colors.dark },
  sub: { fontSize: 12, color: Theme.colors.gray[500], marginTop: 2 },
  actions: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  confirmCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },
  confirmIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Theme.colors.danger + "18",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Theme.colors.dark,
    marginBottom: 6,
  },
  confirmMsg: {
    fontSize: 14,
    color: Theme.colors.gray[500],
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  confirmActions: { flexDirection: "row", gap: 10, width: "100%" },
  confirmBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmCancel: { backgroundColor: Theme.colors.gray[100] },
  confirmCancelText: { fontSize: 15, fontWeight: "600", color: Theme.colors.dark },
  confirmDanger: { backgroundColor: Theme.colors.danger },
  confirmDangerText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
