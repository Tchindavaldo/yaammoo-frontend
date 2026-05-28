import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '@/src/theme';
import { Commande } from '@/src/types';
import { MerchantOrderCard } from './MerchantOrderCard';

type OrderStatus = 'pending' | 'proccess' | 'finish';

interface OrderManagePanelProps {
  orders: Commande[];
  loading: boolean;
  onRefresh: () => void;
  onUpdateStatus: (orderId: string, status: string) => Promise<void | boolean>;
}

export const OrderManagePanel: React.FC<OrderManagePanelProps> = ({
  orders,
  loading,
  onRefresh,
  onUpdateStatus,
}) => {
  console.log('📦 OrderManagePanel received orders:', orders.map(o => ({ id: o.id, status: o.status })));
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>('pending');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  // 'express' par défaut pour le tab finished. Les sections passées (pending/proccess)
  // utilisent leur propre clé 'past_<iso>', donc elles restent toutes fermées au départ.
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>('express');
  const [launchedGroups, setLaunchedGroups] = useState<Record<string, boolean>>({});
  const [launchingGroups, setLaunchingGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupId: string) => {
    setExpandedGroupId(prev => (prev === groupId ? null : groupId));
  };

  const launchGroup = async (groupId: string, groupOrders: Commande[]) => {
    setLaunchingGroups(prev => ({ ...prev, [groupId]: true }));
    try {
      await Promise.all(groupOrders.map(o => onUpdateStatus(o.id, 'delivering')));
      setLaunchedGroups(prev => ({ ...prev, [groupId]: true }));
    } finally {
      setLaunchingGroups(prev => ({ ...prev, [groupId]: false }));
    }
  };

  // Helpers de date : retourne YYYY-MM-DD à partir d'une commande (clé stable)
  const getOrderDateISO = (order: Commande): string => {
    const deliveryDate = order.delivery?.date;
    const dateStr = deliveryDate || order.createdAt || '';
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
  const tomorrowISO = (() => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return t.toISOString().substring(0, 10);
  })();

  // Format d'affichage pour un chip / header de section
  const formatDateLabel = (iso: string): string => {
    if (iso === todayISO) return "Aujourd'hui";
    if (iso === tomorrowISO) return 'Demain';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
    } catch {
      return iso;
    }
  };


  const statusMap: Record<OrderStatus, string[]> = {
    pending: ['pending'],
    proccess: ['processing', 'active', 'in_progress'],
    finish: ['completed', 'finished', 'done', 'delivering'],
  };

   const filteredOrders = orders.filter((o) =>
    statusMap[selectedStatus].includes(o.status)
  );

  // Dates uniques (ISO YYYY-MM-DD) disponibles pour ce statut
  const availableDateISOs = useMemo(() => {
    return [...new Set(filteredOrders.map(getOrderDateISO))];
  }, [filteredOrders]);

  // Ordre des chips : futures (asc) → aujourd'hui → passées (desc)
  const sortedDateISOs = useMemo(() => {
    const futures = availableDateISOs.filter((d) => d > todayISO).sort();
    const past = availableDateISOs.filter((d) => d < todayISO).sort().reverse();
    const hasToday = availableDateISOs.includes(todayISO);
    return [...futures, ...(hasToday ? [todayISO] : []), ...past];
  }, [availableDateISOs]);

  // Sections passées (uniquement pour la vue par défaut pending/processing)
  const pastDateISOs = useMemo(() => {
    return availableDateISOs.filter((d) => d < todayISO).sort().reverse();
  }, [availableDateISOs]);

  const todayLabel = "Aujourd'hui";
  const currentDate = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

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
    const filtered = filteredOrders.filter((o) => getOrderDateISO(o) === isoFilter);
    if (selectedStatus === 'pending' || selectedStatus === 'proccess') {
      return sortByRank(filtered);
    }
    return filtered;
  }, [filteredOrders, selectedDate, selectedStatus]);

  // Groupes par date passée (uniquement quand aucun chip n'est sélectionné et statut pending/proccess)
  const pastSections = useMemo(() => {
    if (selectedDate) return [];
    if (selectedStatus !== 'pending' && selectedStatus !== 'proccess') return [];
    return pastDateISOs.map((iso) => ({
      iso,
      label: formatDateLabel(iso),
      orders: sortByRank(filteredOrders.filter((o) => getOrderDateISO(o) === iso)),
    }));
  }, [pastDateISOs, selectedDate, selectedStatus, filteredOrders]);

  const counts = {
    pending: orders.filter((o) => statusMap.pending.includes(o.status)).length,
    proccess: orders.filter((o) => statusMap.proccess.includes(o.status)).length,
    finish: orders.filter((o) => statusMap.finish.includes(o.status)).length,
  };

  const totalAmount = dateFilteredOrders.reduce((acc, o) => acc + (o.total || 0), 0);

  const statusTabs: { key: OrderStatus; label: string; icon: string }[] = [
    { key: 'pending', label: 'En Attente', icon: 'time-outline' },
    { key: 'proccess', label: 'En cours', icon: 'restaurant-outline' },
    { key: 'finish', label: 'Terminées', icon: 'checkmark-done-outline' },
  ];

  const getRelativeDateLabel = (dateISO: string | null) => {
    if (!dateISO) return "aujourd'hui";
    return formatDateLabel(dateISO).toLowerCase();
  };

  // Grouping logic for the finished orders design (Untitled-1 style)
  const deliveryData = useMemo(() => {
    if (selectedStatus !== 'finish') return null;

    const express: Commande[] = [];
    const scheduled: Record<string, Commande[]> = {};

    dateFilteredOrders.forEach((o) => {
      const d = (o as any).delivery;
      const isExpress = d?.type === "express";
      if (isExpress) {
        express.push(o);
      } else {
        // Use delivery.time first, then fallback to livraison.hour
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
          await Promise.all(orders.map(o => onUpdateStatus(o.id, status)));
        }}
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* Date Header Row */}
      <View style={styles.dateHeader}>
        <View style={styles.dateInfo}>
          <Text style={styles.relativeDate}>{getRelativeDateLabel(selectedDate)}</Text>
          <Text style={styles.fullDate}>{currentDate}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateScroll}>
          {sortedDateISOs.map((iso) => {
            const isSelected =
              (selectedDate === null && iso === todayISO) || selectedDate === iso;
            return (
              <TouchableOpacity
                key={iso}
                style={[styles.dateChip, isSelected && styles.dateChipActive]}
                onPress={() => setSelectedDate((prev) => (prev === iso ? null : iso))}
              >
                <Text style={[styles.dateChipText, isSelected && styles.dateChipTextActive]}>
                  {formatDateLabel(iso)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
             <Text style={styles.statVal}>{dateFilteredOrders.length}</Text>
             <Text style={{ fontSize: 25, color: '#b84e4e', marginLeft: 8, fontWeight: '900' }}>cmd</Text>
          </View>
          <Text style={styles.statLbl}>Commandes effectue</Text>
        </View>
        <View style={styles.statBox}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={styles.statVal}>{totalAmount}</Text>
            <Text style={{ fontSize: 25, color: '#b84e4e', marginLeft: 8, fontWeight: '900' }}>fcfa</Text>
          </View>
          <Text style={styles.statLbl}>Montant Total</Text>
        </View>
      </View>

      {/* Status Chips Row */}
      <View style={styles.statusScrollContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusScrollContent}>
          {statusTabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.statusTab, selectedStatus === tab.key && styles.statusTabActive]}
              onPress={() => { setSelectedStatus(tab.key); setSelectedDate(null); }}
            >
              <Ionicons
                name={tab.icon as any}
                size={14}
                color={selectedStatus === tab.key ? 'white' : 'red'}
              />
              <Text style={[
                styles.statusTabLabel,
                { color: selectedStatus === tab.key ? 'white' : 'red' },
              ]}>
                {tab.label}
              </Text>
              <Text style={[
                styles.statusTabLabel,
                { fontWeight: '900', marginLeft: 4, color: selectedStatus === tab.key ? 'white' : 'red' },
              ]}>
                ({counts[tab.key]})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Conditional List Rendering */}
      {selectedStatus === 'finish' ? (
        <ScrollView 
          style={styles.container} 
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={onRefresh} />
          }
        >
          {dateFilteredOrders.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-done-outline" size={50} color="#D3D1C7" />
              <Text style={styles.emptyText}>Aucune commande terminée</Text>
            </View>
          ) : deliveryData && (
            <View style={{ paddingHorizontal: 16 }}>
              {deliveryData.expressGroups.length > 0 && (
                <View style={{ marginBottom: 15 }}>
                  <TouchableOpacity 
                    activeOpacity={0.7} 
                    onPress={() => toggleGroup('express')}
                    style={styles.groupHeader}
                  >
                    <View style={styles.groupHeaderLeft}>
                      <Ionicons 
                        name={expandedGroupId === 'express' ? "chevron-down" : "chevron-forward"} 
                        size={12} 
                        color="#888780" 
                      />
                      <Text style={styles.groupTitle}>Express</Text>
                      <View style={styles.groupCountBadge}>
                        <Text style={styles.groupCountText}>
                          {deliveryData.expressGroups.length} livraison{deliveryData.expressGroups.length > 1 ? 's' : ''}
                        </Text>
                      </View>
                    </View>
                    
                    <TouchableOpacity
                       style={[styles.btnLaunchGroup, launchedGroups['express'] && styles.btnLaunchGroupLaunched]}
                       onPress={(e) => {
                         e.stopPropagation();
                         launchGroup('express', deliveryData!.expressGroups.flat());
                       }}
                       disabled={launchedGroups['express'] || launchingGroups['express']}
                    >
                       <Text style={[styles.btnLaunchGroupText, launchedGroups['express'] && styles.btnLaunchGroupTextLaunched]}>
                         {launchingGroups['express'] ? "..." : launchedGroups['express'] ? "Lancé ✓" : "Lancer tout"}
                       </Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                  
                  {expandedGroupId === 'express' && (
                    <View style={{ gap: 6 }}>
                      {deliveryData.expressGroups.map(group => renderUserGroup(group, 'express'))}
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
                          name={isExpanded ? "chevron-down" : "chevron-forward"} 
                          size={12} 
                          color="#888780" 
                        />
                        <Text style={styles.groupTitle}>{slot.title}</Text>
                        <View style={styles.groupCountBadge}>
                          <Text style={styles.groupCountText}>
                            {slot.userGroups.length} livraison{slot.userGroups.length > 1 ? 's' : ''}
                          </Text>
                        </View>
                      </View>
                      
                      <TouchableOpacity
                         style={[styles.btnLaunchGroup, isLaunched && styles.btnLaunchGroupLaunched]}
                         onPress={(e) => {
                           e.stopPropagation();
                           launchGroup(groupId, slot.userGroups.flat());
                         }}
                         disabled={isLaunched || launchingGroups[groupId]}
                      >
                         <Text style={[styles.btnLaunchGroupText, isLaunched && styles.btnLaunchGroupTextLaunched]}>
                           {launchingGroups[groupId] ? "..." : isLaunched ? "Lancé ✓" : "Lancer tout"}
                         </Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                    
                    {isExpanded && (
                      <View style={{ gap: 6 }}>
                        {slot.userGroups.map(group => renderUserGroup(group, groupId))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
        >
          {/* Liste principale (aujourd'hui par défaut, ou date du chip sélectionné) */}
          {dateFilteredOrders.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name={selectedStatus === 'pending' ? 'time-outline' : 'restaurant-outline'}
                size={50}
                color={Theme.colors.gray[300]}
              />
              <Text style={styles.emptyText}>
                {selectedStatus === 'pending'
                  ? 'Aucune commande en attente'
                  : 'Aucune commande en cours'}
              </Text>
            </View>
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
          {pastSections.length > 0 && (
            <View style={{ marginTop: 24, paddingHorizontal: 16 }}>
              <Text style={styles.sectionLabel}>Commandes des jours précédents</Text>
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
                          name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                          size={12}
                          color="#888780"
                        />
                        <Text style={styles.groupTitle}>{section.label}</Text>
                        <View style={styles.groupCountBadge}>
                          <Text style={styles.groupCountText}>
                            {section.orders.length} commande
                            {section.orders.length > 1 ? 's' : ''}
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
                            onUpdateStatus={(status) => onUpdateStatus(item.id, status)}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: 'white',
  },
  dateInfo: {
    marginRight: 10,
    minWidth: 100,
  },
  relativeDate: {
    fontSize: 18,
    fontWeight: 'normal',
    color: '#333',
    textTransform: 'capitalize',
  },
  fullDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  dateScroll: {
    gap: 10,
  },
  dateChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: '#fff5f5',
    marginRight: 8,
    minWidth: 50,
    alignItems: 'center',
  },
  dateChipActive: {
    backgroundColor: 'rgba(236,73,19,1.00)',
  },
  dateChipText: {
    fontSize: 12,
    color: 'black',
    fontWeight: 'bold',
  },
  dateChipTextActive: {
    color: 'white',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 15,
    gap: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f8f8',
  },
  statBox: {
    flex: 1,
    alignItems: 'flex-start',
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  statVal: {
    fontSize: 31,
    fontWeight: '900',
    color: 'black',
  },
  statLbl: {
    fontSize: 11,
    color: 'rgba(0,0,0,0.44)',
    fontWeight: 'bold',
    marginTop: 2,
  },
  statusScrollContainer: {
    backgroundColor: 'white',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statusScrollContent: {
    paddingHorizontal: 15,
    gap: 8,
  },
  statusTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#fff5f5',
    marginRight: 8,
    height: 32,
  },
  statusTabActive: {
    backgroundColor: 'rgba(236,73,19,1.00)',
  },
  statusTabLabel: {
    fontSize: 10,
    color: 'black',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  statusTabLabelActive: {
    color: 'white',
  },
  listContent: {
    paddingVertical: 15,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: Theme.colors.gray[500],
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888780',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 10,
    marginBottom: 10,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 4,
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
  },
  groupCountBadge: {
    backgroundColor: '#FFF',
    borderWidth: 0.5,
    borderColor: '#D3D1C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  groupCountText: {
    fontSize: 10,
    color: '#5F5E5A',
    fontWeight: '500',
  },
  btnLaunchGroup: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(236,73,19,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(236,73,19,1.00)',
  },
  btnLaunchGroupText: {
    fontSize: 9,
    fontWeight: '900',
    color: 'rgba(236,73,19,1.00)',
    textTransform: 'uppercase',
  },
  btnLaunchGroupLaunched: {
    backgroundColor: '#C0DD97',
    borderColor: '#C0DD97',
  },
  btnLaunchGroupTextLaunched: {
    color: '#27500A',
  },
});
