import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TabHeader } from "@/src/components/molecules/TabHeader";
import { HeaderPill } from "@/src/components/molecules/HeaderPill";
import { Theme } from "@/src/theme";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { useDriver } from "../hooks/useDriver";
import { driverService, StoreOption } from "../services/driverService";
import { DriverOrderPanel, DateOption } from "./DriverOrderPanel";
import { DriverFilterSheet } from "./DriverFilterSheet";
import { StickyChipsRow } from "./StickyChipsRow";

/** Hauteur de la navbar (tabs) — la modal est montée dans (tabs), navbar par-dessus. */
const NAVBAR_HEIGHT = 58;

interface DriverOrdersModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Écran plein écran « Mes livraisons » (Settings → Livraison, si livreur).
 * Un livreur peut servir plusieurs boutiques. Les filtres (boutique + date) sont
 * regroupés dans un bottom sheet (icône à droite de la barre de chips), et une
 * barre de chips « boutique » en bas donne un accès rapide (icône + nb en attente).
 */
export const DriverOrdersModal: React.FC<DriverOrdersModalProps> = ({
  visible,
  onClose,
}) => {
  const { userData } = useAuth();
  const insets = useSafeAreaInsets();
  const { orders, loading, refresh, updateStatus } = useDriver();
  const [headerHeight, setHeaderHeight] = useState(70);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dateOptions, setDateOptions] = useState<DateOption[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [storeFilter, setStoreFilter] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  const driverId = userData?.driverId;
  const todayISO = new Date().toISOString().substring(0, 10);

  // Charge les boutiques du livreur pour le filtre.
  useEffect(() => {
    if (!visible || !driverId) return;
    driverService
      .getMyStores(driverId)
      .then(setStores)
      .catch(() => setStores([]));
  }, [visible, driverId]);

  // Fallback : si l'endpoint stores est vide, déduis les boutiques des commandes.
  const derivedStores = useMemo(() => {
    if (stores.length > 0) return stores;
    const ids = [...new Set(orders.map((o) => o.fastFoodId).filter(Boolean))];
    return ids.map((id) => ({ id, nom: `Boutique ${id.slice(0, 4)}` }));
  }, [stores, orders]);

  const getOrderDateISO = (dateStr: string | undefined): string => {
    if (!dateStr) return todayISO;
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? todayISO : d.toISOString().substring(0, 10);
    } catch {
      return todayISO;
    }
  };

  // Commandes EN ATTENTE (finished) pour la date sélectionnée — base des compteurs.
  const activeDate = selectedDate ?? todayISO;
  const pendingOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.status === "finished" &&
          getOrderDateISO(o.delivery?.date || o.createdAt) === activeDate,
      ),
    [orders, activeDate],
  );

  const pendingCountByStore = useMemo(() => {
    const map: Record<string, number> = {};
    pendingOrders.forEach((o) => {
      if (o.fastFoodId) map[o.fastFoodId] = (map[o.fastFoodId] || 0) + 1;
    });
    return map;
  }, [pendingOrders]);

  // Créneaux horaires précis (hors express) EN CASCADE : uniquement ceux présents
  // pour la boutique active ET la date active (schéma fastfood → date → période).
  const periods = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      if (storeFilter && o.fastFoodId !== storeFilter) return;
      if (getOrderDateISO(o.delivery?.date || o.createdAt) !== activeDate) return;
      const d = (o as any).delivery;
      if (!d || d.type === "express") return;
      const slot = d.time || d.hour;
      if (slot) set.add(slot);
    });
    return [...set];
  }, [orders, storeFilter, activeDate]);

  // Si le créneau sélectionné n'existe plus après changement boutique/date, reset.
  useEffect(() => {
    if (periodFilter && periodFilter !== "express" && !periods.includes(periodFilter)) {
      setPeriodFilter(null);
    }
  }, [periods, periodFilter]);

  // X du sous-titre : cmd en attente visibles selon le filtre boutique courant.
  const pendingCount = useMemo(
    () =>
      storeFilter
        ? pendingCountByStore[storeFilter] || 0
        : pendingOrders.length,
    [storeFilter, pendingCountByStore, pendingOrders],
  );

  const dateLabel = useMemo(() => {
    if (activeDate === todayISO) return "Aujourd'hui";
    return new Date(activeDate).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
    });
  }, [activeDate, todayISO]);

  const subtitle = `${dateLabel} · ${pendingCount} cmd`;
  const showFilter = derivedStores.length > 1;

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={[styles.contentBg, { top: headerHeight }]} pointerEvents="none" />

      <TabHeader
        title="Mes livraisons"
        subtitle={subtitle}
        right={<HeaderPill label="Retour" icon="arrow-back-outline" onPress={onClose} />}
        onHeightChange={setHeaderHeight}
      />

      <View style={{ flex: 1 }}>
        <DriverOrderPanel
          orders={orders}
          loading={loading}
          onRefresh={refresh}
          onUpdateStatus={updateStatus}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onDatesChange={setDateOptions}
          topOffset={headerHeight}
          storeFilter={storeFilter}
          periodFilter={periodFilter}
        />
      </View>

      {/* Barre de filtres en BAS : chips boutique (nom + nb en attente) + icône sheet */}
      {showFilter && (
        <View style={[styles.bottomBar, { bottom: insets.bottom + NAVBAR_HEIGHT }]}>
          <View style={{ flex: 1 }}>
            <StickyChipsRow
              items={[
                { key: "__all__", label: "Toutes" },
                ...derivedStores.map((s) => ({
                  key: s.id,
                  label: s.nom,
                  count: pendingCountByStore[s.id] || 0,
                })),
              ]}
              activeKey={storeFilter ?? "__all__"}
              onSelect={(k) => setStoreFilter(k === "__all__" ? null : k)}
            />
          </View>

          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => setFilterOpen(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="options-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      <DriverFilterSheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        stores={derivedStores}
        pendingCountByStore={pendingCountByStore}
        storeFilter={storeFilter}
        onSelectStore={(id) => setStoreFilter(id)}
        dates={dateOptions}
        selectedDate={selectedDate}
        todayISO={todayISO}
        onSelectDate={(iso) => setSelectedDate(iso)}
        periods={periods}
        periodFilter={periodFilter}
        onSelectPeriod={(p) => setPeriodFilter(p)}
      />
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
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    gap: 10,
  },
  filterBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
