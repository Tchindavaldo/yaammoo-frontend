"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
// Copie de merchant/components/OrderManagePanel (R16) pour le mode travail :
// statut impose par l'onglet de la navbar, pas de barre basse, filtres ouverts par le header.
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Commande } from "@/src/types";
import { GroupStatusCounts } from "@/src/features/driver/components/GroupStatusCounts";
import { MerchantOrderCard } from "@/src/features/merchant/components/MerchantOrderCard";
import { t as tr } from "@/src/i18n";
import { styles } from "./WorkOrderPanel.styles";
import type { DeliveryData } from "./useWorkOrderData";

type SubTab = "en_attente" | "en_cours" | "termine";

interface Props {
  deliveryData: DeliveryData;
  allShopOrders: Commande[];
  expandedGroupId: string | null;
  toggleGroup: (groupId: string) => void;
  groupSubTab: Record<string, SubTab>;
  setGroupSubTab: React.Dispatch<React.SetStateAction<Record<string, SubTab>>>;
  setDelegateGroup: (group: Commande[]) => void;
  launchableOf: (groupOrders: Commande[]) => Commande[];
  onUpdateStatus: (orderId: string, status: string) => Promise<void | boolean>;
  onDelegate?: (orderId: string, driverId: string) => Promise<void | boolean>;
}

// Etats d'affichage du bouton de groupe, jamais flippes (cf. OrderManagePanel).
const launchedGroups: Record<string, boolean> = {};
const launchingGroups: Record<string, boolean> = {};

