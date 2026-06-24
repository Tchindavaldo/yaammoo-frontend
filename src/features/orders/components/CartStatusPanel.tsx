import React, { useState, useMemo } from "react";
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Commande } from "@/src/types";
import { useOrders } from "@/src/features/orders/hooks/useOrders";
import { ClientOrderCard } from "@/src/features/orders/components/ClientOrderCard";
import { OrderTrackingHeader } from "@/src/features/orders/components/OrderTrackingHeader";
import { OrderBottomSheet } from "@/src/features/orders/components/OrderBottomSheet";
import { useFastFoods } from "@/src/features/restaurants/hooks/useFastFoods";
import { Theme } from "@/src/theme";

interface CartStatusPanelProps {
  /** Décalage haut (hauteur du header parent) : la liste scrolle dessous. */
  topOffset?: number;
  /** Décalage bas (tab bar). */
  bottomOffset?: number;
  /** Statut initial à afficher (deep-link). */
  initialStatus?: "pending" | "active" | "finished" | "delivered";
}

/**
 * Panneau « État des commandes » (suivi/tracking), extrait de cart.tsx pour être
 * réutilisé depuis Settings (UserOrdersModal). Autonome : lit useOrders +
 * useFastFoods. Gère le filtre par statut, par date, les groupes par boutique,
 * les sections des jours précédents et le détail (OrderBottomSheet).
 */
