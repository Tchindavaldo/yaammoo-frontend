import React, { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { TabHeader } from "@/src/components/molecules/TabHeader";
import { HeaderPill } from "@/src/components/molecules/HeaderPill";
import { Theme } from "@/src/theme";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { useDriver } from "../hooks/useDriver";
import { driverService, StoreOption } from "../services/driverService";
import { DriverOrderPanel, DateOption } from "./DriverOrderPanel";

interface DriverOrdersModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Écran plein écran « Mes livraisons » (Settings → Livraison, si livreur).
 * Un livreur peut servir plusieurs boutiques → un FILTRE par boutique en haut
 * (chips) ; le DriverOrderPanel n'affiche que la boutique choisie.
 */
export const DriverOrdersModal: React.FC<DriverOrdersModalProps> = ({
  visible,
  onClose,
}) => {
  const { userData } = useAuth();
  const { orders, loading, refresh, updateStatus } = useDriver();
  const [headerHeight, setHeaderHeight] = useState(70);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [, setDateOptions] = useState<DateOption[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [storeFilter, setStoreFilter] = useState<string | null>(null);

  const driverId = userData?.driverId;

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

  const showFilter = derivedStores.length > 1;

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={[styles.contentBg, { top: headerHeight }]} pointerEvents="none" />

      <TabHeader
        title="Mes livraisons"
        subtitle="Commandes déléguées"
        right={<HeaderPill label="Retour" icon="arrow-back-outline" onPress={onClose} />}
        onHeightChange={setHeaderHeight}
      />

      <View style={{ flex: 1 }}>
        {/* Filtre par boutique (seulement si plusieurs) */}
        {showFilter && (
          <View style={[styles.filterBar, { top: headerHeight }]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterContent}
            >
              <Chip
                label="Toutes"
                active={storeFilter === null}
                onPress={() => setStoreFilter(null)}
              />
              {derivedStores.map((s) => (
                <Chip
                  key={s.id}
                  label={s.nom}
                  active={storeFilter === s.id}
                  onPress={() => setStoreFilter(s.id)}
                />
              ))}
            </ScrollView>
          </View>
        )}

        <DriverOrderPanel
          orders={orders}
          loading={loading}
          onRefresh={refresh}
          onUpdateStatus={updateStatus}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onDatesChange={setDateOptions}
          topOffset={headerHeight + (showFilter ? FILTER_BAR_HEIGHT : 0)}
          storeFilter={storeFilter}
        />
      </View>
    </View>
  );
};

const FILTER_BAR_HEIGHT = 48;

const Chip = ({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.chip, active && styles.chipActive]}
    onPress={onPress}
  >
    <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 2000 },
  contentBg: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
  },
  filterBar: {
    position: "absolute",
    left: 0,
    right: 0,
    height: FILTER_BAR_HEIGHT,
    justifyContent: "center",
    backgroundColor: "#fff",
    zIndex: 60,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  filterContent: {
    paddingHorizontal: 15,
    gap: 6,
    alignItems: "center",
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: Theme.colors.primary + "10",
    maxWidth: 160,
  },
  chipActive: { backgroundColor: Theme.colors.primary },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
    color: Theme.colors.primary,
  },
  chipTextActive: { color: "#fff" },
});