/** Liste « Termine » : groupes Express / Sur place / creneaux + sous-onglets de livraison. */
export function WorkFinishedList({
  deliveryData,
  allShopOrders,
  expandedGroupId,
  toggleGroup,
  groupSubTab,
  setGroupSubTab,
  setDelegateGroup,
  launchableOf,
  onUpdateStatus,
  onDelegate,
}: Props) {
  const renderUserGroup = (orders: Commande[], groupId?: string) => {
    const isForced = groupId ? launchedGroups[groupId] : false;
    return (
      <MerchantOrderCard
        key={orders[0].id}
        order={orders[0]}
        allOrders={orders}
        groupPool={allShopOrders}
        isForceLaunched={isForced}
        onUpdateStatus={async (status) => {
          await Promise.all(orders.map((o) => onUpdateStatus(o.id, status)));
        }}
        onDelegate={
          onDelegate
            ? async (driverId) => {
                await Promise.all(
                  orders.map((o) => onDelegate(o.id, driverId)),
                );
              }
            : undefined
        }
      />
    );
  };

  /**
   * Rend les sous-tabs En attente / En cours + les cartes filtrées
   * pour un groupe de userGroups donné (Express ou slot horaire).
   */
  const renderGroupWithSubTabs = (
    userGroups: Commande[][],
    groupId: string,
  ) => {
    const activeSubTab = groupSubTab[groupId] ?? "en_attente";

    // Répartition par statut de LIVRAISON :
    //  - En attente : prête à livrer, pas encore lancée (`finished`)
    //  - En cours   : course lancée (`delivering`)
    //  - Terminé    : livrée (`delivered`)
    const allGroupOrders = userGroups.flat();
    const enAttenteOrders = allGroupOrders.filter(
      (o) => o.status === "finished",
    );
    const enCoursOrders = allGroupOrders.filter(
      (o) => o.status === "delivering",
    );
    const deliveredOrders = allGroupOrders.filter(
      (o) => o.status === "delivered",
    );

    // Regroupe par utilisateur pour chaque sous-liste
    const groupByUser = (ordersArr: Commande[]): Commande[][] => {
      const userMap: Record<string, Commande[]> = {};
      ordersArr.forEach((o) => {
        const key =
          o.userId || o.userData?.email || o.id || `anon_${Math.random()}`;
        if (!userMap[key]) userMap[key] = [];
        userMap[key].push(o);
      });
      return Object.values(userMap);
    };

    const enAttenteGroups = groupByUser(enAttenteOrders);
    const enCoursGroups = groupByUser(enCoursOrders);
    const deliveredGroups = groupByUser(deliveredOrders);
    const activeGroups =
      activeSubTab === "en_cours"
        ? enCoursGroups
        : activeSubTab === "termine"
          ? deliveredGroups
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
          onPress={() =>
            setGroupSubTab((prev) => ({ ...prev, [groupId]: key }))
          }
        >
          <Text
            style={[styles.subTabLabel, active && styles.subTabLabelActive]}
          >
            {label}
          </Text>
          {count > 0 && (
            <View
              style={[styles.subTabBadge, active && styles.subTabBadgeActive]}
            >
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
        {/* Sous-tabs En attente / En cours / Terminé */}
        <View style={styles.subTabRow}>
          {renderSubTab("en_attente", tr("En attente"), enAttenteOrders.length)}
          {renderSubTab("en_cours", tr("En cours"), enCoursOrders.length)}
          {renderSubTab("termine", tr("Terminé"), deliveredOrders.length)}
        </View>

        {/* Liste des commandes du sous-tab actif */}
        {activeGroups.length === 0 ? (
          <View style={styles.subTabEmpty}>
            <Text style={styles.subTabEmptyText}>
              {activeSubTab === "en_cours"
                ? tr("Aucune livraison en cours")
                : activeSubTab === "termine"
                  ? tr("Aucune livraison terminée")
                  : tr("Aucune commande en attente")}
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


  return (
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

                      {/* Masqué si aucune commande lançable (toutes déjà déléguées/lancées). */}
                      {launchableOf(deliveryData.expressGroups.flat()).length >
                        0 && (
                        <TouchableOpacity
                          style={[
                            styles.btnLaunchGroup,
                            launchedGroups["express"] &&
                              styles.btnLaunchGroupLaunched,
                          ]}
                          onPress={(e) => {
                            e.stopPropagation();
                            // Ouvre le sélecteur "qui livre" : uniquement les lançables.
                            setDelegateGroup(
                              launchableOf(deliveryData!.expressGroups.flat()),
                            );
                          }}
                          disabled={launchingGroups["express"]}
                        >
                          <Text
                            style={[
                              styles.btnLaunchGroupText,
                              launchedGroups["express"] &&
                                styles.btnLaunchGroupTextLaunched,
                            ]}
                          >
                            {launchingGroups["express"] ? "..." : tr("Lancer tout")}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>

                    {expandedGroupId === "express" &&
                      renderGroupWithSubTabs(
                        deliveryData.expressGroups,
                        "express",
                      )}
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
                          name={
                            expandedGroupId === "surplace"
                              ? "chevron-down"
                              : "chevron-forward"
                          }
                          size={12}
                          color="#888780"
                        />
                        <Text style={styles.groupTitle}>{tr("Sur place")}</Text>
                        <View style={styles.groupCountBadge}>
                          <Text style={styles.groupCountText}>
                            {deliveryData.surplaceGroups.length} {tr("commande")}
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
                          <GroupStatusCounts orders={slot.userGroups.flat()} />
                        </View>

                        {/* Masqué si aucune commande lançable dans le créneau. */}
                        {launchableOf(slot.userGroups.flat()).length > 0 && (
                          <TouchableOpacity
                            style={[
                              styles.btnLaunchGroup,
                              isLaunched && styles.btnLaunchGroupLaunched,
                            ]}
                            onPress={(e) => {
                              e.stopPropagation();
                              setDelegateGroup(
                                launchableOf(slot.userGroups.flat()),
                              );
                            }}
                            disabled={launchingGroups[groupId]}
                          >
                            <Text
                              style={[
                                styles.btnLaunchGroupText,
                                isLaunched && styles.btnLaunchGroupTextLaunched,
                              ]}
                            >
                              {launchingGroups[groupId] ? "..." : tr("Lancer tout")}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </TouchableOpacity>

                      {isExpanded &&
                        renderGroupWithSubTabs(slot.userGroups, groupId)}
                    </View>
                  );
                })}
              </View>
  );
}
