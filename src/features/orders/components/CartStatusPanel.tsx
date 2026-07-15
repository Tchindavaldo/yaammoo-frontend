import { ClientOrderCard } from "@/src/features/orders/components/ClientOrderCard";
import { OrderBottomSheet } from "@/src/features/orders/components/OrderBottomSheet";
import { OrderTrackingHeader } from "@/src/features/orders/components/OrderTrackingHeader";
import { useOrders } from "@/src/features/orders/hooks/useOrders";
import { useFastFoods } from "@/src/features/restaurants/hooks/useFastFoods";
import { Theme } from "@/src/theme";
import { Commande } from "@/src/types";
import { Ionicons } from "@expo/vector-icons";
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
      type: "group-header";
      key: string;
      groupId: string;
      name: string;
      orderCount: number;
      isExpanded: boolean;
    }
  | { type: "order-card"; key: string; order: Commande; isFinished: boolean }
  | {
      type: "group-subtabs";
      key: string;
      groupId: string;
      counts: { attente: number; cours: number; termine: number };
    }
  | { type: "past-section-label"; key: string }
  | {
      type: "past-date-header";
      key: string;
      iso: string;
      label: string;
      orderCount: number;
      isOpen: boolean;
    }
  | {
      type: "past-group-header";
      key: string;
      groupKey: string;
      name: string;
      orderCount: number;
      isExpanded: boolean;
    }
  | { type: "empty"; key: string };

