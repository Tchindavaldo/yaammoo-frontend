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
import { StickyChipsRow } from "@/src/features/driver/components/StickyChipsRow";
import type { DateOption } from "./OrderManagePanel";

/** Filtre période : "express", "surplace", ou un créneau horaire précis (ex. "12h"). */
export type PeriodKey = string;

interface MerchantFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Dates du jour et à venir (aujourd'hui en tête). */
  todayISO: string;
  futureDates: DateOption[];
  /** Dates déjà passées (historique). */
  pastDates: DateOption[];
  selectedDate: string | null;
  onSelectDate: (iso: string | null) => void;
  /**
   * Périodes de livraison disponibles pour la date active :
   * "express", "surplace", puis les créneaux horaires précis.
   */
  periods: { key: PeriodKey; label: string; count: number }[];
  /** Total de commandes de la date active (libellé « Toutes les périodes »). */
  allPeriodsCount: number;
  /** Sélection MULTIPLE : plusieurs créneaux peuvent être cochés à la fois. */
  selectedPeriods: PeriodKey[];
  onTogglePeriod: (key: PeriodKey) => void;
  onResetPeriods: () => void;
  /**
   * Les dates passées sont des commandes NON TRAITÉES tant qu'on est sur
   * « En attente » / « En cours » ; sur « Terminées » ce sont juste des
   * commandes passées.
   */
  pastUntreated: boolean;
}

/**
 * Bottom sheet de filtres des commandes marchand, calqué sur `DriverFilterSheet` :
 * dates du jour / à venir en haut (fixe), périodes de livraison au milieu
 * (liste cochable, multi-sélection), dates passées en bas (fixe).
 */
export const MerchantFilterSheet: React.FC<MerchantFilterSheetProps> = ({
  visible,
  onClose,
  todayISO,
  futureDates,
  pastDates,
  selectedDate,
  onSelectDate,
  periods,
  allPeriodsCount,
  selectedPeriods,
  onTogglePeriod,
  onResetPeriods,
  pastUntreated,
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

  const allPeriods = selectedPeriods.length === 0;
  // Modes de livraison (lignes cochables) vs créneaux horaires (tuiles).
  const modePeriods = periods.filter((p) => p.key in PERIOD_ICONS);
  const slotPeriods = periods.filter((p) => !(p.key in PERIOD_ICONS));

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
        {/* ── Dates (haut, FIXE) : deux sections CÔTE À CÔTE, chacune avec son
            label au-dessus et ses chips en dessous. ── */}
        <View style={styles.dateRow}>
          <View style={styles.dateCol}>
            <Text style={styles.sectionLabel}>Aujourd'hui</Text>
            <StickyChipsRow
              items={[{ key: todayISO, label: "Aujourd'hui" }]}
              activeKey={activeDate}
              onSelect={() => onSelectDate(null)}
            />
          </View>

          <View style={styles.dateCol}>
            <Text style={styles.sectionLabel}>Cmd à venir</Text>
            {futureDates.length === 0 ? (
              <Text style={styles.empty}>Aucune</Text>
            ) : (
              <StickyChipsRow
                items={futureDates.map((d) => ({ key: d.iso, label: d.label }))}
                activeKey={activeDate}
                onSelect={(iso) => onSelectDate(iso)}
              />
            )}
          </View>
        </View>

        {/* ── Périodes (milieu, SCROLLABLE) : les modes de livraison restent des
            lignes cochables ; seuls les CRÉNEAUX passent en tuiles. ── */}
        <ScrollView
          style={styles.periodsScroll}
          showsVerticalScrollIndicator={false}
        >
          <Row
            icon="layers-outline"
            label="Toutes les périodes"
            count={allPeriodsCount}
            active={allPeriods}
            onPress={onResetPeriods}
          />
          {modePeriods.map((p) => (
            <Row
              key={p.key}
              icon={PERIOD_ICONS[p.key]}
              label={p.label}
              count={p.count}
              active={selectedPeriods.includes(p.key)}
              onPress={() => onTogglePeriod(p.key)}
            />
          ))}

          {slotPeriods.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Créneaux horaires</Text>
              <View style={styles.grid}>
                {slotPeriods.map((p) => (
                  <PeriodTile
                    key={p.key}
                    label={p.label}
                    count={p.count}
                    active={selectedPeriods.includes(p.key)}
                    onPress={() => onTogglePeriod(p.key)}
                  />
                ))}
              </View>
            </>
          )}
        </ScrollView>

        {/* ── Dates passées (bas, FIXE) : label au-dessus, chips en dessous. ── */}
        <View style={styles.pastBar}>
          <Text style={styles.sectionLabel}>
            {pastUntreated ? "Cmd passées non traitées" : "Cmd passées"}
          </Text>
          {pastDates.length === 0 ? (
            <Text style={styles.empty}>Aucune</Text>
          ) : (
            <StickyChipsRow
              items={pastDates.map((d) => ({ key: d.iso, label: d.label }))}
              activeKey={activeDate}
              onSelect={(iso) => onSelectDate(iso)}
            />
          )}
        </View>
      </Animated.View>
    </Modal>
  );
};

