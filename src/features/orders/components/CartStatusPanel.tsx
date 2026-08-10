import { orderGroupKey } from "@/src/features/merchant/utils/orderGroupKey";
import { StickyChipsRow } from "@/src/features/driver/components/StickyChipsRow";
import { ClientFilterSheet } from "./ClientFilterSheet";
import { ClientOrderCard } from "@/src/features/orders/components/ClientOrderCard";
import { OrderBottomSheet } from "@/src/features/orders/components/OrderBottomSheet";
import {
  OrderTrackingHeader,
  type TrackedFastFood,
} from "@/src/features/orders/components/OrderTrackingHeader";
import { useOrders } from "@/src/features/orders/hooks/useOrders";
import { useFastFoods } from "@/src/features/restaurants/hooks/useFastFoods";
import { useTabBarHeight } from "@/src/hooks/useTabBarHeight";
import { Theme } from "@/src/theme";
import { Commande } from "@/src/types";
import { Ionicons } from "@expo/vector-icons";
import { AppBlurView as BlurView } from "@/src/components/AppBlurView";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ---------------------------------------------------------------------------
// Types pour la FlatList virtualisée
// ---------------------------------------------------------------------------
type FlatItem =
  | {
      type: "order-card";
      key: string;
      order: Commande;
      /** Commandes du même groupe (livraison mutualisée) — nav multi-cmd du sheet. */
      group: Commande[];
      isFinished: boolean;
    }
  | {
      type: "group-subtabs";
      key: string;
      groupId: string;
      counts: { attente: number; cours: number; termine: number };
    }
  | { type: "empty"; key: string };

