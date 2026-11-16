"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TabHeader } from "@/src/components/molecules/TabHeader";
import { BlurScope, BlurTarget } from "@/src/components/BlurTarget";
import { useMerchantMode } from "@/src/features/merchant/context/MerchantModeContext";
import { useMerchant } from "@/src/features/merchant/hooks/useMerchant";
import { WorkOrderPanel } from "./work-orders/WorkOrderPanel";
import { useDriver } from "@/src/features/driver/hooks/useDriver";
import { DriverOrderPanel, type DateOption } from "@/src/features/driver/components/DriverOrderPanel";
import { DriverFilterSheet } from "@/src/features/driver/components/DriverFilterSheet";
import { showToast } from "@/src/services/globalToast";
import { t, useLanguage } from "@/src/i18n";
import { DS } from "@/src/theme/ds";
import { WorkHeader } from "./WorkHeader";

/** Onglet du mode travail (navbar Attente / En cours / Termine). */
export type WorkStage = "pending" | "progress" | "done";

/**
 * Mode personnel : les onglets Attente / En cours / Termine s'ouvrent des que
 * le role a AU MOINS UNE de ces permissions ; chaque action reste grisee sans
 * sa propre permission (Valider, Terminer, Lancer).
 */
export const ORDER_PERMISSIONS = ["orders.validate", "orders.finish", "orders.deliver"];
export const canSeeOrders = (can: (p: string) => boolean) => ORDER_PERMISSIONS.some(can);

// Personnel : pending / processing / finished+delivering+delivered.
const STAFF_STATUS = { pending: "pending", progress: "proccess", done: "finish" } as const;
// Livreur : a livrer / en livraison / livrees.
const DRIVER_STATUS: Record<WorkStage, string> = { pending: "finished", progress: "delivering", done: "delivered" };

export function NoAccessPanel() {
  useLanguage();
  return (
    <View style={styles.centered}>
      <Ionicons name="lock-closed-outline" size={36} color={DS.muted} />
      <Text style={styles.noAccess}>{t("Vous n'avez pas les droits d'accès à cette page")}</Text>
    </View>
  );
}

export function WorkOrdersScreen({ stage }: { stage: WorkStage }) {
  useLanguage();
  const { isDriverMode, can } = useMerchantMode();
  const [headerHeight, setHeaderHeight] = useState(70);
  const [filterOpen, setFilterOpen] = useState(false);
  const allowed = isDriverMode || canSeeOrders(can);

  return (
    <View style={styles.container}>
      <BlurScope>
        <TabHeader onHeightChange={setHeaderHeight}>
          <WorkHeader onFilter={allowed ? () => setFilterOpen(true) : undefined} />
        </TabHeader>
        <BlurTarget style={{ flex: 1 }}>
          {!allowed ? (
            <NoAccessPanel />
          ) : isDriverMode ? (
            <DriverStage stage={stage} topOffset={headerHeight} filterOpen={filterOpen} setFilterOpen={setFilterOpen} />
          ) : (
            <StaffStage stage={stage} topOffset={headerHeight} filterOpen={filterOpen} setFilterOpen={setFilterOpen} />
          )}
        </BlurTarget>
      </BlurScope>
    </View>
  );
}

interface StageProps {
  stage: WorkStage;
  topOffset: number;
  filterOpen: boolean;
  setFilterOpen: (v: boolean) => void;
}

function StaffStage({ stage, topOffset, filterOpen, setFilterOpen }: StageProps) {
  const { orders, loading, refresh, updateStatus, delegateOrder, ensureLoaded } = useMerchant();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  useEffect(() => {
    ensureLoaded();
  }, [ensureLoaded]);
  const handleUpdateStatus = async (id: string, status: string) => {
    const ok = await updateStatus(id, status);
    if (!ok) return;
    if (status === "delivering") showToast(t("Livraison lancée"), "success");
    else if (status === "processing") showToast(t("Commande acceptée"), "success");
    else if (status === "finished") showToast(t("Commande terminée"), "success");
  };
  return (
    <WorkOrderPanel
      orders={orders}
      loading={loading}
      onRefresh={refresh}
      onUpdateStatus={handleUpdateStatus}
      onDelegate={delegateOrder}
      selectedDate={selectedDate}
      onSelectDate={setSelectedDate}
      topOffset={topOffset}
      selectedStatus={STAFF_STATUS[stage]}
      filterOpen={filterOpen}
      setFilterOpen={setFilterOpen}
    />
  );
}

function DriverStage({ stage, topOffset, filterOpen, setFilterOpen }: StageProps) {
  const { orders, loading, refresh, updateStatus } = useDriver();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dateOptions, setDateOptions] = useState<DateOption[]>([]);
  const [storeFilter, setStoreFilter] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState<string | null>(null);
  const todayISO = new Date().toISOString().substring(0, 10);

  const stageOrders = useMemo(() => orders.filter((o) => o.status === DRIVER_STATUS[stage]), [orders, stage]);
  const stores = useMemo(
    () =>
      [...new Set(stageOrders.map((o) => o.fastFoodId).filter(Boolean))].map((id) => ({
        id,
        nom: t("Boutique {{a}}", { a: String(id).slice(0, 4) }),
      })),
    [stageOrders],
  );
  const countByStore = useMemo(() => {
    const m: Record<string, number> = {};
    stageOrders.forEach((o) => o.fastFoodId && (m[o.fastFoodId] = (m[o.fastFoodId] || 0) + 1));
    return m;
  }, [stageOrders]);
  const periods = useMemo(() => {
    const set = new Set<string>();
    stageOrders.forEach((o) => {
      const d = (o as any).delivery;
      const slot = d && d.type !== "express" ? d.time || d.hour : null;
      if (slot) set.add(slot);
    });
    return [...set];
  }, [stageOrders]);

  return (
    <>
      <DriverOrderPanel
        orders={stageOrders}
        loading={loading}
        onRefresh={refresh}
        onUpdateStatus={updateStatus}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        onDatesChange={setDateOptions}
        topOffset={topOffset}
        storeFilter={storeFilter}
        periodFilter={periodFilter}
      />
      <DriverFilterSheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        stores={stores}
        pendingCountByStore={countByStore}
        storeFilter={storeFilter}
        onSelectStore={setStoreFilter}
        dates={dateOptions}
        selectedDate={selectedDate}
        todayISO={todayISO}
        onSelectDate={setSelectedDate}
        periods={periods}
        periodFilter={periodFilter}
        onSelectPeriod={setPeriodFilter}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DS.bg },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32 },
  noAccess: { fontSize: 15, fontWeight: "600", color: DS.ink, textAlign: "center" },
});