const PERIOD_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  express: "flash-outline",
  surplace: "restaurant-outline",
};

/** Tuile de créneau horaire, calquée sur l'item Extra du bottom sheet home. */
const PeriodTile = ({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity style={styles.tile} onPress={onPress} activeOpacity={0.7}>
    <View style={[styles.tileIcon, active && styles.tileIconActive]}>
      <Text style={[styles.tileHour, active && styles.tileLabelActive]}>
        {label}
      </Text>
      {/* Badge = nb de commandes du créneau (coché : fond plein). */}
      <View style={[styles.tileBadge, !active && styles.tileBadgeIdle]}>
        <Text style={[styles.tileBadgeText, !active && styles.tileBadgeTextIdle]}>
          {count}
        </Text>
      </View>
    </View>
  </TouchableOpacity>
);

/** Ligne cochable (modes de livraison + « Toutes les périodes »). */
const Row = ({
  icon,
  label,
  count,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  count: number;
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
    <View style={styles.countBadge}>
      <Text style={styles.countText}>{count}</Text>
    </View>
    <Ionicons
      name={active ? "checkbox" : "square-outline"}
      size={18}
      color={active ? Theme.colors.primary : "#C9C7C0"}
    />
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
    // Hauteur FIXE : beaucoup de créneaux ne fait plus grandir le sheet, la
    // grille des périodes scrolle à l'intérieur.
    height: "58%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  // Les deux sections de dates CÔTE À CÔTE (label au-dessus, chips en dessous).
  dateRow: {
    flexDirection: "row",
    gap: 12,
  },
  dateCol: {
    flex: 1,
    minWidth: 0,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#A8A7A2",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 10,
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
  periodsScroll: {
    flex: 1,
    marginTop: 12,
  },
  pastBar: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  // Grille de tuiles (design Extra du sheet home).
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    paddingTop: 8,
    paddingRight: 6,
  },
  tile: {
    alignItems: "center",
  },
  tileIcon: {
    width: 62,
    height: 52,
    borderRadius: 16,
    backgroundColor: Theme.colors.primary + "0D",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  tileIconActive: {
    borderColor: Theme.colors.primary,
  },
  tileBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: Theme.colors.primary,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  // Non coché : badge discret sur fond blanc.
  tileBadgeIdle: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E3DC",
  },
  tileBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#fff",
  },
  tileBadgeTextIdle: {
    color: "#888780",
  },
  // Badge de compteur des lignes cochables.
  countBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Theme.colors.primary + "14",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  countText: {
    fontSize: 11,
    fontWeight: "700",
    color: Theme.colors.primary,
  },
  tileHour: {
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
    color: "#1A1916",
  },
  tileLabelActive: {
    color: Theme.colors.primary,
  },
  empty: {
    fontSize: 13,
    color: "#A8A7A2",
    fontStyle: "italic",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
});
