"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
// Copie de merchant/components/OrderManagePanel (R16) pour le mode travail
// (personnel) : statut impose par l'onglet de la navbar (Attente / En cours /
// Termine), pas de barre de filtres en bas, sheet de filtres ouvert par
// l'icone du header (WorkHeader). Decoupe : useWorkOrderData (donnees),
// WorkFinishedList (liste Termine), WorkOrderPanel.styles.
import type { DriverInfo } from "@/src/features/driver/services/driverService";
import { useTabBarHeight } from "@/src/hooks/useTabBarHeight";
import { Theme } from "@/src/theme";
import { Commande } from "@/src/types";
import { Ionicons } from "@expo/vector-icons";
import { BlurScope, BlurTarget } from "@/src/components/BlurTarget";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { DelegateDriverSheet } from "@/src/features/merchant/components/DelegateDriverSheet";
import { MerchantFilterSheet } from "@/src/features/merchant/components/MerchantFilterSheet";
import { MERCHANT_CARD_HEIGHT, MerchantOrderCard } from "@/src/features/merchant/components/MerchantOrderCard";
import { MerchantOrderSkeleton } from "@/src/features/merchant/components/MerchantOrderSkeleton";
import { DS } from "@/src/theme/ds";
import { t as tr, useLanguage } from "@/src/i18n";
import { styles } from "./WorkOrderPanel.styles";
import { useWorkOrderData, type StatusTab } from "./useWorkOrderData";
import { WorkFinishedList } from "./WorkFinishedList";

interface WorkOrderPanelProps {
  orders: Commande[];
  loading: boolean;
  onRefresh: () => void;
  onUpdateStatus: (orderId: string, status: string) => Promise<void | boolean>;
  onDelegate?: (orderId: string, driverId: string) => Promise<void | boolean>;
  selectedDate: string | null;
  onSelectDate: (iso: string | null) => void;
  topOffset?: number;
  /** Statut impose par l'onglet de la navbar. */
  selectedStatus: StatusTab;
  /** Sheet de filtres, ouvert par l'icone du header. */
  filterOpen: boolean;
  setFilterOpen: (open: boolean) => void;
}

