"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
// Page « Livreurs » (Gestion → Livreurs, route app/shop/drivers.tsx) : demandes
// recues, mes livreurs, et « Ajouter un livreur ». Ancien onglet Livreurs de
// Personnel, sorti en page a part (logique reprise de StaffManageModal).
import { GlobalToastHost } from "@/src/components/GlobalToastHost";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useState } from "react";
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { HeaderPill } from "@/src/components/molecules/HeaderPill";
import { Toast } from "@/src/components/Toast";
import { driverService, type DriverApplication, type DriverInfo } from "@/src/features/driver/services/driverService";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { useStaffDrivers } from "../hooks/useStaffDrivers";
import { STAFF_FREE_PLAN } from "../services/staffService";
import { personName, plural } from "../utils/staffFormat";
import { StaffConfirmDialog, type StaffConfirm } from "./StaffConfirmDialog";
import { StaffDriverCreateSheet, type DriverRecruitDraft } from "./StaffDriverCreateSheet";
import { StaffDriversTab } from "./StaffDriversTab";
import { StaffHeader } from "./StaffHeader";
import { ST } from "./staffTheme";
import { t, useLanguage } from "@/src/i18n";

const FAB_HEIGHT = 54;
type ToastState = { message: string; type: "success" | "error" } | null;

export const StaffDriversPage: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  useLanguage();
  const { userData } = useAuth();
  const [toast, setToast] = useState<ToastState>(null);
  const onLoadError = useCallback(() => setToast({ message: t("Impossible de charger les livreurs"), type: "error" }), []);
  const drv = useStaffDrivers(true, onLoadError);
  const [headerHeight, setHeaderHeight] = useState(70);
  const [creating, setCreating] = useState(false);
  const [recruiting, setRecruiting] = useState(false);
  const [confirm, setConfirm] = useState<StaffConfirm | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const plan = STAFF_FREE_PLAN;
  const full = drv.drivers.length >= plan.driverLimit;
  const notify = (ok: boolean, success: string, error: string) => setToast({ message: ok ? success : error, type: ok ? "success" : "error" });

  const openCreate = () => {
    if (full) return setToast({ message: t("Toutes les places de livreur sont prises"), type: "error" });
    setCreating(true);
  };

  const submit = async (draft: DriverRecruitDraft) => {
    const fastFoodId = userData?.fastFoodId;
    if (!fastFoodId) return false;
    setRecruiting(true);
    const error = await driverService.recruitDriver(fastFoodId, draft);
    setRecruiting(false);
    if (error) {
      setToast({ message: error, type: "error" });
      return false;
    }
    setToast({ message: draft.mode === "invite" ? t("Invitation envoyée") : t("Livreur ajouté"), type: "success" });
    drv.refresh();
    return true;
  };

  const decide = async (app: DriverApplication, decision: "accepted" | "refused") => {
    if (decision === "accepted" && full) return setToast({ message: t("Toutes les places de livreur sont prises"), type: "error" });
    const res = await drv.decide(app, decision);
    notify(res.ok, decision === "accepted" ? t("Livreur accepté") : t("Demande refusée"), res.ok ? "" : res.message);
  };

  const removeDriver = (d: DriverInfo) =>
    setConfirm({
      title: t("Retirer ce livreur ?"),
      message: t("{{a}} ne pourra plus livrer les commandes de votre boutique.", { a: personName(d.infos) }),
      confirmLabel: t("Retirer"),
      onConfirm: async () => {
        setConfirmBusy(true);
        const res = await drv.removeDriver(d.driverId);
        notify(res.ok, t("Livreur retiré"), res.ok ? "" : res.message);
        setConfirmBusy(false);
        setConfirm(null);
      },
    });

  return (
    <View style={styles.overlay}>
      <StaffHeader
        title={t("Livreurs")}
        subtitle={`${plural(drv.drivers.length, t("livreur"))} · ${plural(drv.applications.length, t("demande"))}`}
        right={<HeaderPill label={t("Retour")} icon="arrow-back-outline" onPress={onClose} />}
        onHeightChange={setHeaderHeight}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingTop: headerHeight + 10, paddingBottom: FAB_HEIGHT + 30 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={drv.refreshing} onRefresh={drv.refresh} progressViewOffset={headerHeight} />}
      >
        <StaffDriversTab
          applications={drv.applications}
          drivers={drv.drivers}
          loaded={drv.loaded}
          deciding={drv.deciding}
          removingId={drv.removingId}
          onDecide={decide}
          onRemove={removeDriver}
        />
      </ScrollView>

      <View style={[styles.fabWrap, { bottom: 16 }]} pointerEvents="box-none">
        <Pressable
          onPress={openCreate}
          style={({ pressed }) => [styles.fab, full ? styles.fabOff : styles.fabOn, pressed && !full && { opacity: 0.85 }]}
          accessibilityRole="button"
        >
          <Ionicons name="bicycle-outline" size={18} color={full ? ST.faint : "#fff"} />
          <Text style={[styles.fabText, { color: full ? ST.faint : "#fff" }]}>
            {full ? t("Toutes les places sont prises") : t("Ajouter un livreur")}
          </Text>
        </Pressable>
      </View>

      <Modal visible={creating} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent onRequestClose={() => setCreating(false)}>
        <View style={styles.pages}>
          {creating && (
            <StaffDriverCreateSheet
              slotLabel={t("Livreur {{a}} sur {{b}}", { a: drv.drivers.length + 1, b: plan.driverLimit })}
              saving={recruiting}
              onSubmit={submit}
              onClose={() => setCreating(false)}
            />
          )}
        </View>
        {toast && creating && <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />}
        <GlobalToastHost modal />
      </Modal>

      <StaffConfirmDialog confirm={confirm} busy={confirmBusy} onCancel={() => setConfirm(null)} />
      {toast && <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "#fff" },
  pages: { flex: 1, backgroundColor: "#fff" },
  content: { flexGrow: 1, gap: 10, paddingHorizontal: 16 },
  fabWrap: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  fab: { height: FAB_HEIGHT, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 28, borderRadius: FAB_HEIGHT / 2 },
  fabOn: { backgroundColor: ST.ink, shadowColor: ST.ink, shadowOpacity: 0.28, shadowRadius: 14, shadowOffset: { width: 0, height: 12 }, elevation: 8 },
  fabOff: { backgroundColor: ST.line },
  fabText: { fontSize: 16, fontWeight: "600" },
});
