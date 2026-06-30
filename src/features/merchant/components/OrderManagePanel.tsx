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
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MERCHANT_CARD_HEIGHT, MerchantOrderCard } from "./MerchantOrderCard";

// Hauteur approximative de la tab bar (navbar du bas) à réserver sous la liste.
const TAB_BAR_HEIGHT = 65;

type OrderStatus = "pending" | "proccess" | "finish";

export interface DateOption {
  iso: string;
  label: string;
}

interface OrderManagePanelProps {
  orders: Commande[];
  loading: boolean;
  onRefresh: () => void;
  onUpdateStatus: (orderId: string, status: string) => Promise<void | boolean>;
  /** Date sélectionnée (ISO YYYY-MM-DD) ou null pour "aujourd'hui". Contrôlée par le header. */
  selectedDate: string | null;
  onSelectDate: (iso: string | null) => void;
  /** Remonte au parent la liste des dates disponibles (pour les chips du header). */
  onDatesChange?: (dates: DateOption[]) => void;
  /** Hauteur du header de page : la barre stats+chips s'y cale (en blur), la liste
      scrolle dessous. Défaut 0 (pas d'offset). */
  topOffset?: number;
}

export const OrderManagePanel: React.FC<OrderManagePanelProps> = ({
  orders,
  loading,
  onRefresh,
  onUpdateStatus,
  selectedDate,
  onSelectDate,
  onDatesChange,
  topOffset = 0,
}) => {
  const insets = useSafeAreaInsets();
  // Hauteur mesurée de la barre fixe (stats + chips) pour décaler la liste.
  const [barHeight, setBarHeight] = useState(0);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>("pending");
  // 'express' par défaut pour le tab finished. Les sections passées (pending/proccess)
  // utilisent leur propre clé 'past_<iso>', donc elles restent toutes fermées au départ.
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(
    "express",
  );
  const [launchedGroups, setLaunchedGroups] = useState<Record<string, boolean>>(
    {},
  );
  const [launchingGroups, setLaunchingGroups] = useState<
    Record<string, boolean>
  >({});
  // Sous-tab actif par groupe : 'en_attente' | 'en_cours'
  const [groupSubTab, setGroupSubTab] = useState<Record<string, 'en_attente' | 'en_cours'>>({});

  const toggleGroup = (groupId: string) => {
    setExpandedGroupId((prev) => (prev === groupId ? null : groupId));
  };

  const launchGroup = async (groupId: string, groupOrders: Commande[]) => {
    setLaunchingGroups((prev) => ({ ...prev, [groupId]: true }));
    try {
      await Promise.all(
        groupOrders.map((o) => onUpdateStatus(o.id, "delivering")),
      );
      setLaunchedGroups((prev) => ({ ...prev, [groupId]: true }));
    } finally {
      setLaunchingGroups((prev) => ({ ...prev, [groupId]: false }));
    }
  };

  // Helpers de date : retourne YYYY-MM-DD à partir d'une commande (clé stable)
  const getOrderDateISO = (order: Commande): string => {
    const deliveryDate = order.delivery?.date;
    const dateStr = deliveryDate || order.createdAt || "";
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

  // Format d'affichage pour un chip / header de section : "10 juin" (jour chiffré + mois).
  const formatDateLabel = (iso: string): string => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
    } catch {
      return iso;
    }
  };

  const statusMap: Record<OrderStatus, string[]> = {
    pending: ["pending"],
    proccess: ["processing", "active", "in_progress"],
    finish: ["completed", "finished", "done", "delivering"],
  };

  const filteredOrders = orders.filter((o) =>
    statusMap[selectedStatus].includes(o.status),
  );

  // Dates uniques (ISO YYYY-MM-DD) disponibles pour ce statut
  const availableDateISOs = useMemo(() => {
    return [...new Set(filteredOrders.map(getOrderDateISO))];
  }, [filteredOrders]);

  // Ordre des chips : futures (asc) → aujourd'hui → passées (desc)
  const sortedDateISOs = useMemo(() => {
    const futures = availableDateISOs.filter((d) => d > todayISO).sort();
    const past = availableDateISOs
      .filter((d) => d < todayISO)
      .sort()
      .reverse();
    const hasToday = availableDateISOs.includes(todayISO);
    return [...futures, ...(hasToday ? [todayISO] : []), ...past];
  }, [availableDateISOs]);

  // Sections passées (uniquement pour la vue par défaut pending/processing)
  const pastDateISOs = useMemo(() => {
    return availableDateISOs
      .filter((d) => d < todayISO)
      .sort()
      .reverse();
  }, [availableDateISOs]);

  // Remonte au header la liste des dates disponibles (chips).
  // Dépend d'une clé string stable (et pas du tableau, recréé à chaque render)
  // pour éviter une boucle setState → render → nouveau tableau → effet.
  const datesKey = sortedDateISOs.join(",");
  useEffect(() => {
    onDatesChange?.(
      sortedDateISOs.map((iso) => ({ iso, label: formatDateLabel(iso) })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datesKey]);

  // Trie par rank pour pending/proccess
  const sortByRank = (arr: Commande[]) => {
    return [...arr].sort((a, b) => {
      const ra = (a as any).rank ?? Infinity;
      const rb = (b as any).rank ?? Infinity;
      return ra - rb;
    });
  };

  // Commandes filtrées :
  //  - Si un chip de date est sélectionné → uniquement cette date
  //  - Sinon → uniquement aujourd'hui (la liste principale)
  //    Pour pending/proccess, les dates passées non traitées sont rendues en sections sous la liste.
  //    Pour finish, on n'affiche jamais l'historique en dessous : seulement la date sélectionnée.
  const dateFilteredOrders = useMemo(() => {
    const isoFilter = selectedDate || todayISO;
    const filtered = filteredOrders.filter(
      (o) => getOrderDateISO(o) === isoFilter,
    );
    if (selectedStatus === "pending" || selectedStatus === "proccess") {
      return sortByRank(filtered);
    }
    return filtered;
  }, [filteredOrders, selectedDate, selectedStatus]);

  // Groupes par date passée (uniquement quand aucun chip n'est sélectionné et statut pending/proccess)
  const pastSections = useMemo(() => {
    if (selectedDate) return [];
    if (selectedStatus !== "pending" && selectedStatus !== "proccess")
      return [];
    return pastDateISOs.map((iso) => ({
      iso,
      label: formatDateLabel(iso),
      orders: sortByRank(
        filteredOrders.filter((o) => getOrderDateISO(o) === iso),
      ),
    }));
  }, [pastDateISOs, selectedDate, selectedStatus, filteredOrders]);

  const counts = {
    pending: orders.filter((o) => statusMap.pending.includes(o.status)).length,
    proccess: orders.filter((o) => statusMap.proccess.includes(o.status))
      .length,
    finish: orders.filter((o) => statusMap.finish.includes(o.status)).length,
  };

  const totalAmount = dateFilteredOrders.reduce(
    (acc, o) => acc + (o.total || 0),
    0,
  );

  const statusTabs: { key: OrderStatus; label: string; icon: string }[] = [
    { key: "pending", label: "En Attente", icon: "time-outline" },
    { key: "proccess", label: "En cours", icon: "restaurant-outline" },
    { key: "finish", label: "Terminées", icon: "checkmark-done-outline" },
  ];

  // Grouping logic for the finished orders design (Untitled-1 style)
  const deliveryData = useMemo(() => {
    if (selectedStatus !== "finish") return null;

    const express: Commande[] = [];
    const surplace: Commande[] = [];
    const scheduled: Record<string, Commande[]> = {};

    dateFilteredOrders.forEach((o) => {
      const d = (o as any).delivery;
      const hasDelivery = d?.status === true;
      if (!hasDelivery) {
        surplace.push(o);
        return;
      }
      if (d?.type === "express") {
        express.push(o);
      } else {
        const slot = d?.time || "À définir";
        if (!scheduled[slot]) scheduled[slot] = [];
        scheduled[slot].push(o);
      }
    });

    const groupByUser = (ordersArr: Commande[]) => {
      const userMap: Record<string, Commande[]> = {};
      ordersArr.forEach((o) => {
        const u = o.userData;
        const key = o.userId || u?.email || o.id || `anon_${Math.random()}`;
        if (!userMap[key]) userMap[key] = [];
        userMap[key].push(o);
      });
      return Object.values(userMap);
    };

    return {
      expressGroups: groupByUser(express),
      surplaceGroups: groupByUser(surplace),
      slots: Object.entries(scheduled).map(([slot, orders]) => ({
        title: slot,
        userGroups: groupByUser(orders),
      })),
    };
  }, [dateFilteredOrders, selectedStatus]);

  const renderUserGroup = (orders: Commande[], groupId?: string) => {
    const isForced = groupId ? launchedGroups[groupId] : false;
    return (
      <MerchantOrderCard
        key={orders[0].id}
        order={orders[0]}
        allOrders={orders}
        isForceLaunched={isForced}
        onUpdateStatus={async (status) => {
          await Promise.all(orders.map((o) => onUpdateStatus(o.id, status)));
        }}
      />
    );
  };

  /**
   * Rend les sous-tabs En attente / En cours + les cartes filtrées
   * pour un groupe de userGroups donné (Express ou slot horaire).
   */
  const renderGroupWithSubTabs = (userGroups: Commande[][], groupId: string) => {
    const activeSubTab = groupSubTab[groupId] ?? 'en_attente';

    // Sépare les commandes delivering (en cours) des autres (en attente)
    const allGroupOrders = userGroups.flat();
    const enCoursOrders = allGroupOrders.filter((o) => o.status === 'delivering');
    const enAttenteOrders = allGroupOrders.filter((o) => o.status !== 'delivering');

    // Regroupe par utilisateur pour chaque sous-liste
    const groupByUser = (ordersArr: Commande[]): Commande[][] => {
      const userMap: Record<string, Commande[]> = {};
      ordersArr.forEach((o) => {
        const key = o.userId || o.userData?.email || o.id || `anon_${Math.random()}`;
        if (!userMap[key]) userMap[key] = [];
        userMap[key].push(o);
      });
      return Object.values(userMap);
    };

    const enAttenteGroups = groupByUser(enAttenteOrders);
    const enCoursGroups = groupByUser(enCoursOrders);
    const activeGroups = activeSubTab === 'en_cours' ? enCoursGroups : enAttenteGroups;

    return (
      <View style={{ marginTop: 4 }}>
        {/* Sous-tabs En attente / En cours */}
        <View style={styles.subTabRow}>
          <TouchableOpacity
            style={[
              styles.subTab,
              activeSubTab === 'en_attente' && styles.subTabActive,
            ]}
            onPress={() => setGroupSubTab((prev) => ({ ...prev, [groupId]: 'en_attente' }))}
          >
            <Text style={[styles.subTabLabel, activeSubTab === 'en_attente' && styles.subTabLabelActive]}>
              En attente
            </Text>
            {enAttenteOrders.length > 0 && (
              <View style={[styles.subTabBadge, activeSubTab === 'en_attente' && styles.subTabBadgeActive]}>
                <Text style={[styles.subTabBadgeText, activeSubTab === 'en_attente' && styles.subTabBadgeTextActive]}>
                  {enAttenteOrders.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.subTab,
              activeSubTab === 'en_cours' && styles.subTabActive,
            ]}
            onPress={() => setGroupSubTab((prev) => ({ ...prev, [groupId]: 'en_cours' }))}
          >
            <Text style={[styles.subTabLabel, activeSubTab === 'en_cours' && styles.subTabLabelActive]}>
              En cours
            </Text>
            {enCoursOrders.length > 0 && (
              <View style={[styles.subTabBadge, activeSubTab === 'en_cours' && styles.subTabBadgeActive]}>
                <Text style={[styles.subTabBadgeText, activeSubTab === 'en_cours' && styles.subTabBadgeTextActive]}>
                  {enCoursOrders.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Liste des commandes du sous-tab actif */}
        {activeGroups.length === 0 ? (
          <View style={styles.subTabEmpty}>
            <Text style={styles.subTabEmptyText}>
              {activeSubTab === 'en_cours'
                ? 'Aucune livraison en cours'
                : 'Aucune commande en attente'}
            </Text>
          </View>
        ) : (
          <View style={{ gap: 6, marginTop: 6 }}>
            {activeGroups.map((group) => renderUserGroup(group, groupId))}
          </View>
        )}
      </View>
    );
  };

  // La liste démarre sous la barre fixe (header de page + stats/chips).
  const listTopPad = topOffset + barHeight;

  // Espace réservé au-dessus de la 1re carte (paddingTop interne du contenu).
  const LIST_PAD_TOP_INNER = 15;
  // paddingTop total du contentContainer = barre fixe (mesurée) + espace interne.
  const MAIN_LIST_PAD_TOP = listTopPad + LIST_PAD_TOP_INNER;
  // Décalage de calage fin du SNAP uniquement (n'affecte pas le padding visuel) :
  // ajuste où le raccord tombe (padding/bordure carte vs bordure barre fixe).
  // Augmenter = la carte se cale un peu plus bas. Ajustable.
  const SNAP_PHASE = 0;
  const SNAP_ANCHOR = LIST_PAD_TOP_INNER - SNAP_PHASE;
  // paddingBottom léger : juste de quoi ne pas coller/chevaucher le bas du parent.
  const listPadBottom = insets.bottom + TAB_BAR_HEIGHT + 24;
  // Pas de la grille = hauteur carte (mesurée) + gap entre cartes.
  const CARD_STRIDE = MERCHANT_CARD_HEIGHT + 6;

  // Snap APRÈS-COUP : scroll libre ; à l'arrêt, on aligne la carte la plus proche
  // PILE sur le bord bas de la barre fixe. La carte i affleure ce bord quand
  // l'offset vaut y = LIST_PAD_TOP_INNER + i*CARD_STRIDE (indépendant du header,
  // car listTopPad — header+barre mesurés — s'annule dans le calcul à l'écran).
  const scrollRef = useRef<ScrollView>(null);
  const onScrollSettled = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const rel = y - SNAP_ANCHOR;
      if (rel <= 0) return; // au-dessus de la 1re carte → ne pas toucher
      const residual = rel % CARD_STRIDE;
      if (residual < 4 || residual > CARD_STRIDE - 4) return; // déjà ~aligné
      // Scrolle vers le haut OU le bas vers le bord de carte le plus proche.
      const target = SNAP_ANCHOR + Math.round(rel / CARD_STRIDE) * CARD_STRIDE;
      scrollRef.current?.scrollTo({ y: target, animated: true });
    },
    [SNAP_ANCHOR, CARD_STRIDE],
  );

  // Barre fixe (stats + chips) calée sous le header de page.
  const fixedBar = (
    <View
      style={[styles.fixedBar, { top: topOffset }]}
      onLayout={(e) => setBarHeight(e.nativeEvent.layout.height)}
    >
      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <View style={{ flexDirection: "row", alignItems: "baseline" }}>
            <Text style={styles.statVal}>{dateFilteredOrders.length}</Text>
            <Text
              style={{
                fontSize: 25,
                color: Theme.colors.primary,
                marginLeft: 8,
                fontWeight: "900",
              }}
            >
              cmd
            </Text>
          </View>
          <Text style={styles.statLbl}>Commandes effectue</Text>
        </View>
        <View style={styles.statBox}>
          <View style={{ flexDirection: "row", alignItems: "baseline" }}>
            <Text style={styles.statVal}>{totalAmount}</Text>
            <Text
              style={{
                fontSize: 25,
                color: Theme.colors.primary,
                marginLeft: 8,
                fontWeight: "900",
              }}
            >
              fcfa
            </Text>
          </View>
          <Text style={styles.statLbl}>Montant Total</Text>
        </View>
      </View>

      {/* Status Chips Row */}
      <View style={styles.statusScrollContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statusScrollContent}
        >
          {statusTabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.statusTab,
                selectedStatus === tab.key && styles.statusTabActive,
              ]}
              onPress={() => {
                setSelectedStatus(tab.key);
                onSelectDate(null);
              }}
            >
              <Ionicons
                name={tab.icon as any}
                size={14}
                color={
                  selectedStatus === tab.key ? "white" : Theme.colors.primary
                }
              />
              <Text
                style={[
                  styles.statusTabLabel,
                  {
                    color:
                      selectedStatus === tab.key
                        ? "white"
                        : Theme.colors.primary,
                  },
                ]}
              >
                {tab.label}
              </Text>
              <Text
                style={[
                  styles.statusTabLabel,
                  {
                    fontWeight: "900",
                    marginLeft: 4,
                    color:
                      selectedStatus === tab.key
                        ? "white"
                        : Theme.colors.primary,
                  },
                ]}
              >
                ({counts[tab.key]})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Conditional List Rendering */}
      {selectedStatus === "finish" ? (
        <ScrollView
          style={styles.container}
          contentContainerStyle={[
            styles.listContent,
            { paddingTop: listTopPad + 15 },
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
          {dateFilteredOrders.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="checkmark-done-outline"
                size={50}
                color="#D3D1C7"
              />
              <Text style={styles.emptyText}>Aucune commande terminée</Text>
            </View>
          ) : (
            deliveryData && (
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
                        <View style={styles.groupCountBadge}>
                          <Text style={styles.groupCountText}>
                            {deliveryData.expressGroups.length} livraison
                            {deliveryData.expressGroups.length > 1 ? "s" : ""}
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.btnLaunchGroup,
                          launchedGroups["express"] &&
                            styles.btnLaunchGroupLaunched,
                        ]}
                        onPress={(e) => {
                          e.stopPropagation();
                          launchGroup(
                            "express",
                            deliveryData!.expressGroups.flat(),
                          );
                        }}
                        disabled={
                          launchedGroups["express"] ||
                          launchingGroups["express"]
                        }
                      >
                        <Text
                          style={[
                            styles.btnLaunchGroupText,
                            launchedGroups["express"] &&
                              styles.btnLaunchGroupTextLaunched,
                          ]}
                        >
                          {launchingGroups["express"]
                            ? "..."
                            : launchedGroups["express"]
                              ? "Lancé ✓"
                              : "Lancer tout"}
                        </Text>
                      </TouchableOpacity>
                    </TouchableOpacity>

                    {expandedGroupId === "express" &&
                      renderGroupWithSubTabs(deliveryData.expressGroups, "express")
                    }
                  </View>
                )}

                {deliveryData.surplaceGroups.length > 0 && (
                  <View style={{ marginBottom: 15 }}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => toggleGroup("surplace")}
                      style={styles.groupHeader}
                    >
                      <View style={styles.groupHeaderLeft}>
                        <Ionicons
                          name={expandedGroupId === "surplace" ? "chevron-down" : "chevron-forward"}
                          size={12}
                          color="#888780"
                        />
                        <Text style={styles.groupTitle}>Sur place</Text>
                        <View style={styles.groupCountBadge}>
                          <Text style={styles.groupCountText}>
                            {deliveryData.surplaceGroups.length} commande
                            {deliveryData.surplaceGroups.length > 1 ? "s" : ""}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>

                    {expandedGroupId === "surplace" && (
                      <View style={{ gap: 6 }}>
                        {deliveryData.surplaceGroups.map((group) =>
                          renderUserGroup(group, "surplace"),
                        )}
                      </View>
                    )}
                  </View>
                )}

                {deliveryData.slots.map((slot, sIdx) => {
                  const groupId = `slot_${sIdx}`;
                  const isExpanded = expandedGroupId === groupId;
                  const isLaunched = launchedGroups[groupId];

                  return (
                    <View key={groupId} style={{ marginBottom: 15 }}>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => toggleGroup(groupId)}
                        style={styles.groupHeader}
                      >
                        <View style={styles.groupHeaderLeft}>
                          <Ionicons
                            name={
                              isExpanded ? "chevron-down" : "chevron-forward"
                            }
                            size={12}
                            color="#888780"
                          />
                          <Text style={styles.groupTitle}>{slot.title}</Text>
                          <View style={styles.groupCountBadge}>
                            <Text style={styles.groupCountText}>
                              {slot.userGroups.length} livraison
                              {slot.userGroups.length > 1 ? "s" : ""}
                            </Text>
                          </View>
                        </View>

                        <TouchableOpacity
                          style={[
                            styles.btnLaunchGroup,
                            isLaunched && styles.btnLaunchGroupLaunched,
                          ]}
                          onPress={(e) => {
                            e.stopPropagation();
                            launchGroup(groupId, slot.userGroups.flat());
                          }}
                          disabled={isLaunched || launchingGroups[groupId]}
                        >
                          <Text
                            style={[
                              styles.btnLaunchGroupText,
                              isLaunched && styles.btnLaunchGroupTextLaunched,
                            ]}
                          >
                            {launchingGroups[groupId]
                              ? "..."
                              : isLaunched
                                ? "Lancé ✓"
                                : "Lancer tout"}
                          </Text>
                        </TouchableOpacity>
                      </TouchableOpacity>

                      {isExpanded &&
                        renderGroupWithSubTabs(slot.userGroups, groupId)
                      }
                    </View>
                  );
                })}
              </View>
            )
          )}
        </ScrollView>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.container}
          contentContainerStyle={[
            styles.listContent,
            { paddingTop: MAIN_LIST_PAD_TOP, paddingBottom: listPadBottom },
          ]}
          scrollIndicatorInsets={{ top: listTopPad }}
          onMomentumScrollEnd={onScrollSettled}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={onRefresh}
              progressViewOffset={listTopPad}
            />
          }
        >
          {/* Liste principale (aujourd'hui par défaut, ou date du chip sélectionné).
              Le message vide ne s'affiche que s'il n'y a pas non plus de sections passées. */}
          {dateFilteredOrders.length === 0 ? (
            pastSections.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name={
                    selectedStatus === "pending"
                      ? "time-outline"
                      : "restaurant-outline"
                  }
                  size={50}
                  color={Theme.colors.gray[300]}
                />
                <Text style={styles.emptyText}>
                  {selectedStatus === "pending"
                    ? "Aucune commande en attente"
                    : "Aucune commande en cours"}
                </Text>
              </View>
            ) : null
          ) : (
            <View style={{ gap: 6 }}>
              {dateFilteredOrders.map((item) => (
                <MerchantOrderCard
                  key={item.id}
                  order={item}
                  onUpdateStatus={(status) => onUpdateStatus(item.id, status)}
                />
              ))}
            </View>
          )}

          {/* Sections passées non traitées (uniquement vue par défaut) */}
          {/* marginTop réduit (10 au lieu de 24) pour compenser le paddingVertical:15
              du listContent côté marchand et matcher l'espace chips→label du client. */}
          {pastSections.length > 0 && (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.sectionLabel}>
                Commandes des jours précédents
              </Text>
              {pastSections.map((section) => {
                const groupId = `past_${section.iso}`;
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
                        <Text style={styles.groupTitle}>{section.label}</Text>
                        <View style={styles.groupCountBadge}>
                          <Text style={styles.groupCountText}>
                            {section.orders.length} commande
                            {section.orders.length > 1 ? "s" : ""}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={{ gap: 6, marginTop: 6 }}>
                        {section.orders.map((item) => (
                          <MerchantOrderCard
                            key={item.id}
                            order={item}
                            onUpdateStatus={(status) =>
                              onUpdateStatus(item.id, status)
                            }
                          />
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      {/* Barre fixe (stats + chips) en blur, par-dessus la liste. */}
      {fixedBar}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  // Barre fixe (stats + chips) calée sous le header de page, en blur.
  fixedBar: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: "white",
    // Trait de séparation bas : délimite la barre fixe de la liste.
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "white",
    paddingHorizontal: 15,
    paddingVertical: 15,
    gap: 15,
  },
  statBox: {
    flex: 1,
    alignItems: "flex-start",
    // Même fond que la pilule du header (orange translucide) : marie bien avec le blur.
    backgroundColor: Theme.colors.primary + "10",
    padding: 10,
    borderRadius: 10,
  },
  statVal: {
    fontSize: 31,
    fontWeight: "900",
    color: "black",
  },
  statLbl: {
    fontSize: 11,
    color: "rgba(0,0,0,0.44)",
    fontWeight: "bold",
    marginTop: 2,
  },
  statusScrollContainer: {
    backgroundColor: "transparent",
    paddingVertical: 10,
  },
  statusScrollContent: {
    paddingHorizontal: 15,
    gap: 4,
  },
  statusTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    // Même fond que la pilule du header (orange translucide) : marie bien avec le blur.
    backgroundColor: Theme.colors.primary + "10",
    height: 32,
  },
  statusTabActive: {
    backgroundColor: "rgba(236,73,19,1.00)",
  },
  statusTabLabel: {
    fontSize: 10,
    color: "black",
    fontWeight: "bold",
    marginLeft: 4,
  },
  statusTabLabelActive: {
    color: "white",
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
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#888780",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
    paddingHorizontal: 16,
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
  groupCountBadge: {
    backgroundColor: "#FFF",
    borderWidth: 0.5,
    borderColor: "#D3D1C7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  groupCountText: {
    fontSize: 10,
    color: "#5F5E5A",
    fontWeight: "500",
  },
  btnLaunchGroup: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "rgba(236,73,19,0.1)",
    borderWidth: 1,
    borderColor: "rgba(236,73,19,1.00)",
  },
  btnLaunchGroupText: {
    fontSize: 9,
    fontWeight: "900",
    color: "rgba(236,73,19,1.00)",
    textTransform: "uppercase",
  },
  btnLaunchGroupLaunched: {
    backgroundColor: "#C0DD97",
    borderColor: "#C0DD97",
  },
  btnLaunchGroupTextLaunched: {
    color: "#27500A",
  },
  // Sous-tabs En attente / En cours (intérieur d'un groupe déroulé)
  subTabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#F5F4F0',
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  subTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
  },
  subTabActive: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  subTabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888780',
  },
  subTabLabelActive: {
    color: '#1A1916',
  },
  subTabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E5E4DF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  subTabBadgeActive: {
    backgroundColor: Theme.colors.primary,
  },
  subTabBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#5F5E5A',
  },
  subTabBadgeTextActive: {
    color: 'white',
  },
  subTabEmpty: {
    alignItems: 'center',
    paddingVertical: 24,
    marginHorizontal: 16,
  },
  subTabEmptyText: {
    fontSize: 12,
    color: '#A8A7A2',
    fontStyle: 'italic',
  },
});