export const WorkOrderPanel: React.FC<WorkOrderPanelProps> = ({
  orders,
  loading,
  onRefresh,
  onUpdateStatus,
  onDelegate,
  selectedDate,
  onSelectDate,
  topOffset = 0,
  selectedStatus,
  filterOpen,
  setFilterOpen,
}) => {
  const i18nLang = useLanguage();
  /**
   * Vrai uniquement quand le rafraichissement vient du GESTE de l'utilisateur.
   *
   * ⚠️ `loading` ne distingue pas le pull-to-refresh du rattrapage declenche par
   * le retour dans l'app : s'en servir seul affichait la roue native ET le
   * squelette en meme temps. On marque donc le geste ici, et chaque indicateur
   * ne se montre que dans son cas.
   */
  const [pullRefreshing, setPullRefreshing] = useState(false);

  const handlePullRefresh = useCallback(() => {
    setPullRefreshing(true);
    onRefresh();
  }, [onRefresh]);

  // Le parent ne dit pas quand sa requete se termine : on suit `loading`, qui
  // retombe a la fin du refetch.
  useEffect(() => {
    if (!loading) setPullRefreshing(false);
  }, [loading]);

  // Hauteur réelle de la navbar : la barre de filtres se colle juste dessus.
  const tabBarHeight = useTabBarHeight();
  const { height: windowHeight } = useWindowDimensions();
  // Alias non masqué de la prop `orders` : plusieurs helpers locaux ont un
  // paramètre nommé `orders`. Transmis aux cartes pour l'onglet Montant du sheet.
  const allShopOrders = orders;
  // Hauteur mesurée de la barre fixe (stats + chips) pour décaler la liste.
  const [barHeight, setBarHeight] = useState(0);
  // 'express' par défaut pour le tab finished (seul tab à grouper en accordéon).
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(
    "express",
  );
  // Groupe pour lequel le sélecteur "qui livre" (Lancer tout) est ouvert.
  const [delegateGroup, setDelegateGroup] = useState<Commande[] | null>(null);
  // Sous-tab actif par groupe : 'en_attente' | 'en_cours'
  const [groupSubTab, setGroupSubTab] = useState<
    Record<string, "en_attente" | "en_cours" | "termine">
  >({});
  // Périodes de livraison cochées (multi-sélection) ; vide = toutes.
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroupId((prev) => (prev === groupId ? null : groupId));
  };

  // Commandes RÉELLEMENT lançables d'un groupe : prêtes (`finished`) et PAS encore
  // déléguées (pas de driverId) ni lancées. « Lancer tout » ne doit agir que sur
  // celles-ci — jamais réassigner une commande déjà déléguée à un livreur.
  const launchableOf = (groupOrders: Commande[]): Commande[] =>
    groupOrders.filter((o) => o.status === "finished" && !(o as any).driverId);

  // Livrer tout le groupe soi-même : on assigne le fastFoodId comme "driverId"
  // (le restaurant EST le livreur), puis on passe la commande en `delivering`.
  const selfDeliverGroup = async (
    groupOrders: Commande[],
  ): Promise<boolean> => {
    const targets = launchableOf(groupOrders);
    if (targets.length === 0) return true;
    const results = await Promise.all(
      targets.map(async (o) => {
        // Pose driverId = fastFoodId (le resto se livre lui-même).
        if (onDelegate) await onDelegate(o.id, o.fastFoodId);
        return onUpdateStatus(o.id, "delivering");
      }),
    );
    return !results.some((r) => r === false);
  };

  // Déléguer tout le groupe à un livreur (uniquement les commandes lançables).
  const delegateGroupTo = async (
    groupOrders: Commande[],
    driverId: string,
  ): Promise<boolean> => {
    if (!onDelegate) return false;
    const targets = launchableOf(groupOrders);
    if (targets.length === 0) return true;
    const results = await Promise.all(
      targets.map((o) => onDelegate(o.id, driverId)),
    );
    return !results.some((r) => r === false);
  };

  const {
    todayISO,
    dateFilteredOrders,
    availablePeriods,
    allPeriodsCount,
    displayRows,
    emptyLabel,
    counts,
    totalAmount,
    futureDateOptions,
    pastDateOptions,
    dateScopeCounts,
    statusTabs,
    deliveryData,
  } = useWorkOrderData({ orders, selectedStatus, selectedDate, selectedPeriods, setSelectedPeriods, i18nLang });

  // La liste démarre sous la barre fixe (header de page + stats/chips).
  const listTopPad = topOffset + barHeight;

  // Espace réservé au-dessus de la 1re carte (paddingTop interne du contenu).
  const LIST_PAD_TOP_INNER = 1;
  // paddingTop total du contentContainer = barre fixe (mesurée) + espace interne.
  const MAIN_LIST_PAD_TOP = listTopPad + LIST_PAD_TOP_INNER;
  // Décalage de calage fin du SNAP uniquement (n'affecte pas le padding visuel) :
  // ajuste où le raccord tombe (padding/bordure carte vs bordure barre fixe).
  // Augmenter = la carte se cale un peu plus bas. Ajustable.
  const SNAP_PHASE = 0;
  const SNAP_ANCHOR = LIST_PAD_TOP_INNER - SNAP_PHASE;
  // paddingBottom léger : juste de quoi ne pas coller/chevaucher le bas du parent.
  // Rappel « autres dates » calé au-dessus de la barre de filtres : la liste
  // lui réserve sa hauteur pour que la dernière carte ne passe pas dessous.
  // Pas de barre de filtres en bas en mode travail : seule la navbar compte.
  const listPadBottom = tabBarHeight + 8;

  // Espace réellement libre entre la barre fixe du haut et celle du bas : le
  // message de liste vide l'occupe entièrement pour être centré verticalement.
  const emptyStateHeight = Math.max(
    160,
    windowHeight - MAIN_LIST_PAD_TOP - listPadBottom,
  );
  // Pas de la grille = hauteur carte (mesurée) + gap entre cartes.
  const CARD_STRIDE = MERCHANT_CARD_HEIGHT + 6;

  // Snap APRÈS-COUP : scroll libre ; à l'arrêt, on aligne la carte la plus proche
  // PILE sur le bord bas de la barre fixe. La carte i affleure ce bord quand
  // l'offset vaut y = LIST_PAD_TOP_INNER + i*CARD_STRIDE (indépendant du header,
  // car listTopPad — header+barre mesurés — s'annule dans le calcul à l'écran).
  const scrollRef = useRef<ScrollView>(null);
  const onScrollSettled = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const y = contentOffset.y;
      // Bas de liste atteignable. ⚠️ Sans borne, un scroll rapide finissant en
      // bout de liste (rebond) visait un offset hors contenu : la ScrollView
      // restait figée et plus aucun scroll ne passait.
      const maxY = Math.max(0, contentSize.height - layoutMeasurement.height);
      if (y <= 0 || y >= maxY - 1) return; // rebond haut / bas : on n'y touche pas
      const rel = y - SNAP_ANCHOR;
      if (rel <= 0) return; // au-dessus de la 1re carte → ne pas toucher
      const residual = rel % CARD_STRIDE;
      if (residual < 4 || residual > CARD_STRIDE - 4) return; // déjà ~aligné
      // Scrolle vers le haut OU le bas vers le bord de carte le plus proche.
      const target = Math.min(
        maxY,
        SNAP_ANCHOR + Math.round(rel / CARD_STRIDE) * CARD_STRIDE,
      );
      scrollRef.current?.scrollTo({ y: target, animated: true });
    },
    [SNAP_ANCHOR, CARD_STRIDE],
  );

  // Barre fixe (stats) calée sous le header de page.
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
                color: DS.accent,
                marginLeft: 8,
                fontWeight: "900",
              }}
            >
              cmd
            </Text>
          </View>
          <Text style={styles.statLbl}>{tr("Commandes effectue")}</Text>
        </View>
        <View style={styles.statBox}>
          <View style={{ flexDirection: "row", alignItems: "baseline" }}>
            <Text style={styles.statVal}>{totalAmount}</Text>
            <Text
              style={{
                fontSize: 25,
                color: DS.accent,
                marginLeft: 8,
                fontWeight: "900",
              }}
            >
              fcfa
            </Text>
          </View>
          <Text style={styles.statLbl}>{tr("Montant Total")}</Text>
        </View>
      </View>
    </View>
  );

  // Barre de filtres en BAS (design « Mes livraisons ») : chips de statut +

  return (
    <View style={styles.container}>
      {/* Flou Android (SDK 57) : la barre de filtres floute la liste
          (`BlurTarget`). Les sheets restent hors de la zone. */}
      <BlurScope>
      <BlurTarget style={styles.container}>
      {/* Conditional List Rendering */}
      {selectedStatus === "finish" ? (
        <ScrollView
          style={styles.container}
          contentContainerStyle={[
            styles.listContent,
            { paddingTop: listTopPad + 8, paddingBottom: listPadBottom },
          ]}
          scrollIndicatorInsets={{ top: listTopPad }}
          refreshControl={
            <RefreshControl
              refreshing={pullRefreshing}
              onRefresh={handlePullRefresh}
              progressViewOffset={listTopPad}
            />
          }
        >
          {/* ⚠️ Rafraîchissement en cours (retour dans l'app) : on montre le
              squelette AVANT le test de liste vide. Sinon l'écran « Aucune
              commande terminée » s'affichait pendant le chargement, ce qui est
              faux — les commandes existent, elles arrivent.
              `!pullRefreshing` : le geste a déjà sa roue native, le squelette
              par-dessus masquerait la liste que l'utilisateur tire. */}
          {loading && !pullRefreshing ? (
            <>
              <MerchantOrderSkeleton />
              <MerchantOrderSkeleton />
              <MerchantOrderSkeleton />
            </>
          ) : dateFilteredOrders.length === 0 ? (
            /* Rien de terminé sur la date affichée : on le dit, puis les cartes
               annoncent ce qui existe sur les autres jours (passé / futur). */
            <View style={[styles.emptyState, { minHeight: emptyStateHeight }]}>
              <Ionicons
                name="checkmark-done-outline"
                size={50}
                color="#D3D1C7"
              />
              <Text style={styles.emptyText}>{tr("Aucune commande terminée")}</Text>
            </View>
          ) : (
            deliveryData && (
              <WorkFinishedList
                deliveryData={deliveryData}
                allShopOrders={allShopOrders}
                expandedGroupId={expandedGroupId}
                toggleGroup={toggleGroup}
                groupSubTab={groupSubTab}
                setGroupSubTab={setGroupSubTab}
                setDelegateGroup={setDelegateGroup}
                launchableOf={launchableOf}
                onUpdateStatus={onUpdateStatus}
                onDelegate={onDelegate}
              />
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
              refreshing={pullRefreshing}
              onRefresh={handlePullRefresh}
              progressViewOffset={listTopPad}
            />
          }
        >
          {/* Liste principale (aujourd'hui par défaut, ou date choisie dans le
              bottom sheet de filtres — y compris une date passée). */}
          {/* ⚠️ Même raison que la liste « terminées » : le squelette passe
              AVANT le test de liste vide, sinon un « aucune commande » s'affiche
              pendant le rafraîchissement alors qu'elles arrivent.
              `!pullRefreshing` : le geste a déjà sa roue native. */}
          {loading && !pullRefreshing ? (
            <>
              <MerchantOrderSkeleton />
              <MerchantOrderSkeleton />
              <MerchantOrderSkeleton />
            </>
          ) : dateFilteredOrders.length === 0 ? (
            /* Liste vide : le message centré dit ce qui manque sur la date
               affichée, les cartes disent ce qui existe sur les autres jours. */
            <View style={[styles.emptyState, { minHeight: emptyStateHeight }]}>
              <Ionicons
                name={
                  selectedStatus === "pending"
                    ? "time-outline"
                    : "restaurant-outline"
                }
                size={50}
                color={Theme.colors.gray[300]}
              />
              <Text style={styles.emptyText}>{emptyLabel}</Text>
            </View>
          ) : (
            <View style={{ gap: 6 }}>
              {displayRows.map(({ head, group }) => (
                <MerchantOrderCard
                  key={head.id}
                  order={head}
                  sheetOrders={group}
                  groupPool={allShopOrders}
                  onUpdateStatus={async (status) => {
                    // Valider depuis la CARTE traite toute la ligne groupée.
                    await Promise.all(
                      group.map((o) => onUpdateStatus(o.id, status)),
                    );
                  }}
                  // Valider depuis le SHEET ne traite que la commande affichée.
                  onValidateOne={(orderId, status) =>
                    onUpdateStatus(orderId, status)
                  }
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}
      </BlurTarget>


      {/* Barre fixe (stats) en blur, par-dessus la liste. */}
      {fixedBar}
      </BlurScope>

      <MerchantFilterSheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        todayISO={todayISO}
        futureDates={futureDateOptions}
        pastDates={pastDateOptions}
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
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
        pastUntreated={selectedStatus !== "finish"}
        statusTabs={statusTabs.map((t) => ({
          key: t.key,
          label: t.label,
          count: counts[t.key],
        }))}
        selectedStatus={selectedStatus}
        // Statut impose par l'onglet de la navbar : pas de changement ici.
        onSelectStatus={() => {}}
      />

      {/* Sélecteur "qui livre" pour "Lancer tout" (groupe entier). */}
      <DelegateDriverSheet
        visible={!!delegateGroup}
        onClose={() => setDelegateGroup(null)}
        onSelfDeliver={() => selfDeliverGroup(delegateGroup || [])}
        onDelegate={(d: DriverInfo) =>
          delegateGroupTo(delegateGroup || [], d.driverId)
        }
      />
    </View>
  );
};