// ---------------------------------------------------------------------------
// Sous-composants memoïsés pour la FlatList
// ---------------------------------------------------------------------------
/** Sous-tabs de livraison d'un groupe (onglet Terminées) : calqué marchand. */
const GroupSubTabs = React.memo(function GroupSubTabs({
  counts,
  active,
  onSelect,
}: {
  counts: { attente: number; cours: number; termine: number };
  active: "attente" | "cours" | "termine";
  onSelect: (k: "attente" | "cours" | "termine") => void;
}) {
  const tab = (
    key: "attente" | "cours" | "termine",
    label: string,
    count: number,
  ) => {
    const on = active === key;
    return (
      <TouchableOpacity
        style={[styles.subTab, on && styles.subTabActive]}
        onPress={() => onSelect(key)}
      >
        <Text style={[styles.subTabLabel, on && styles.subTabLabelActive]}>
          {label}
        </Text>
        {count > 0 && (
          <View style={[styles.subTabBadge, on && styles.subTabBadgeActive]}>
            <Text
              style={[styles.subTabBadgeText, on && styles.subTabBadgeTextActive]}
            >
              {count}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };
  return (
    <View style={styles.subTabRow}>
      {tab("attente", "En attente", counts.attente)}
      {tab("cours", "En cours", counts.cours)}
      {tab("termine", "Terminé", counts.termine)}
    </View>
  );
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const isSameDay = (d1: Date, d2: Date) =>
  d1.getFullYear() === d2.getFullYear() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getDate() === d2.getDate();

const getOrderDate = (o: any): Date | null => {
  const raw = o?.livraison?.date || o?.delivery?.date || o?.createdAt;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * Groupage des commandes en lignes, même règle que la liste marchand
 * (`orderGroupKey`) : un client, une date, un créneau/zone. La tête est la
 * commande la mieux classée ; les lignes suivent l'ordre des rangs.
 */
const groupBySlot = (arr: Commande[]): { head: Commande; group: Commande[] }[] => {
  const buckets = new Map<string, Commande[]>();
  arr.forEach((o) => {
    const key = orderGroupKey(o);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(o);
    else buckets.set(key, [o]);
  });

  const rankOf = (o: any) => o?.rank ?? Infinity;
  const entries: { head: Commande; group: Commande[] }[] = [];
  buckets.forEach((group) => {
    const sorted = [...group].sort((a, b) => rankOf(a) - rankOf(b));
    entries.push({ head: sorted[0], group: sorted });
  });
  return entries.sort((a, b) => rankOf(a.head) - rankOf(b.head));
};

/** Clé de période d'une commande : "express", "surplace" ou le créneau ("12h"). */
const periodKeyOf = (o: any): string => {
  const d = o?.delivery;
  if (d?.status !== true) return "surplace";
  if (d?.type === "express") return "express";
  return d?.time || "À définir";
};

/** ISO (YYYY-MM-DD) de la date de livraison d'une commande. */
const getOrderDateISO = (o: any): string => {
  const d = getOrderDate(o);
  return d ? d.toISOString().substring(0, 10) : "";
};

/** Libellé d'un chip de date : « 10 juin ». */
const formatDateLabel = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
    });
  } catch {
    return iso;
  }
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface CartStatusPanelProps {
  topOffset?: number;
  bottomOffset?: number;
  initialStatus?: "pending" | "active" | "finished" | "delivered";
}

// ---------------------------------------------------------------------------
// Composant principal
// ---------------------------------------------------------------------------
export const CartStatusPanel: React.FC<CartStatusPanelProps> = ({
  topOffset = 0,
  bottomOffset = 0,
  initialStatus = "pending",
}) => {
  const { pending, active, finished, delivered, refresh } = useOrders();
  const { fastFoods } = useFastFoods();
  const tabBarHeight = useTabBarHeight();

  const [refreshing, setRefreshing] = useState(false);
  const [activeStatus, setActiveStatus] = useState(initialStatus);
  // Filtre fastfood piloté par la liste horizontale du header (null = tous).
  const [selectedFastFoodId, setSelectedFastFoodId] = useState<string | null>(
    null,
  );
  const [trackingHeaderHeight, setTrackingHeaderHeight] = useState(100);
  // Filtres du bottom sheet : date active (null = aujourd'hui) + périodes.
  const [selectedDateISO, setSelectedDateISO] = useState<string | null>(null);
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  // Sous-tab de livraison actif par groupe (onglet « Terminées » uniquement).
  const [groupSubTab, setGroupSubTab] = useState<
    Record<string, "attente" | "cours" | "termine">
  >({});
  const [selectedOrderDetails, setSelectedOrderDetails] =
    useState<Commande | null>(null);
  const [selectedGroupOrders, setSelectedGroupOrders] = useState<Commande[]>(
    [],
  );
  const [detailVisible, setDetailVisible] = useState(false);

  // Liste courante selon l'onglet actif
  const statusList: Commande[] = useMemo(() => {
    switch (activeStatus) {
      case "pending":
        return pending;
      case "active":
        return active;
      case "finished":
        // Onglet « Terminées » = TOUTES les commandes de livraison, comme le
        // marchand. Les 3 statuts (finished/delivering/delivered) sont ensuite
        // répartis dans les sous-tabs En attente / En cours / Terminé du groupe.
        return [...finished, ...delivered];
      case "delivered":
        return delivered;
      default:
        return [];
    }
  }, [activeStatus, pending, active, finished, delivered]);

  // Date active : `null` = aujourd'hui. Pilotée par le ClientFilterSheet.
  const todayISO = new Date().toISOString().substring(0, 10);
  const activeDateISO = selectedDateISO || todayISO;

  /**
   * Fastfoods de la liste horizontale — indépendants de l'onglet de statut
   * (la liste ne doit pas disparaître quand on change de chip) et de la date.
   * Les pastilles, elles, comptent les commandes de la DATE sélectionnée par
   * statut : en attente / en cours / terminées.
   */
  const trackedFastFoods = useMemo(() => {
    const all = [...pending, ...active, ...finished, ...delivered];
    const map = new Map<string, TrackedFastFood>();
    all.forEach((o: any) => {
      const ffId = o.fastFoodId;
      if (!ffId) return;
      let entry: TrackedFastFood | undefined = map.get(ffId);
      if (!entry) {
        const ff: any = fastFoods.find((f) => f.id === ffId);
        entry = {
          id: ffId,
          name: ff?.nom || ff?.name || "Boutique",
          // `image` est déjà normalisé (photo du fastfood, sinon 1er plat).
          image: ff?.image || ff?.logo || ff?.coverImage,
          orderCount: 0,
          counts: { pending: 0, active: 0, finished: 0 },
        };
        map.set(ffId, entry);
      }
      entry!.orderCount += 1;
      // Pastilles : uniquement les commandes de la date sélectionnée.
      if (getOrderDateISO(o) !== activeDateISO) return;
      const st = (o.status || "").toLowerCase();
      if (st === "pending") entry!.counts.pending += 1;
      else if (["processing", "active", "in_progress"].includes(st))
        entry!.counts.active += 1;
      else if (["finished", "delivering", "delivered"].includes(st))
        entry!.counts.finished += 1;
    });
    return Array.from(map.values());
  }, [pending, active, finished, delivered, fastFoods, activeDateISO]);

  // Sélection obligatoire : par défaut le premier fastfood de la liste. On
  // re-sélectionne aussi si le fastfood courant disparaît (changement d'onglet).
  useEffect(() => {
    if (trackedFastFoods.length === 0) return;
    if (
      selectedFastFoodId &&
      trackedFastFoods.some((f) => f.id === selectedFastFoodId)
    )
      return;
    setSelectedFastFoodId(trackedFastFoods[0].id);
  }, [trackedFastFoods, selectedFastFoodId]);

  const selectedDate = useMemo(
    () => new Date(`${activeDateISO}T12:00:00`),
    [activeDateISO],
  );

  const filteredOrders = useMemo(
    () =>
      statusList.filter((o: any) => {
        if (selectedFastFoodId && o.fastFoodId !== selectedFastFoodId)
          return false;
        const d = getOrderDate(o);
        if (!d) return isSameDay(new Date(), selectedDate);
        if (!isSameDay(d, selectedDate)) return false;
        // Multi-sélection : vide = toutes les périodes.
        return (
          selectedPeriods.length === 0 || selectedPeriods.includes(periodKeyOf(o))
        );
      }),
    [selectedDate, statusList, selectedFastFoodId, selectedPeriods],
  );

  // Aplatissement des données → FlatList
  const flatItems: FlatItem[] = useMemo(() => {
    const items: FlatItem[] = [];
    if (filteredOrders.length === 0) {
      items.push({ type: "empty", key: "empty" });
      return items;
    }

    // L'onglet « Terminées » affiche des sous-tabs de livraison par groupe.
    const isDeliveryTab = activeStatus === "finished";

    // Commandes du jour à plat : le filtrage par fastfood se fait via la
    // liste horizontale du header, plus d'accordéon par boutique.
    if (isDeliveryTab) {
      const attente = filteredOrders.filter((o) => o.status === "finished");
      const cours = filteredOrders.filter((o) => o.status === "delivering");
      const termine = filteredOrders.filter((o) => o.status === "delivered");
      items.push({
        type: "group-subtabs",
        key: "gst:all",
        groupId: "all",
        counts: {
          attente: attente.length,
          cours: cours.length,
          termine: termine.length,
        },
      });
      const sub = groupSubTab["all"] ?? "attente";
      const visible =
        sub === "cours" ? cours : sub === "termine" ? termine : attente;
      for (const { head, group } of groupBySlot(visible)) {
        items.push({
          type: "order-card",
          key: `oc:${head.id}`,
          order: head,
          group,
          isFinished: true,
        });
      }
    } else {
      for (const { head, group } of groupBySlot(filteredOrders)) {
        items.push({
          type: "order-card",
          key: `oc:${head.id}`,
          order: head,
          group,
          isFinished: false,
        });
      }
    }

    return items;
  }, [filteredOrders, activeStatus, groupSubTab]);

  const onManualRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  // Rendu d'un item de la FlatList
  const renderItem = useCallback(
    ({ item }: { item: FlatItem }) => {
      switch (item.type) {
        case "group-subtabs":
          return (
            <GroupSubTabs
              counts={item.counts}
              active={groupSubTab[item.groupId] ?? "attente"}
              onSelect={(k) =>
                setGroupSubTab((prev) => ({ ...prev, [item.groupId]: k }))
              }
            />
          );
        case "order-card":
          return (
            <ClientOrderCard
              order={item.order}
              // Ligne groupée : le libellé « N cmd », le montant général et les
              // compteurs des chips portent sur tout le groupe (règle marchand).
              // Le design de la carte, lui, reste le design standard.
              sheetOrders={item.group}
              showActions={false}
              hideRanking={item.isFinished}
              onPress={() => {
                setSelectedOrderDetails(item.order);
                // Le groupe part au seul bottom sheet (nav multi-cmd) : la
                // carte de la liste garde son design standard.
                setSelectedGroupOrders(item.group);
                setDetailVisible(true);
              }}
            />
          );
        case "empty":
          return (
            <View style={[styles.centered, { paddingTop: 100 }]}>
              <Ionicons
                name="receipt-outline"
                size={60}
                color={Theme.colors.gray[200]}
              />
              <Text style={styles.emptyText}>
                Aucune commande pour cette date
              </Text>
            </View>
          );
        default:
          return null;
      }
    },
    [groupSubTab, fastFoods],
  );

  const keyExtractor = useCallback((item: FlatItem) => item.key, []);

  // ── Options du bottom sheet de filtres (calqué marchand) ──
  /** Commandes du statut actif, filtrées sur le fastfood sélectionné. */
  const scopedOrders = useMemo(
    () =>
      statusList.filter(
        (o: any) => !selectedFastFoodId || o.fastFoodId === selectedFastFoodId,
      ),
    [statusList, selectedFastFoodId],
  );

  const { futureDateOptions, pastDateOptions } = useMemo(() => {
    const isos = [...new Set(scopedOrders.map(getOrderDateISO))].filter(Boolean);
    const toOptions = (list: string[]) =>
      list.map((iso) => ({ iso, label: formatDateLabel(iso) }));
    return {
      futureDateOptions: toOptions(isos.filter((d) => d > todayISO).sort()),
      pastDateOptions: toOptions(
        isos.filter((d) => d < todayISO).sort().reverse(),
      ),
    };
  }, [scopedOrders, todayISO]);

  /** Périodes de la date active, avec leur nombre de commandes. */
  const availablePeriods = useMemo(() => {
    const counts: Record<string, number> = {};
    scopedOrders.forEach((o: any) => {
      if (getOrderDateISO(o) !== activeDateISO) return;
      const k = periodKeyOf(o);
      counts[k] = (counts[k] || 0) + 1;
    });
    const slots = Object.keys(counts)
      .filter((k) => k !== "express" && k !== "surplace")
      .sort();
    // Les deux modes de livraison sont TOUJOURS listés (0 si aucune commande)
    // et dans le MÊME ORDRE que côté marchand : express, sur place, créneaux.
    // Sinon les cards apparaissent/disparaissent au changement de date.
    return [
      {
        key: "express",
        label: "Livraison express",
        count: counts.express || 0,
      },
      {
        key: "surplace",
        label: "Récupérer\nsur place",
        count: counts.surplace || 0,
      },
      ...slots.map((k) => ({ key: k, label: k, count: counts[k] })),
    ];
  }, [scopedOrders, activeDateISO]);

  const allPeriodsCount = useMemo(
    () => availablePeriods.reduce((acc, p) => acc + p.count, 0),
    [availablePeriods],
  );

  // Badges des cards de dates du filter sheet : NOMBRE DE COMMANDES du lot
  // (dates futures / aujourd'hui / dates passées), pas le nombre de dates.
  // Volontairement INDÉPENDANTS de l'onglet de statut ET des périodes cochées :
  // chaque card affiche toujours le total de SA période.
  const dateScopeCounts = useMemo(() => {
    const all = [...pending, ...active, ...finished, ...delivered];
    let past = 0;
    let today = 0;
    let future = 0;
    all.forEach((o: any) => {
      if (selectedFastFoodId && o.fastFoodId !== selectedFastFoodId) return;
      const iso = getOrderDateISO(o);
      if (!iso) return;
      if (iso < todayISO) past += 1;
      else if (iso > todayISO) future += 1;
      else today += 1;
    });
    return { past, today, future };
  }, [
    pending,
    active,
    finished,
    delivered,
    selectedFastFoodId,
    todayISO,
  ]);

  /**
   * Badges des chips : comptés sur la date active (+ périodes cochées et
   * fastfood sélectionné), pas sur le total tous jours confondus.
   */
  const chipCounts = useMemo(() => {
    const matches = (list: Commande[]) =>
      list.filter((o: any) => {
        if (selectedFastFoodId && o.fastFoodId !== selectedFastFoodId)
          return false;
        // TOUTES périodes confondues : indépendant de `selectedPeriods`, comme
        // les chips de statut du sheet marchand.
        return getOrderDateISO(o) === activeDateISO;
      }).length;
    return {
      pending: matches(pending),
      active: matches(active),
      finished: matches([...finished, ...delivered]),
    };
  }, [
    pending,
    active,
    finished,
    delivered,
    selectedFastFoodId,
    activeDateISO,
  ]);

  // Une période cochée qui disparaît (changement de date/statut) est retirée.
  const periodsKey = availablePeriods.map((p) => p.key).join(",");
  useEffect(() => {
    setSelectedPeriods((prev) => {
      const keys = periodsKey ? periodsKey.split(",") : [];
      const next = prev.filter((p) => keys.includes(p));
      return next.length === prev.length ? prev : next;
    });
  }, [periodsKey]);


  return (
    <View style={{ flex: 1 }}>
      {/* Tracking header — position absolue */}
      <View
        style={{
          position: "absolute",
          top: topOffset,
          left: 0,
          right: 0,
          zIndex: 999,
        }}
        onLayout={(e) => setTrackingHeaderHeight(e.nativeEvent.layout.height)}
      >
        <OrderTrackingHeader
          fastFoods={trackedFastFoods}
          selectedFastFoodId={selectedFastFoodId}
          onFastFoodPress={setSelectedFastFoodId}
        />
      </View>

      {/* FlatList virtualisée */}
      <FlatList
        data={flatItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{
          paddingTop: topOffset + trackingHeaderHeight,
          // Réserve la navbar + la barre de filtres du bas.
          paddingBottom: tabBarHeight + bottomOffset + 80,
        }}
        scrollIndicatorInsets={{ top: topOffset + trackingHeaderHeight }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onManualRefresh}
            progressViewOffset={topOffset + trackingHeaderHeight}
            tintColor={Theme.colors.primary}
            colors={[Theme.colors.primary]}
          />
        }
        removeClippedSubviews
        maxToRenderPerBatch={20}
        windowSize={7}
        initialNumToRender={12}
      />

      {/* Barre de filtres en BAS (design partagé avec la page marchand). */}
      <View style={[styles.bottomBar, { bottom: tabBarHeight }]}>
        <BlurView
          intensity={40}
          tint="light"
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={{ flex: 1 }}>
          <StickyChipsRow
            items={[
              { key: "pending", label: "En Attente", count: chipCounts.pending },
              { key: "active", label: "En cours", count: chipCounts.active },
              {
                key: "finished",
                label: "Terminées",
                count: chipCounts.finished,
              },
            ]}
            activeKey={activeStatus}
            // La date choisie est conservée d'un statut à l'autre.
            onSelect={(k) => setActiveStatus(k as any)}
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

      <ClientFilterSheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        todayISO={todayISO}
        futureDates={futureDateOptions}
        pastDates={pastDateOptions}
        selectedDate={selectedDateISO}
        onSelectDate={setSelectedDateISO}
        periods={availablePeriods}
        allPeriodsCount={allPeriodsCount}
        todayOrdersCount={dateScopeCounts.today}
        futureOrdersCount={dateScopeCounts.future}
        pastOrdersCount={dateScopeCounts.past}
        selectedPeriods={selectedPeriods}
        onTogglePeriod={(k) =>
          setSelectedPeriods((prev) =>
            prev.includes(k) ? prev.filter((p) => p !== k) : [...prev, k],
          )
        }
        onTogglePeriods={(keys, select) =>
          setSelectedPeriods((prev) => {
            const rest = prev.filter((p) => !keys.includes(p));
            return select ? [...rest, ...keys] : rest;
          })
        }
        onResetPeriods={() => setSelectedPeriods([])}
        pastUntreated={activeStatus !== "finished"}
        // Statuts rendus DANS le sheet, comme côté marchand.
        statusTabs={[
          { key: "pending", label: "En Attente", count: chipCounts.pending },
          { key: "active", label: "En cours", count: chipCounts.active },
          { key: "finished", label: "Terminées", count: chipCounts.finished },
        ]}
        selectedStatus={activeStatus}
        onSelectStatus={(k) => setActiveStatus(k as any)}
      />

      {/* Bottom sheet détail commande */}
      <OrderBottomSheet
        isVisible={detailVisible}
        onClose={() => {
          setDetailVisible(false);
          setSelectedOrderDetails(null);
          setSelectedGroupOrders([]);
        }}
        order={selectedOrderDetails}
        allOrders={
          selectedGroupOrders.length > 0 ? selectedGroupOrders : undefined
        }
        boutique={
          selectedOrderDetails
            ? fastFoods.find((f) => f.id === selectedOrderDetails.fastFoodId)
            : undefined
        }
      />
    </View>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  // Barre de filtres du bas : chips de statut + bouton du bottom sheet.
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    // Voile clair par-dessus le blur : lisible sans masquer le scroll derrière.
    backgroundColor: "rgba(255,255,255,0.55)",
    overflow: "hidden",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    gap: 10,
  },
  filterBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyText: {
    marginTop: 10,
    color: Theme.colors.gray[400],
    fontSize: 16,
    textAlign: "center",
  },
  // Sous-tabs de livraison (onglet Terminées) — calqué sur le marchand.
  subTabRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: "#F5F4F0",
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  subTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
  },
  subTabActive: {
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  subTabLabel: { fontSize: 11, fontWeight: "600", color: "#888780" },
  subTabLabelActive: { color: "#1A1916" },
  subTabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#E5E4DF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  subTabBadgeActive: { backgroundColor: Theme.colors.primary },
  subTabBadgeText: { fontSize: 9, fontWeight: "700", color: "#5F5E5A" },
  subTabBadgeTextActive: { color: "white" },
});
