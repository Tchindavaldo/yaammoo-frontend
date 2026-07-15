import { Theme } from "@/src/theme";
import { Commande } from "@/src/types";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DriverOrderCard } from "./DriverOrderCard";
import { GroupStatusCounts } from "./GroupStatusCounts";

// Espace réservé en bas : navbar (tabs) + barre de chips « boutique » de la modal.
const TAB_BAR_HEIGHT = 58 + 64;

export interface DateOption {
  iso: string;
  label: string;
}

interface DriverOrderPanelProps {
  orders: Commande[];
  loading: boolean;
  onRefresh: () => void;
  onUpdateStatus: (orderId: string, status: string) => Promise<void | boolean>;
  selectedDate: string | null;
  onSelectDate: (iso: string | null) => void;
  onDatesChange?: (dates: DateOption[]) => void;
  topOffset?: number;
  /** Filtre par boutique (fastFoodId) ; null = toutes. Multi-fastfood. */
  storeFilter?: string | null;
  /** Filtre période : "express", un créneau ("12h"), ou null = toutes. */
  periodFilter?: string | null;
}

/**
 * Panel LIVREUR — calqué sur la vue "Terminées" du marchand (groupes
 * Express / créneaux horaires + sous-tabs En attente / En cours), mais avec
 * ses propres composants (`DriverOrderCard`) et ses propres actions
 * (Lancer / Terminer). Le livreur ne voit QUE les commandes déléguées.
 */