// ---------------------------------------------------------------------------
// Sous-composants memoïsés pour la FlatList
// ---------------------------------------------------------------------------
const GroupHeader = React.memo(function GroupHeader({
  name,
  orderCount,
  isExpanded,
  onToggle,
}: {
  name: string;
  orderCount: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onToggle}
      style={styles.groupHeader}
    >
      <View style={styles.groupHeaderLeft}>
        <Ionicons
          name={isExpanded ? "chevron-down" : "chevron-forward"}
          size={12}
          color="#888780"
        />
        <Text style={styles.groupTitle} numberOfLines={1}>
          {name}
        </Text>
        <View style={styles.groupCountBadge}>
          <Text style={styles.groupCountText}>
            {orderCount} commande{orderCount > 1 ? "s" : ""}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

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

const PastDateHeader = React.memo(function PastDateHeader({
  label,
  orderCount,
  isOpen,
  onToggle,
}: {
  label: string;
  orderCount: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onToggle}
      style={styles.groupHeader}
    >
      <View style={styles.groupHeaderLeft}>
        <Ionicons
          name={isOpen ? "chevron-down" : "chevron-forward"}
          size={12}
          color="#888780"
        />
        <Text style={styles.groupTitle}>{label}</Text>
        <View style={styles.groupCountBadge}>
          <Text style={styles.groupCountText}>
            {orderCount} commande{orderCount > 1 ? "s" : ""}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
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

const formatPastDateLabel = (iso: string) => {
  try {
    const d = new Date(iso);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (isSameDay(d, yesterday)) return "Hier";
    return d.toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
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

  const [refreshing, setRefreshing] = useState(false);
  const [activeStatus, setActiveStatus] = useState(initialStatus);
  const [trackingHeaderHeight, setTrackingHeaderHeight] = useState(100);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );
  // Sous-tab de livraison actif par groupe (onglet « Terminées » uniquement).
  const [groupSubTab, setGroupSubTab] = useState<
    Record<string, "attente" | "cours" | "termine">
  >({});
  const [expandedPastSection, setExpandedPastSection] = useState<string | null>(
    null,
  );
  const [selectedOrderDetails, setSelectedOrderDetails] =
    useState<Commande | null>(null);
  const [selectedGroupOrders, setSelectedGroupOrders] = useState<Commande[]>(
    [],
  );
  const [detailVisible, setDetailVisible] = useState(false);

  // Flag pour éviter le setExpandedGroups au montage si déjà initialisé
  const hasInitializedExpand = useRef(false);

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

  // Filtre par date sélectionnée (on garde la date du jour par défaut)
  const selectedDate = useRef(new Date()).current;

  const filteredOrders = useMemo(
    () =>
      statusList.filter((o: any) => {
        const d = getOrderDate(o);
        if (!d) return isSameDay(new Date(), selectedDate);
        return isSameDay(d, selectedDate);
      }),
    [selectedDate, statusList],
  );

  const isShowingTodayDefault = useMemo(
    () =>
      isSameDay(selectedDate, new Date()) &&
      (activeStatus === "pending" || activeStatus === "active"),
    [selectedDate, activeStatus],
  );

  // Groupes par boutique (aujourd'hui)
  const groupByFastFood = useCallback(
    (orders: Commande[]) => {
      const groups: Record<
        string,
        { id: string; name: string; orders: Commande[] }
      > = {};
      orders.forEach((o) => {
        const ffId = o.fastFoodId;
        if (!ffId) return;
        if (!groups[ffId]) {
          const ff = fastFoods.find((f) => f.id === ffId);
          groups[ffId] = {
            id: ffId,
            name: ff?.nom || (ff as any)?.name || "Boutique",
            orders: [],
          };
        }
        groups[ffId].orders.push(o);
      });
      return Object.values(groups);
    },
    [fastFoods],
  );

  const groupedOrders = useMemo(
    () => groupByFastFood(filteredOrders),
    [filteredOrders, groupByFastFood],
  );

  // Initialisation : ouvrir le premier groupe au premier rendu
  useEffect(() => {
    if (
      !hasInitializedExpand.current &&
      groupedOrders.length > 0 &&
      Object.keys(expandedGroups).length === 0
    ) {
      hasInitializedExpand.current = true;
      setExpandedGroups({ [groupedOrders[0].id]: true });
    }
  }, [groupedOrders, expandedGroups]);

  // Sections des jours précédents
  const pastSections = useMemo(() => {
    if (!isShowingTodayDefault) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const byDate = new Map<string, Commande[]>();
    statusList.forEach((o: any) => {
      const d = getOrderDate(o);
      if (!d) return;
      if (d.getTime() >= today.getTime()) return;
      const iso = d.toISOString().substring(0, 10);
      if (!byDate.has(iso)) byDate.set(iso, []);
      byDate.get(iso)!.push(o);
    });
    return Array.from(byDate.entries())
      .sort(([a], [b]) => (a > b ? -1 : a < b ? 1 : 0))
      .map(([iso, orders]) => ({ iso, orders }));
  }, [isShowingTodayDefault, statusList]);

  const toggleGroup = useCallback((id: string) => {
    setExpandedGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const togglePastSection = useCallback((iso: string) => {
    setExpandedPastSection((prev) => (prev === iso ? null : iso));
  }, []);

  // Aplatissement des données → FlatList
  const flatItems: FlatItem[] = useMemo(() => {
    const items: FlatItem[] = [];
    const hasMain = groupedOrders.length > 0;
    const hasPast = pastSections.length > 0;

    if (!hasMain && !hasPast) {
      items.push({ type: "empty", key: "empty" });
      return items;
    }

    // L'onglet « Terminées » affiche des sous-tabs de livraison par groupe.
    const isDeliveryTab = activeStatus === "finished";

    // Groupes du jour
    for (const group of groupedOrders) {
      items.push({
        type: "group-header",
        key: `gh:${group.id}`,
        groupId: group.id,
        name: group.name,
        orderCount: group.orders.length,
        isExpanded: !!expandedGroups[group.id],
      });
      if (expandedGroups[group.id]) {
        if (isDeliveryTab) {
          // Répartition par statut de livraison (comme le marchand).
          const attente = group.orders.filter((o) => o.status === "finished");
          const cours = group.orders.filter((o) => o.status === "delivering");
          const termine = group.orders.filter((o) => o.status === "delivered");
          items.push({
            type: "group-subtabs",
            key: `gst:${group.id}`,
            groupId: group.id,
            counts: {
              attente: attente.length,
              cours: cours.length,
              termine: termine.length,
            },
          });
          const sub = groupSubTab[group.id] ?? "attente";
          const visible =
            sub === "cours" ? cours : sub === "termine" ? termine : attente;
          for (const order of visible) {
            items.push({
              type: "order-card",
              key: `oc:${order.id}`,
              order,
              isFinished: true,
            });
          }
        } else {
          for (const order of group.orders) {
            items.push({
              type: "order-card",
              key: `oc:${order.id}`,
              order,
              isFinished: false,
            });
          }
        }
      }
    }

    // Sections des jours précédents
    if (hasPast) {
      items.push({ type: "past-section-label", key: "past-label" });
      for (const section of pastSections) {
        const isOpen = expandedPastSection === section.iso;
        items.push({
          type: "past-date-header",
          key: `pdh:${section.iso}`,
          iso: section.iso,
          label: formatPastDateLabel(section.iso),
          orderCount: section.orders.length,
          isOpen,
        });
        if (isOpen) {
          const groups = groupByFastFood(section.orders);
          for (const group of groups) {
            const groupKey = `past_${section.iso}_${group.id}`;
            const isGroupExpanded = !!expandedGroups[groupKey];
            items.push({
              type: "past-group-header",
              key: `pgh:${groupKey}`,
              groupKey,
              name: group.name,
              orderCount: group.orders.length,
              isExpanded: isGroupExpanded,
            });
            if (isGroupExpanded) {
              for (const order of group.orders) {
                items.push({
                  type: "order-card",
                  key: `poc:${section.iso}:${order.id}`,
                  order,
                  isFinished: true,
                });
              }
            }
          }
        }
      }
    }

    return items;
  }, [
    groupedOrders,
    pastSections,
    expandedGroups,
    expandedPastSection,
    groupByFastFood,
    activeStatus,
    groupSubTab,
  ]);

  const onManualRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  // Rendu d'un item de la FlatList
  const renderItem = useCallback(
    ({ item }: { item: FlatItem }) => {
      switch (item.type) {
        case "group-header":
          return (
            <GroupHeader
              name={item.name}
              orderCount={item.orderCount}
              isExpanded={item.isExpanded}
              onToggle={() => toggleGroup(item.groupId)}
            />
          );
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
              showActions={false}
              hideRanking={item.isFinished}
              onPress={() => {
                setSelectedOrderDetails(item.order);
                setSelectedGroupOrders([]);
                setDetailVisible(true);
              }}
            />
          );
        case "past-section-label":
          return (
            <View
              style={{ marginTop: 24, marginBottom: 10, paddingHorizontal: 16 }}
            >
              <Text style={styles.pastSectionLabel}>
                Commandes des jours précédents
              </Text>
            </View>
          );
        case "past-date-header":
          return (
            <PastDateHeader
              label={item.label}
              orderCount={item.orderCount}
              isOpen={item.isOpen}
              onToggle={() => togglePastSection(item.iso)}
            />
          );
        case "past-group-header":
          return (
            <View style={{ paddingLeft: 16 }}>
              <GroupHeader
                name={item.name}
                orderCount={item.orderCount}
                isExpanded={item.isExpanded}
                onToggle={() => toggleGroup(item.groupKey)}
              />
            </View>
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
    [toggleGroup, togglePastSection, groupSubTab],
  );

  const keyExtractor = useCallback((item: FlatItem) => item.key, []);

  const statusOrderCount = filteredOrders.length;
  const statusFastFoodCount = useMemo(
    () =>
      new Set(filteredOrders.map((o: any) => o.fastFoodId).filter(Boolean))
        .size,
    [filteredOrders],
  );

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
          activeStatus={activeStatus}
          onStatusChange={setActiveStatus}
          counts={{
            pending: pending.length,
            processing: active.length,
            // Onglet « Terminées » = toutes les livraisons (finished + delivered).
            finished: finished.length + delivered.length,
            delivered: delivered.length,
          }}
          orderCount={statusOrderCount}
          fastFoodCount={statusFastFoodCount}
        />
      </View>

      {/* FlatList virtualisée */}
      <FlatList
        data={flatItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{
          paddingTop: topOffset + trackingHeaderHeight,
          paddingBottom: bottomOffset + 100,
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
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    marginBottom: 4,
  },
  groupHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  groupTitle: { fontSize: 12, fontWeight: "700", color: "#333", flex: 1 },
  groupCountBadge: {
    backgroundColor: "#FFF",
    borderWidth: 0.5,
    borderColor: "#D3C1C7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  groupCountText: { fontSize: 10, color: "#5F5E5A", fontWeight: "500" },
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
  pastSectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#888780",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
