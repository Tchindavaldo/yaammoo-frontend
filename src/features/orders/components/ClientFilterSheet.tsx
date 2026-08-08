import { ClientDateChipsRow } from "./ClientDateChipsRow";
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
import { styles } from "./ClientFilterSheet.styles";
import {
  DATE_CHIP_SLOTS,
  DateScopeCard,
  PERIOD_ICONS,
  PeriodTile,
  Row,
} from "./ClientFilterSheet.parts";

/** Date sélectionnable dans le sheet (propre au client, non partagé). */
export interface DateOption {
  iso: string;
  label: string;
}

/** Filtre période : "express", "surplace", ou un créneau horaire précis (ex. "12h"). */
export type PeriodKey = string;

interface ClientFilterSheetProps {
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
  /** Chips de statut rendus en haut du sheet, comme côté marchand. */
  statusTabs?: { key: string; label: string; count: number }[];
  selectedStatus?: string;
  onSelectStatus?: (key: string) => void;
}

/**
 * Bottom sheet de filtres des commandes CLIENT.
 *
 * Copie autonome du sheet marchand : mise en page identique (statuts en haut,
 * modes de livraison + créneaux au milieu, cards de dates en bas), mais AUCUN
 * composant ni style partagé avec `MerchantFilterSheet` — les deux écrans
 * doivent pouvoir diverger sans se casser mutuellement.
 */
export const ClientFilterSheet: React.FC<ClientFilterSheetProps> = ({
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
        {/* ── Statuts (tout en haut) : rendus ici et non via ClientDateChipsRow,
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
              // Liste réelle : `ClientDateChipsRow` (auto-scroll au clic + chip
              // actif épinglé au bord quand il sort de l'écran). Quand le lot
              // est court, on complète à sa droite par des chips « Aucune »
              // inertes, jusqu'à couvrir la largeur.
              <View style={styles.dateChipsRow}>
                {scopeDates.length > 0 && (
                  <View style={{ flexShrink: 1 }}>
                    <ClientDateChipsRow
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
