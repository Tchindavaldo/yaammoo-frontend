import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { driverService, DriverApplication } from "../services/driverService";
import { Toast } from "@/src/components/Toast";

interface DriverMyApplicationsModalProps {
  visible: boolean;
  onClose: () => void;
}

const STATUS_META: Record<
  DriverApplication["status"],
  { label: string; color: string; icon: any }
> = {
  pending: { label: "En attente", color: "#d97706", icon: "time-outline" },
  accepted: { label: "Acceptée", color: "#16a34a", icon: "checkmark-circle" },
  refused: { label: "Refusée", color: Theme.colors.danger, icon: "close-circle" },
};

// Dédup par fastFoodId : ne garde qu'UNE demande par boutique (la plus récente).
// Filet de sécurité au cas où l'API renvoie un doublon transitoire (relance,
// désync) — le backend est idempotent mais le front ne doit jamais montrer 2×.
const dedupeByStore = (list: DriverApplication[]): DriverApplication[] => {
  const byStore = new Map<string, DriverApplication>();
  for (const app of list) {
    const prev = byStore.get(app.fastFoodId);
    if (!prev) {
      byStore.set(app.fastFoodId, app);
      continue;
    }
    const t = (a: DriverApplication) => a.updatedAt || a.createdAt || "";
    if (t(app) >= t(prev)) byStore.set(app.fastFoodId, app);
  }
  return Array.from(byStore.values());
};

/**
 * Écran plein écran « Mes demandes de livraison » (Settings → Livraison).
 * Le user voit le statut de chaque demande envoyée et peut RELANCER celles
 * refusées (renvoie une demande à la même boutique).
 */
export const DriverMyApplicationsModal: React.FC<DriverMyApplicationsModalProps> = ({
  visible,
  onClose,
}) => {
  const { userData } = useAuth();
  const { registerApplicationHandler, unregisterApplicationHandler } = useDriver();
  const userId = userData?.uid;
  const [headerHeight, setHeaderHeight] = useState(70);
  const [loading, setLoading] = useState(false);
  const [firstLoadDone, setFirstLoadDone] = useState(false);
  const [apps, setApps] = useState<DriverApplication[]>([]);
  const [relaunching, setRelaunching] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      setApps(dedupeByStore(await driverService.getMyApplications(userId)));
    } catch {
      setToast({ message: "Erreur de chargement", type: "error" });
    } finally {
      setLoading(false);
      setFirstLoadDone(true);
    }
  }, [userId]);

  useEffect(() => {
    if (visible) {
      setFirstLoadDone(false);
      load();
    }
  }, [visible, load]);

  // Temps réel : ma demande décidée → maj du statut ; retrait par le fastfood
  // (après acceptation) → la demande de cette boutique DISPARAÎT de la liste.
  useEffect(() => {
    if (!visible) return;
    const handler = (e: ApplicationEvent) => {
      if (e.type === "decided") {
        const app = e.application;
        if (!app || app.userId !== userId) return;
        setApps((prev) =>
          prev.map((a) => (a.id === app.id ? { ...a, status: app.status } : a)),
        );
      } else if (e.type === "removed") {
        // Le fastfood m'a retiré → je ne suis plus livreur pour lui : retirer la
        // demande de cette boutique (plus dans "Mes demandes").
        setApps((prev) => prev.filter((a) => a.fastFoodId !== e.fastFoodId));
      }
    };
    registerApplicationHandler(handler);
    return () => unregisterApplicationHandler(handler);
  }, [visible, userId, registerApplicationHandler, unregisterApplicationHandler]);

  const relaunch = async (app: DriverApplication) => {
    if (!userId) return;
    setRelaunching((p) => ({ ...p, [app.id]: true }));
    try {
      await driverService.apply(userId, [app.fastFoodId]);
      // Màj locale (pas de refetch → pas de pull-refresh visible) : la demande
      // relancée repasse en attente. Le backend est idempotent par (user, ff).
      setApps((prev) =>
        prev.map((a) =>
          a.fastFoodId === app.fastFoodId ? { ...a, status: "pending" } : a,
        ),
      );
      setToast({ message: "Demande relancée ✅", type: "success" });
    } catch {
      setToast({ message: "Échec de la relance", type: "error" });
    } finally {
      setRelaunching((p) => ({ ...p, [app.id]: false }));
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={[styles.contentBg, { top: headerHeight }]} pointerEvents="none" />

      <TabHeader
        title="Mes demandes"
        subtitle="Demandes de livraison"
        right={<HeaderPill label="Retour" icon="arrow-back-outline" onPress={onClose} />}
        onHeightChange={setHeaderHeight}
      />

      {!firstLoadDone ? (
        <View style={[styles.loader, { paddingTop: headerHeight }]}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
          <Text style={styles.loaderText}>Chargement de vos demandes…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingTop: headerHeight + 12, paddingHorizontal: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={load} progressViewOffset={headerHeight} />
          }
        >
          {apps.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={48} color={Theme.colors.gray[300]} />
              <Text style={styles.emptyText}>Aucune demande envoyée</Text>
            </View>
          ) : (
            apps.map((app) => {
              const meta = STATUS_META[app.status];
              return (
                <View key={app.id} style={styles.card}>
                  <View style={styles.storeIcon}>
                    <Ionicons name="storefront-outline" size={20} color={Theme.colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.storeName} numberOfLines={1}>
                      {app.fastFoodName || "Boutique"}
                    </Text>
                    <View style={[styles.badge, { backgroundColor: meta.color + "18" }]}>
                      <Ionicons name={meta.icon} size={12} color={meta.color} />
                      <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                  </View>

                  {app.status === "refused" &&
                    (relaunching[app.id] ? (
                      <ActivityIndicator size="small" color={Theme.colors.primary} />
                    ) : (
                      <TouchableOpacity style={styles.relaunchBtn} onPress={() => relaunch(app)}>
                        <Ionicons name="refresh" size={14} color="#fff" />
                        <Text style={styles.relaunchText}>Relancer</Text>
                      </TouchableOpacity>
                    ))}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

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
  loader: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loaderText: { fontSize: 14, color: Theme.colors.gray[500] },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14, color: Theme.colors.gray[500] },
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
  storeIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Theme.colors.primary + "10",
    justifyContent: "center",
    alignItems: "center",
  },
  storeName: { fontSize: 14, fontWeight: "600", color: Theme.colors.dark, marginBottom: 4 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
  relaunchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
  },
  relaunchText: { color: "#fff", fontSize: 12, fontWeight: "700" },
});