export const DriverOrderPanel: React.FC<DriverOrderPanelProps> = ({
  orders,
  loading,
  onRefresh,
  onUpdateStatus,
  selectedDate,
  onSelectDate,
  onDatesChange,
  topOffset = 0,
  storeFilter = null,
  periodFilter = null,
}) => {
  const insets = useSafeAreaInsets();
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>("express");
  const [groupSubTab, setGroupSubTab] = useState<
    Record<string, "en_attente" | "en_cours" | "termine">
  >({});

  const toggleGroup = (groupId: string) => {
    setExpandedGroupId((prev) => (prev === groupId ? null : groupId));
  };

  const getOrderDateISO = (order: Commande): string => {
    const dateStr = order.delivery?.date || order.createdAt || "";
    if (!dateStr) return new Date().toISOString().substring(0, 10);
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return new Date().toISOString().substring(0, 10);
      return d.toISOString().substring(0, 10);
    } catch {
      return new Date().toISOString().substring(0, 10);
    }
  };

  const todayISO = new Date().toISOString().substring(0, 10);

  const formatDateLabel = (iso: string): string => {
    try {
      return new Date(iso).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
      });
    } catch {
      return iso;
    }
  };

  // Les 3 statuts EXACTS du cycle livreur :
  //  finished = à livrer (En attente) · delivering = En cours · delivered = Terminé
  const relevantStatuses = ["finished", "delivering", "delivered"];
  const matchesPeriod = (o: Commande): boolean => {
    if (!periodFilter) return true;
    const d = (o as any).delivery;
    if (periodFilter === "express") return d?.type === "express";
    // Créneau précis : compare au slot dérivé (même logique que le groupement).
    const slot = d?.type === "express" ? "express" : d?.time || d?.hour || "À définir";
    return slot === periodFilter;
  };

  const filteredOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          relevantStatuses.includes(o.status) &&
          (!storeFilter || o.fastFoodId === storeFilter) &&
          matchesPeriod(o),
      ),
    [orders, storeFilter, periodFilter],
  );

  const availableDateISOs = useMemo(
    () => [...new Set(filteredOrders.map(getOrderDateISO))],
    [filteredOrders],
  );

  const sortedDateISOs = useMemo(() => {
    const futures = availableDateISOs.filter((d) => d > todayISO).sort();
    const past = availableDateISOs
      .filter((d) => d < todayISO)
      .sort()
      .reverse();
    const hasToday = availableDateISOs.includes(todayISO);
    return [...futures, ...(hasToday ? [todayISO] : []), ...past];
  }, [availableDateISOs]);

  const datesKey = sortedDateISOs.join(",");
  useEffect(() => {
    onDatesChange?.(
      sortedDateISOs.map((iso) => ({ iso, label: formatDateLabel(iso) })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datesKey]);

  const dateFilteredOrders = useMemo(() => {
    const isoFilter = selectedDate || todayISO;
    return filteredOrders.filter((o) => getOrderDateISO(o) === isoFilter);
  }, [filteredOrders, selectedDate]);

  // Groupement Express / créneaux (les commandes sans livraison sont ignorées :
  // le livreur ne livre que des commandes avec livraison).
  const deliveryData = useMemo(() => {
    const express: Commande[] = [];
    const scheduled: Record<string, Commande[]> = {};

    dateFilteredOrders.forEach((o) => {
      const d = (o as any).delivery;
      if (d?.status !== true) return;
      if (d?.type === "express") {
        express.push(o);
      } else {
        const slot = d?.time || d?.hour || "À définir";
        if (!scheduled[slot]) scheduled[slot] = [];
        scheduled[slot].push(o);
      }
    });

    const groupByUser = (arr: Commande[]): Commande[][] => {
      const map: Record<string, Commande[]> = {};
      arr.forEach((o) => {
        const key =
          o.userId || o.userData?.email || o.id || `anon_${Math.random()}`;
        if (!map[key]) map[key] = [];
        map[key].push(o);
      });
      return Object.values(map);
    };

    return {
      expressGroups: groupByUser(express),
      slots: Object.entries(scheduled).map(([slot, ords]) => ({
        title: slot,
        userGroups: groupByUser(ords),
      })),
    };
  }, [dateFilteredOrders]);

  const renderUserGroup = (group: Commande[]) => (
    <DriverOrderCard
      key={group[0].id}
      order={group[0]}
      allOrders={group}
      onUpdateStatus={async (status) => {
        await Promise.all(group.map((o) => onUpdateStatus(o.id, status)));
      }}
    />
  );

  const renderGroupWithSubTabs = (userGroups: Commande[][], groupId: string) => {
    const activeSubTab = groupSubTab[groupId] ?? "en_attente";
    const allGroupOrders = userGroups.flat();
    // Aligné sur le marchand ("Terminées") :
    //  - En attente : prête à livrer, pas encore lancée (`finished`)
    //  - En cours   : course lancée (`delivering`)
    //  - Terminé    : livrée (`delivered`)
    const enAttenteOrders = allGroupOrders.filter((o) => o.status === "finished");
    const enCoursOrders = allGroupOrders.filter((o) => o.status === "delivering");
    const termineOrders = allGroupOrders.filter((o) => o.status === "delivered");

    const groupByUser = (arr: Commande[]): Commande[][] => {
      const map: Record<string, Commande[]> = {};
      arr.forEach((o) => {
        const key =
          o.userId || o.userData?.email || o.id || `anon_${Math.random()}`;
        if (!map[key]) map[key] = [];
        map[key].push(o);
      });
      return Object.values(map);
    };

    const enAttenteGroups = groupByUser(enAttenteOrders);
    const enCoursGroups = groupByUser(enCoursOrders);
    const termineGroups = groupByUser(termineOrders);
    const activeGroups =
      activeSubTab === "en_cours"
        ? enCoursGroups
        : activeSubTab === "termine"
          ? termineGroups
          : enAttenteGroups;

    const renderSubTab = (
      key: "en_attente" | "en_cours" | "termine",
      label: string,
      count: number,
    ) => {
      const active = activeSubTab === key;
      return (
        <TouchableOpacity
          style={[styles.subTab, active && styles.subTabActive]}
          onPress={() => setGroupSubTab((prev) => ({ ...prev, [groupId]: key }))}
        >
          <Text style={[styles.subTabLabel, active && styles.subTabLabelActive]}>
            {label}
          </Text>
          {count > 0 && (
            <View style={[styles.subTabBadge, active && styles.subTabBadgeActive]}>
              <Text
                style={[
                  styles.subTabBadgeText,
                  active && styles.subTabBadgeTextActive,
                ]}
              >
                {count}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      );
    };

    return (
      <View style={{ marginTop: 4 }}>
        <View style={styles.subTabRow}>
          {renderSubTab("en_attente", "En attente", enAttenteOrders.length)}
          {renderSubTab("en_cours", "En cours", enCoursOrders.length)}
          {renderSubTab("termine", "Terminé", termineOrders.length)}
        </View>

        {activeGroups.length === 0 ? (
          <View style={styles.subTabEmpty}>
            <Text style={styles.subTabEmptyText}>
              {activeSubTab === "en_cours"
                ? "Aucune livraison en cours"
                : activeSubTab === "termine"
                  ? "Aucune livraison terminée"
                  : "Aucune commande en attente"}
            </Text>
          </View>
        ) : (
          <View style={{ gap: 6, marginTop: 6 }}>
            {activeGroups.map((group) => renderUserGroup(group))}
          </View>
        )}
      </View>
    );
  };

  const listTopPad = topOffset;
  const listPadBottom = insets.bottom + TAB_BAR_HEIGHT + 24;

  const hasContent =
    deliveryData.expressGroups.length > 0 || deliveryData.slots.length > 0;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: listTopPad + 15, paddingBottom: listPadBottom },
        ]}
        scrollIndicatorInsets={{ top: listTopPad }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={onRefresh}
            progressViewOffset={listTopPad}
          />
        }
      >
        {!hasContent ? (
          <View style={styles.emptyState}>
            <Ionicons name="bicycle-outline" size={50} color="#D3D1C7" />
            <Text style={styles.emptyText}>Aucune commande à livrer</Text>
          </View>
        ) : (
          <View>
            {deliveryData.expressGroups.length > 0 && (
              <View style={{ marginBottom: 15 }}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => toggleGroup("express")}
                  style={styles.groupHeader}
                >
                  <View style={styles.groupHeaderLeft}>
                    <Ionicons
                      name={
                        expandedGroupId === "express"
                          ? "chevron-down"
                          : "chevron-forward"
                      }
                      size={12}
                      color="#888780"
                    />
                    <Text style={styles.groupTitle}>Express</Text>
                    <GroupStatusCounts
                      orders={deliveryData.expressGroups.flat()}
                    />
                  </View>
                </TouchableOpacity>

                {expandedGroupId === "express" &&
                  renderGroupWithSubTabs(deliveryData.expressGroups, "express")}
              </View>
            )}

            {deliveryData.slots.map((slot, sIdx) => {
              const groupId = `slot_${sIdx}`;
              const isExpanded = expandedGroupId === groupId;
              return (
                <View key={groupId} style={{ marginBottom: 15 }}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => toggleGroup(groupId)}
                    style={styles.groupHeader}
                  >
                    <View style={styles.groupHeaderLeft}>
                      <Ionicons
                        name={isExpanded ? "chevron-down" : "chevron-forward"}
                        size={12}
                        color="#888780"
                      />
                      <Text style={styles.groupTitle}>{slot.title}</Text>
                      <GroupStatusCounts orders={slot.userGroups.flat()} />
                    </View>
                  </TouchableOpacity>

                  {isExpanded &&
                    renderGroupWithSubTabs(slot.userGroups, groupId)}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  listContent: {
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: Theme.colors.gray[500],
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
  groupHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#333",
  },
  subTabRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 8,
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
  subTabLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#888780",
  },
  subTabLabelActive: {
    color: "#1A1916",
  },
  subTabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#E5E4DF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  subTabBadgeActive: {
    backgroundColor: Theme.colors.primary,
  },
  subTabBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#5F5E5A",
  },
  subTabBadgeTextActive: {
    color: "white",
  },
  subTabEmpty: {
    alignItems: "center",
    paddingVertical: 24,
    marginHorizontal: 16,
  },
  subTabEmptyText: {
    fontSize: 12,
    color: "#A8A7A2",
    fontStyle: "italic",
  },
});
