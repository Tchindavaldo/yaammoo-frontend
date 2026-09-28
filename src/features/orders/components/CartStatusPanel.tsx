import { ClientDateChipsRow as StickyChipsRow } from "./ClientDateChipsRow";
import { ClientFilterSheet } from "./ClientFilterSheet";
import {
  buildFlatItems,
  type FlatItem,
  getOrderDate,
  getOrderDateISO,
  GroupSubTabs,
  isSameDay,
  periodKeyOf,
} from "./CartStatusPanel.parts";
import { useClientFilterOptions } from "@/src/features/orders/hooks/useClientFilterOptions";
import { DS } from "@/src/theme/ds";
import { ClientOrderCard } from "@/src/features/orders/components/ClientOrderCard";
import { ClientOrderSkeleton } from "@/src/features/orders/components/ClientOrderSkeleton";
import { OrderBottomSheet } from "@/src/features/orders/components/OrderBottomSheet";
import {
  OrderTrackingHeader,
  type TrackedFastFood,
} from "@/src/features/orders/components/OrderTrackingHeader";
import { useOrders } from "@/src/features/orders/hooks/useOrders";
import { useFastFoods } from "@/src/features/restaurants/hooks/useFastFoods";
import { useCartFastFoodInfos } from "../hooks/useCartFastFoodInfos";
import { useTabBarHeight } from "@/src/hooks/useTabBarHeight";
import { Theme } from "@/src/theme";
import { Commande } from "@/src/types";
import { Ionicons } from "@expo/vector-icons";
import { AppBlurView as BlurView } from "@/src/components/AppBlurView";
import { BlurScope, BlurTarget } from "@/src/components/BlurTarget";
import React, {
  useCallback,
  useEffect,
  useMemo,
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

/** Hauteur de la barre de filtres du bas (meme gabarit que le marchand). */
const FILTER_BAR_HEIGHT = 54;

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
  const {
    pending,
    active,
    finished,
    delivered,
    refresh,
    // ⚠️ Renommé : `refreshing` est déjà pris ci-dessous par le pull-to-refresh.
    refreshing: ordersRefreshing,
  } = useOrders();
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
  // Boutiques des commandes absentes du catalogue du home (pagination) : nom
  // et image demandes une fois via GET /fastFood/:id, comme dans le panier.
  const missingFfIds = useMemo(() => {
    const ids = new Set<string>();
    [...pending, ...active, ...finished, ...delivered].forEach((o: any) => {
      if (o.fastFoodId && !fastFoods.some((f) => f.id === o.fastFoodId)) {
        ids.add(o.fastFoodId);
      }
    });
    return Array.from(ids);
  }, [pending, active, finished, delivered, fastFoods]);
  const fetchedFfInfos = useCartFastFoodInfos(missingFfIds);

  const trackedFastFoods = useMemo(() => {
    const all = [...pending, ...active, ...finished, ...delivered];
    const map = new Map<string, TrackedFastFood>();
    all.forEach((o: any) => {
      const ffId = o.fastFoodId;
      if (!ffId) return;
      let entry: TrackedFastFood | undefined = map.get(ffId);
      if (!entry) {
        const ff: any = fastFoods.find((f) => f.id === ffId);
        const fetched = fetchedFfInfos[ffId];
        entry = {
          id: ffId,
          name: ff?.nom || ff?.name || fetched?.name || "Boutique",
          // `image` est déjà normalisé (photo du fastfood, sinon 1er plat).
          image: ff?.image || ff?.logo || ff?.coverImage || fetched?.image,
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
  }, [pending, active, finished, delivered, fastFoods, fetchedFfInfos, activeDateISO]);

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
  const flatItems: FlatItem[] = useMemo(
    () =>
      buildFlatItems(
        filteredOrders,
        activeStatus === "finished",
        groupSubTab["all"] ?? "attente",
      ),
    [filteredOrders, activeStatus, groupSubTab],
  );

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
  const {
    futureDateOptions,
    pastDateOptions,
    availablePeriods,
    allPeriodsCount,
    dateScopeCounts,
    chipCounts,
  } = useClientFilterOptions({
    statusList,
    pending,
    active,
    finished,
    delivered,
    selectedFastFoodId,
    todayISO,
    activeDateISO,
  });

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
      {/* Flou Android (SDK 57) : la barre de filtres du bas floute la liste
          (`BlurTarget`). Les sheets restent hors de la zone. */}
      <BlurScope>
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

      {/* FlatList virtualisée
          ⚠️ `data` est vidée pendant un rafraîchissement de RETOUR dans l'app :
          les statuts affichés sont alors périmés, et les laisser visibles sans
          aucun signe laissait croire qu'ils étaient à jour. Le pull-to-refresh
          (`refreshing`) est exclu — il a déjà son indicateur natif, et vider la
          liste sous le doigt masquerait le geste. */}
      <BlurTarget style={{ flex: 1 }}>
      <FlatList
        data={ordersRefreshing && !refreshing ? [] : flatItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListEmptyComponent={
          ordersRefreshing && !refreshing ? (
            // Skeleton plutot qu'un spinner : il reprend la forme des cartes
            // qu'il remplace, donc la page ne se vide pas et rien ne saute
            // quand les vraies commandes arrivent.
            <View style={styles.refreshingBlock}>
              <ClientOrderSkeleton />
              <ClientOrderSkeleton />
              <ClientOrderSkeleton />
            </View>
          ) : null
        }
        contentContainerStyle={{
          paddingTop: topOffset + trackingHeaderHeight,
          // Réserve la navbar + la barre de filtres du bas, sans marge en plus
          // (R19) : la dernière carte s'arrête juste au-dessus de la barre.
          paddingBottom: tabBarHeight + bottomOffset + FILTER_BAR_HEIGHT + 8,
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
      </BlurTarget>

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
          <Ionicons name="options-outline" size={20} color={DS.ink} />
        </TouchableOpacity>
      </View>
      </BlurScope>

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
  // Bloc affiché à la place de la liste pendant un rafraîchissement de retour
  // dans l'app. Centré verticalement sur la zone libre sous l'en-tête.
  refreshingBlock: {
    gap: 12,
  },
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
    // Soft (comme le marchand) : blanc + bordure grise, icône noire.
    backgroundColor: DS.bg,
    borderWidth: 1,
    borderColor: DS.line,
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
});