export const CartStatusPanel: React.FC<CartStatusPanelProps> = ({
  topOffset = 0,
  bottomOffset = 0,
  initialStatus = "pending",
}) => {
  const { pending, active, finished, delivered, refresh } = useOrders();
  const { fastFoods } = useFastFoods();

  const [refreshing, setRefreshing] = useState(false);
  const [activeStatus, setActiveStatus] = useState(initialStatus);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [trackingHeaderHeight, setTrackingHeaderHeight] = useState(100);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedPastSection, setExpandedPastSection] = useState<string | null>(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Commande | null>(null);
  const [selectedGroupOrders, setSelectedGroupOrders] = useState<Commande[]>([]);
  const [detailVisible, setDetailVisible] = useState(false);

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

  const statusList: Commande[] = useMemo(() => {
    switch (activeStatus) {
      case "pending": return pending;
      case "active": return active;
      case "finished": return finished;
      case "delivered": return delivered;
      default: return [];
    }
  }, [activeStatus, pending, active, finished, delivered]);

  const filteredOrders = useMemo(
    () =>
      statusList.filter((o: any) => {
        const d = getOrderDate(o);
        if (!d) return isSameDay(new Date(), selectedDate);
        return isSameDay(d, selectedDate);
      }),
    [selectedDate, statusList],
  );

  const statusOrderCount = filteredOrders.length;
  const statusFastFoodCount = useMemo(
    () => new Set(filteredOrders.map((o: any) => o.fastFoodId).filter(Boolean)).size,
    [filteredOrders],
  );

  const isShowingTodayDefault = useMemo(
    () =>
      isSameDay(selectedDate, new Date()) &&
      (activeStatus === "pending" || activeStatus === "active"),
    [selectedDate, activeStatus],
  );

  const pastSections = useMemo(() => {
    if (!isShowingTodayDefault) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const byDate = new Map<string, Commande[]>();
    statusList.forEach((o: any) => {
      const d = getOrderDate(o);
      if (!d) return;
      if (d.getTime() >= today.getTime()) return;
      const key = d.toISOString().substring(0, 10);
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key)!.push(o);
    });
    return Array.from(byDate.entries())
      .sort(([a], [b]) => (a > b ? -1 : a < b ? 1 : 0))
      .map(([iso, orders]) => ({ iso, orders }));
  }, [isShowingTodayDefault, statusList]);

  const formatPastDateLabel = (iso: string) => {
    try {
      const d = new Date(iso);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (isSameDay(d, yesterday)) return "Hier";
      return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
    } catch {
      return iso;
    }
  };

  const toggleGroup = (id: string) =>
    setExpandedGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  const togglePastSection = (iso: string) =>
    setExpandedPastSection((prev) => (prev === iso ? null : iso));

  const groupByFastFood = (orders: Commande[]) => {
    const groups: Record<string, { name: string; orders: Commande[] }> = {};
    orders.forEach((o) => {
      const ffId = o.fastFoodId;
      if (!ffId) return;
      if (!groups[ffId]) {
        const ff = fastFoods.find((f) => f.id === ffId);
        groups[ffId] = { name: ff?.nom || (ff as any)?.name || "Boutique", orders: [] };
      }
      groups[ffId].orders.push(o);
    });
    return Object.entries(groups).map(([id, data]) => ({ id, ...data }));
  };

  const groupedOrders = useMemo(() => {
    const result = groupByFastFood(filteredOrders);
    if (result.length > 0 && Object.keys(expandedGroups).length === 0) {
      setExpandedGroups({ [result[0].id]: true });
    }
    return result;
  }, [filteredOrders, fastFoods]);

  const onManualRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const renderFastFoodGroup = (
    group: { id: string; name: string; orders: Commande[] },
    keyPrefix = "",
  ) => {
    const groupKey = `${keyPrefix}${group.id}`;
    const isExpanded = !!expandedGroups[groupKey];
    return (
      <View key={groupKey} style={{ marginBottom: 15 }}>
        <TouchableOpacity activeOpacity={0.7} onPress={() => toggleGroup(groupKey)} style={styles.groupHeader}>
          <View style={styles.groupHeaderLeft}>
            <Ionicons name={isExpanded ? "chevron-down" : "chevron-forward"} size={12} color="#888780" />
            <Text style={styles.groupTitle} numberOfLines={1}>{group.name}</Text>
            <View style={styles.groupCountBadge}>
              <Text style={styles.groupCountText}>
                {group.orders.length} commande{group.orders.length > 1 ? "s" : ""}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
        {isExpanded && (
          <View style={{ gap: 2 }}>
            {group.orders.map((order) => {
              const isFinished = order.status === "finished" || order.status === "delivered";
              return (
                <ClientOrderCard
                  key={order.id}
                  order={order}
                  showActions={false}
                  hideRanking={isFinished}
                  onPress={() => {
                    setSelectedOrderDetails(order);
                    setSelectedGroupOrders(group.orders);
                    setDetailVisible(true);
                  }}
                />
              );
            })}
          </View>
        )}
      </View>
    );
  };

  const hasMain = groupedOrders.length > 0;
  const hasPast = pastSections.length > 0;

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{ position: "absolute", top: topOffset, left: 0, right: 0, zIndex: 999 }}
        onLayout={(e) => setTrackingHeaderHeight(e.nativeEvent.layout.height)}
      >
        <OrderTrackingHeader
          activeStatus={activeStatus}
          onStatusChange={setActiveStatus}
          counts={{
            pending: pending.length,
            processing: active.length,
            finished: finished.length,
            delivered: delivered.length,
          }}
          orderCount={statusOrderCount}
          fastFoodCount={statusFastFoodCount}
        />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: topOffset + trackingHeaderHeight, paddingBottom: bottomOffset + 100 },
        ]}
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
      >
        {!hasMain && !hasPast ? (
          <View style={[styles.centered, { paddingTop: 100 }]}>
            <Ionicons name="receipt-outline" size={60} color={Theme.colors.gray[200]} />
            <Text style={styles.emptyText}>Aucune commande pour cette date</Text>
          </View>
        ) : (
          <View>
            {hasMain ? (
              groupedOrders.map((g) => renderFastFoodGroup(g))
            ) : !hasPast ? (
              <View style={[styles.centered, { paddingTop: 40, paddingBottom: 20 }]}>
                <Ionicons name="receipt-outline" size={50} color={Theme.colors.gray[200]} />
                <Text style={styles.emptyText}>Aucune commande pour aujourd'hui</Text>
              </View>
            ) : null}

            {hasPast && (
              <View style={{ marginTop: 24 }}>
                <Text style={styles.pastSectionLabel}>Commandes des jours précédents</Text>
                {pastSections.map((section) => {
                  const sectionKey = `past_${section.iso}`;
                  const isOpen = expandedPastSection === section.iso;
                  const groups = groupByFastFood(section.orders);
                  return (
                    <View key={sectionKey} style={{ marginBottom: 15 }}>
                      <TouchableOpacity activeOpacity={0.7} onPress={() => togglePastSection(section.iso)} style={styles.groupHeader}>
                        <View style={styles.groupHeaderLeft}>
                          <Ionicons name={isOpen ? "chevron-down" : "chevron-forward"} size={12} color="#888780" />
                          <Text style={styles.groupTitle}>{formatPastDateLabel(section.iso)}</Text>
                          <View style={styles.groupCountBadge}>
                            <Text style={styles.groupCountText}>
                              {section.orders.length} commande{section.orders.length > 1 ? "s" : ""}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                      {isOpen && (
                        <View style={{ marginTop: 6 }}>
                          {groups.map((g) => renderFastFoodGroup(g, `${sectionKey}_`))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <OrderBottomSheet
        isVisible={detailVisible}
        onClose={() => {
          setDetailVisible(false);
          setSelectedOrderDetails(null);
          setSelectedGroupOrders([]);
        }}
        order={selectedOrderDetails}
        allOrders={selectedGroupOrders}
        boutique={fastFoods.find((f) => f.id === selectedOrderDetails?.fastFoodId)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  listContent: { paddingVertical: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40, gap: 12 },
  emptyText: { marginTop: 10, color: Theme.colors.gray[400], fontSize: 16, textAlign: "center" },
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
    borderColor: "#D3D1C7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  groupCountText: { fontSize: 10, color: "#5F5E5A", fontWeight: "500" },
  pastSectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#888780",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
    paddingHorizontal: 16,
  },
});
