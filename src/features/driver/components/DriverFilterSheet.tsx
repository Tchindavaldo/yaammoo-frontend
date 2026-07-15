import { Theme } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StoreOption } from "../services/driverService";
import { DateOption } from "./DriverOrderPanel";
import { StickyChipsRow } from "./StickyChipsRow";

/** Filtre période : "express", ou un créneau horaire précis (ex. "12h"), ou null. */
export type PeriodFilter = string | null;

interface DriverFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Boutiques servies + nb de commandes EN ATTENTE (finished) par boutique. */
  stores: StoreOption[];
  pendingCountByStore: Record<string, number>;
  storeFilter: string | null;
  onSelectStore: (id: string | null) => void;
  /** Dates disponibles (déduites des commandes) + date sélectionnée. */
  dates: DateOption[];
  selectedDate: string | null;
  todayISO: string;
  onSelectDate: (iso: string | null) => void;
  /** Créneaux horaires précis présents (hors express), ex. ["12h","19h"]. */
  periods: string[];
  periodFilter: PeriodFilter;
  onSelectPeriod: (p: PeriodFilter) => void;
}

/**
 * Bottom sheet de filtres pour « Mes livraisons » (livreur).
 * Date (haut, fixe) → Boutiques (scrollables) → Période (bas, fixe).
 * Filtrer = cliquer une entrée ; « Toutes » réinitialise la section.
 */
export const DriverFilterSheet: React.FC<DriverFilterSheetProps> = ({
  visible,
  onClose,
  stores,
  pendingCountByStore,
  storeFilter,
  onSelectStore,
  dates,
  selectedDate,
  todayISO,
  onSelectDate,
  periods,
  periodFilter,
  onSelectPeriod,
}) => {
  const insets = useSafeAreaInsets();
  const activeDate = selectedDate ?? todayISO;

  // Backdrop en FONDU + sheet qui glisse (le Modal natif ne fait pas monter le fond).
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) return;
    fade.setValue(0);
    slide.setValue(1);
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(slide, {
        toValue: 0,
        useNativeDriver: true,
        damping: 22,
        stiffness: 200,
      }),
    ]).start();
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.backdrop, { opacity: fade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          {
            paddingBottom: insets.bottom + 16,
            transform: [
              {
                translateY: slide.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 400],
                }),
              },
            ],
          },
        ]}
      >
        {/* ── Dates (haut, FIXE, horizontal, sticky) ── */}
        {dates.length === 0 ? (
          <Text style={styles.emptyDates}>Aucune date disponible</Text>
        ) : (
          <StickyChipsRow
            items={dates.map((d) => ({
              key: d.iso,
              label: d.iso === todayISO ? "Aujourd'hui" : d.label,
            }))}
            activeKey={activeDate}
            onSelect={(iso) => onSelectDate(iso === todayISO ? null : iso)}
          />
        )}

        {/* ── Boutiques (milieu, SCROLLABLE) ── */}
        <ScrollView
          style={styles.storesScroll}
          showsVerticalScrollIndicator={false}
        >
          <Row
            icon="grid-outline"
            label="Toutes les boutiques"
            active={storeFilter === null}
            onPress={() => onSelectStore(null)}
          />
          {stores.map((s) => (
            <Row
              key={s.id}
              icon="storefront-outline"
              label={s.nom}
              count={pendingCountByStore[s.id] || 0}
              active={storeFilter === s.id}
              onPress={() => onSelectStore(s.id)}
            />
          ))}
        </ScrollView>

        {/* ── Période (bas, FIXE, horizontal, sticky) : Toutes / Express / créneaux ── */}
        <View style={styles.periodBar}>
          <StickyChipsRow
            items={[
              { key: "__all__", label: "Toutes" },
              { key: "express", label: "Express" },
              ...periods.map((p) => ({ key: p, label: p })),
            ]}
            activeKey={periodFilter ?? "__all__"}
            onSelect={(k) => onSelectPeriod(k === "__all__" ? null : k)}
          />
        </View>
      </Animated.View>
    </Modal>
  );
};

const Row = ({
  icon,
  label,
  count,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  count?: number;
  active: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={[styles.row, active && styles.rowActive]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Ionicons
      name={icon}
      size={18}
      color={active ? Theme.colors.primary : "#888780"}
    />
    <Text
      style={[styles.rowLabel, active && styles.rowLabelActive]}
      numberOfLines={1}
    >
      {label}
    </Text>
    {count != null && count > 0 && (
      <View style={styles.countBadge}>
        <Text style={styles.countText}>{count}</Text>
      </View>
    )}
    {active && (
      <Ionicons name="checkmark" size={18} color={Theme.colors.primary} />
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "65%",
    minHeight: "45%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  storesScroll: {
    flex: 1,
    marginTop: 12,
  },
  periodBar: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  rowActive: {
    backgroundColor: Theme.colors.primary + "10",
  },
  rowLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1916",
  },
  rowLabelActive: {
    color: Theme.colors.primary,
  },
  countBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  countText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
  emptyDates: {
    fontSize: 13,
    color: "#A8A7A2",
    fontStyle: "italic",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
});
