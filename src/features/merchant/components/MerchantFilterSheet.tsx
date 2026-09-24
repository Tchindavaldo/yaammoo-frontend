import { StickyChipsRow } from "@/src/features/driver/components/StickyChipsRow";
import { Theme } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
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
  /** Total de COMMANDES (pas de dates) sur la date du jour. */
  todayOrdersCount: number;
  /** Total de COMMANDES (pas de dates) sur toutes les dates à venir. */
  futureOrdersCount: number;
  /** Total de COMMANDES (pas de dates) sur toutes les dates passées. */
  pastOrdersCount: number;
  /** Sélection MULTIPLE : plusieurs créneaux peuvent être cochés à la fois. */
  selectedPeriods: PeriodKey[];
  onTogglePeriod: (key: PeriodKey) => void;
  /** Bascule un LOT de clés en une seule mise à jour d'état. */
  onTogglePeriods: (keys: PeriodKey[], select: boolean) => void;
  onResetPeriods: () => void;
  /**
   * Les dates passées sont des commandes NON TRAITÉES tant qu'on est sur
   * « En attente » / « En cours » ; sur « Terminées » ce sont juste des
   * commandes passées.
   */
  pastUntreated: boolean;
  /**
   * Chips de statut (En Attente / En cours / Terminées) rendus dans le sheet.
   * Optionnels : `CartStatusPanel` (côté client) réutilise ce sheet sans eux.
   */
  statusTabs?: { key: string; label: string; count: number }[];
  selectedStatus?: string;
  onSelectStatus?: (key: string) => void;
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
  todayOrdersCount,
  futureOrdersCount,
  pastOrdersCount,
  selectedPeriods,
  onTogglePeriod,
  onTogglePeriods,
  onResetPeriods,
  pastUntreated,
  statusTabs,
  selectedStatus,
  onSelectStatus,
}) => {
  const insets = useSafeAreaInsets();
  const activeDate = selectedDate ?? todayISO;
  // Sous-sheet des créneaux horaires (ouvert par la card « Créneaux horaires »).
  const [slotsOpen, setSlotsOpen] = useState(false);
  // Lot de dates listé sous les 2 cards du bas.
  const [dateScope, setDateScope] = useState<"today" | "future" | "past">(
    "today",
  );

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

  // À l'ouverture, la card sélectionnée est celle qui contient la date active.
  useEffect(() => {
    if (!visible) return;
    if (!selectedDate || selectedDate === todayISO) setDateScope("today");
    else setDateScope(selectedDate < todayISO ? "past" : "future");
  }, [visible, selectedDate, todayISO]);

  // « Aujourd'hui » est une date unique : aucune liste à dérouler dessous.
  const scopeDates =
    dateScope === "future"
      ? futureDates
      : dateScope === "past"
        ? pastDates
        : [];
  const allPeriods = selectedPeriods.length === 0;
  // Modes de livraison (lignes cochables) vs créneaux horaires (tuiles).
  const modePeriods = periods.filter((p) => p.key in PERIOD_ICONS);
  const slotPeriods = periods.filter((p) => !(p.key in PERIOD_ICONS));
  const slotCount = slotPeriods.reduce((acc, p) => acc + p.count, 0);
  const anySlotSelected = slotPeriods.some((p) =>
    selectedPeriods.includes(p.key),
  );

  // Récap affiché à la place de la liste de dates quand « Aujourd'hui » est
  // choisi : toujours les 4 entrées, `0` compris, quel que soit le statut.
  const todaySummary = [
    { key: "all", label: "commande", count: allPeriodsCount },
    {
      key: "express",
      label: "express",
      count: periods.find((p) => p.key === "express")?.count ?? 0,
    },
    { key: "slots", label: "créneaux", count: slotCount },
    {
      key: "surplace",
      label: "sur place",
      count: periods.find((p) => p.key === "surplace")?.count ?? 0,
    },
  ];

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
        {/* ── Statuts (tout en haut) : rendus ici et non via StickyChipsRow,
            pour un `space-between` et un badge toujours visible, `0` compris. ── */}
        <View style={styles.statusRow}>
          {(statusTabs ?? []).map((t) => {
            const active = t.key === selectedStatus;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.statusChip, active && styles.statusChipActive]}
                onPress={() => onSelectStatus?.(t.key)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.statusChipText,
                    active && styles.statusChipTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {t.label}
                </Text>
                <View
                  style={[
                    styles.statusBadge,
                    active && styles.statusBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      active && styles.statusBadgeTextActive,
                    ]}
                  >
                    {t.count ?? 0}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Modes de livraison : « Toutes les périodes » en ligne cochable,
            puis express / sur place / créneaux en 3 cards. Toujours rendus,
            même à 0. ── */}
        <View style={styles.modeList}>
          {/* <Row
            icon="layers-outline"
            label="Toutes les périodes"
            count={allPeriodsCount}
            active={allPeriods}
            onPress={onResetPeriods}
          /> */}
          <View style={styles.modeCardRow}>
            {modePeriods.map((p) => (
              <DateScopeCard
                key={p.key}
                icon={PERIOD_ICONS[p.key]}
                label={p.label}
                count={p.count}
                active={selectedPeriods.includes(p.key)}
                onPress={() => onTogglePeriod(p.key)}
              />
            ))}
            {/* 3e card : sélectionne/désélectionne TOUS les créneaux horaires.
                Ancien comportement (ouvrait le sous-sheet des créneaux), gardé
                au cas où on voudrait y revenir :
                  onPress={() => setSlotsOpen(true)}
                Le sous-sheet lui-même est toujours rendu plus bas, intact. */}
            <DateScopeCard
              icon="time-outline"
              label="Créneaux horaires"
              count={slotCount}
              active={anySlotSelected}
              onPress={() =>
                onTogglePeriods(
                  slotPeriods.map((p) => p.key),
                  !anySlotSelected,
                )
              }
            />
          </View>
        </View>

        {/* ── Dates (bas, FIXE) : une ligne de 2 cards (à venir / passées) qui
            choisit le lot, puis SOUS elles la liste des dates de ce lot. ── */}
        <View style={styles.pastBar}>
          <View style={styles.dateRow}>
            {/* Sélectionne directement le jour même (pas un lot de dates). */}
            <DateScopeCard
              icon="today-outline"
              label="cmd reçu Aujourd'hui"
              count={todayOrdersCount}
              active={dateScope === "today"}
              onPress={() => {
                onSelectDate(null);
                setDateScope("today");
              }}
            />
            <DateScopeCard
              icon="calendar-outline"
              label={"Cmd futur\nnon traitées"}
              count={futureOrdersCount}
              active={dateScope === "future"}
              onPress={() => setDateScope("future")}
            />
            <DateScopeCard
              icon="time-outline"
              // Libellé FIGÉ : il ne doit pas changer selon l'onglet de statut
              // (`pastUntreated`), au même titre que le compteur de la card.
              label="Cmd passées non traitées"
              count={pastOrdersCount}
              active={dateScope === "past"}
              onPress={() => setDateScope("past")}
            />
          </View>

          {/* Zone de dates TOUJOURS rendue (hauteur du sheet stable, même sur
              « Aujourd'hui » ou quand un lot est vide) : on complète la ligne
              par des chips « Aucune » inertes jusqu'à couvrir la largeur. */}
          <View style={styles.dateChipsSlot}>
            {dateScope === "today" ? (
              // Sur « Aujourd'hui » il n'y a pas de dates à lister : la ligne
              // affiche le récap du jour (total, express, créneaux, sur place),
              // toujours les 4, quel que soit l'onglet de statut.
              <View style={[styles.dateChipsRow, styles.dateChipsRowFill]}>
                {todaySummary.map((s) => (
                  <View
                    key={s.key}
                    style={[styles.dateChip, styles.dateChipEmpty]}
                  >
                    <Text style={styles.dateChipEmptyText} numberOfLines={1}>
                      {s.count} {s.label}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              // Liste réelle : `StickyChipsRow` (auto-scroll au clic + chip
              // actif épinglé au bord quand il sort de l'écran). Quand le lot
              // est court, on complète à sa droite par des chips « Aucune »
              // inertes, jusqu'à couvrir la largeur.
              <View style={styles.dateChipsRow}>
                {scopeDates.length > 0 && (
                  <View style={{ flexShrink: 1 }}>
                    <StickyChipsRow
                      items={scopeDates.map((d) => ({
                        key: d.iso,
                        label: d.label,
                      }))}
                      activeKey={activeDate}
                      onSelect={(iso) => onSelectDate(iso)}
                    />
                  </View>
                )}
                {Array.from({
                  length: Math.max(0, DATE_CHIP_SLOTS - scopeDates.length),
                }).map((_, i) => (
                  <View
                    key={`none_${i}`}
                    style={[styles.dateChip, styles.dateChipEmpty]}
                  >
                    <Text style={styles.dateChipEmptyText} numberOfLines={1}>
                      Aucune
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </Animated.View>

      {/* Sous-sheet des créneaux horaires (grille de tuiles multi-cochables). */}
      <Modal
        visible={slotsOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSlotsOpen(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setSlotsOpen(false)}
        />
        <View style={[styles.slotSheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.slotHeader}>
            <Text style={styles.slotTitle}>Créneaux horaires</Text>
            <TouchableOpacity onPress={() => setSlotsOpen(false)}>
              <Ionicons name="close" size={22} color="#888780" />
            </TouchableOpacity>
          </View>

          {slotPeriods.length === 0 ? (
            <Text style={styles.empty}>Aucun créneau sur cette date</Text>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
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
            </ScrollView>
          )}
        </View>
      </Modal>
    </Modal>
  );
};

/** Nb de chips occupant la ligne de dates (complétée par des « Aucune »). */
const DATE_CHIP_SLOTS = 4;

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
        <Text
          style={[styles.tileBadgeText, !active && styles.tileBadgeTextIdle]}
        >
          {count}
        </Text>
      </View>
    </View>
  </TouchableOpacity>
);

/** Card de choix du lot de dates listé en dessous (à venir / passées). */
const DateScopeCard = ({
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
    style={[styles.scopeCard, active && styles.scopeCardActive]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.scopeTop}>
      <Ionicons name={icon} size={18} color={active ? "#1A1916" : "#888780"} />
      <View style={[styles.countBadge, active && styles.countBadgeActive]}>
        <Text style={[styles.countText, active && styles.countTextActive]}>
          {count}
        </Text>
      </View>
    </View>
    <Text
      style={[styles.scopeLabel, active && styles.scopeLabelActive]}
      numberOfLines={2}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

/** Ligne cochable d'un mode de livraison (+ « Toutes les périodes »). */
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
    <View style={[styles.countBadge, active && styles.countBadgeRowActive]}>
      <Text style={[styles.countText, active && styles.countTextActive]}>
        {count}
      </Text>
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
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    // Hauteur AUTO : les créneaux vivent désormais dans leur propre sous-sheet,
    // le contenu restant est court et ne doit pas laisser d'espace vide.
    maxHeight: "80%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  // Ligne des 2 cards de lot de dates (même gabarit que l'ancienne ligne de cards).
  dateRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "stretch",
    gap: 6,
  },
  // Chips de statut du sheet : répartis sur toute la largeur.
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  statusChip: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: Theme.colors.primary + "10",
  },
  statusChipActive: { backgroundColor: Theme.colors.primary },
  statusChipText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "700",
    color: Theme.colors.primary,
  },
  statusChipTextActive: { color: "#fff" },
  // Pastille d'angle (même principe que `tileBadge` de la grille horaire) :
  // hors du flux, le texte du chip garde toute la largeur.
  // Pastille dans le flux du chip, juste après le libellé.
  statusBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E3DC",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  // Chip actif : fond primaire — le badge doit contraster DESSUS, donc blanc.
  statusBadgeActive: {
    backgroundColor: "#fff",
    borderColor: "#fff",
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#888780",
  },
  statusBadgeTextActive: { color: Theme.colors.primary },
  // Sous-sheet des créneaux horaires.
  slotSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "60%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  slotHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  slotTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1A1916",
  },
  // Emplacement de la ligne de dates : hauteur FIXE pour que le sheet ne change
  // pas de taille selon le lot sélectionné (« Aujourd'hui » n'en liste aucune).
  dateChipsSlot: {
    height: 34,
    justifyContent: "center",
  },
  dateChipsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  // Peu de dates : les chips s'étirent pour couvrir toute la largeur.
  dateChipsRowFill: {
    flexGrow: 1,
  },
  dateChip: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Theme.colors.primary + "10",
  },
  // Chip inerte (récap du jour / remplissage) : juste là pour couvrir la largeur.
  dateChipEmpty: {
    backgroundColor: Theme.colors.primary + "10",
  },
  dateChipEmptyText: {
    fontSize: 11,
    fontWeight: "700",
    color: Theme.colors.primary,
  },
  // Cards de choix du lot de dates (ligne du bas).
  scopeCard: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#EFEDE6",
    backgroundColor: "#FAF9F6",
    paddingVertical: 9,
    paddingHorizontal: 8,
    gap: 6,
    marginBottom: 8,
  },
  // Card active : pas de bordure marquée, c'est le FOND qui porte l'état.
  scopeCardActive: {
    borderColor: "transparent",
    backgroundColor: Theme.colors.primary + "1A",
  },
  scopeTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scopeLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1A1916",
    // 2 lignes réservées (minHeight, pas height : une hauteur fixe rognait la
    // descente des lettres) : les 3 cards gardent la même hauteur.
    lineHeight: 15,
    minHeight: 30,
  },
  // Liste des modes : une ligne cochable par mode.
  modeList: {
    marginTop: 14,
  },
  // Ligne des 3 cards de mode (express / sur place / créneaux).
  modeCardRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "stretch",
    gap: 6,
    marginTop: 6,
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
  // Ligne cochée : aucun fond, seuls l'icône et le texte passent en noir.
  rowActive: {},
  rowLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1916",
  },
  // Ligne cochée : libellé en primaire (seul repère, la ligne n'a pas de fond).
  rowLabelActive: {
    color: Theme.colors.primary,
  },
  // Card de dates active : reste en noir.
  scopeLabelActive: {
    color: "#1A1916",
  },
  pastBar: {
    marginTop: 4,
    paddingTop: 6,
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
    backgroundColor: "#F7F6F2",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  tileIconActive: {
    borderColor: "#1A1916",
  },
  tileBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#1A1916",
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
    backgroundColor: "#EFEDE6",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  countBadgeActive: {
    backgroundColor: Theme.colors.primary,
  },
  // Badge d'une ligne cochée : primaire, comme son icône et son libellé.
  countBadgeRowActive: {
    backgroundColor: Theme.colors.primary,
  },
  countText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#888780",
  },
  countTextActive: {
    color: "#fff",
  },
  tileHour: {
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
    color: "#1A1916",
  },
  tileLabelActive: {
    color: "#1A1916",
  },
  empty: {
    fontSize: 13,
    color: "#A8A7A2",
    fontStyle: "italic",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
});
