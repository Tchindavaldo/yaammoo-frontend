import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, Dimensions, PanResponder, Pressable, Modal,
} from 'react-native';
import { Commande } from '@/src/types';
import { LivraisonTab } from './MerchantOrderLivraisonTab';
import { CommandesTab } from './MerchantOrderCommandesTab';

const SHEET_HEIGHT = 520;

// ─── Types publics (réexportés pour les sous-composants) ──────────────────────
export type OrderItem = {
  name: string;
  qty: number;
  price: string;
  unitPrice?: number;
  hasQty?: boolean;
  type?: 'menu' | 'extra' | 'drink';
};

export type DeliveryUser = {
  initials: string;
  name: string;
  addr: string;
  avColor: string;
  avTextColor: string;
  badgeColor: string;
  orderCount: number;
  rating: number;
  phone: string;
  creneau: string;
  duration: string;
  note: string;
  voiceNoteUri: string;
  orders: OrderItem[];
};

type Tab = 'livraison' | 'commandes';

type Props = {
  order: Commande | null;
  visible: boolean;
  onClose: () => void;
  allOrders?: Commande[];
};

// ─── Couleurs avatar ──────────────────────────────────────────────────────────
const COLORS = [
  { bg: '#EAF3DE', text: '#4B7C16', badge: '#7CB342' },
  { bg: '#FDEBD0', text: '#A04000', badge: '#E67E22' },
  { bg: '#D6EAF8', text: '#1B4F72', badge: '#3498DB' },
  { bg: '#E8DAEF', text: '#512E5F', badge: '#8E44AD' },
];

// ─── Construit la liste des articles d'une commande ───────────────────────────
function buildItems(order: Commande): OrderItem[] {
  const items: OrderItem[] = [];

  // Menu principal
  const priceIdx = ((order as any).selectedPriceIndex || 1) - 1;
  const menuPrice =
    order.menu?.prices?.[priceIdx]?.price ||
    order.menu?.prices?.[0]?.price ||
    (order.menu as any)?.prix1 ||
    0;
  items.push({
    name: order.menu?.titre || order.menu?.name || 'Menu principal',
    qty: order.quantity || 1,
    price: `${menuPrice * (order.quantity || 1)} XAF`,
    unitPrice: menuPrice,
    hasQty: true,
    type: 'menu',
  });

  // Extras — uniquement ceux sélectionnés (status === true)
  (order.extra || []).forEach((ex: any) => {
    if (ex.status === true && ex.name && ex.name !== 'Aucun' && ex.name !== 'Aucune') {
      const p = ex.prix || ex.price || 0;
      items.push({ name: ex.name, qty: 1, price: `${p} XAF`, unitPrice: p, hasQty: false, type: 'extra' });
    }
  });

  // Boissons — uniquement celles sélectionnées (status === true)
  (order.drink || []).forEach((dr: any) => {
    if (dr.status === true && dr.name && dr.name !== 'Aucune' && dr.name !== 'Aucun') {
      const p = dr.prix || dr.price || 0;
      const q = dr.quantite || 1;
      items.push({ name: dr.name, qty: q, price: `${p * q} XAF`, unitPrice: p, hasQty: q > 1, type: 'drink' });
    }
  });

  return items;
}

// ─── Construit le DeliveryUser à partir d'une Commande ───────────────────────
function buildUser(order: Commande): DeliveryUser {
  const first = order.userData?.firstName || 'Client';
  const last = order.userData?.lastName || '';
  const initials = `${first[0]}${last ? last[0] : ''}`.toUpperCase();
  const theme = COLORS[initials.charCodeAt(0) % COLORS.length];

  return {
    initials,
    name: `${first} ${last}`.trim(),
    addr: order.delivery?.location || 'Adresse non spécifiée',
    avColor: theme.bg,
    avTextColor: theme.text,
    badgeColor: theme.badge,
    orderCount: (order as any).rank || 1,
    rating: 4,
    phone: order.delivery?.phone || order.userData?.phoneNumber?.toString() || 'Non fourni',
    creneau: !order.delivery?.status
      ? 'Sur place'
      : order.delivery?.type === 'express'
        ? 'Express'
        : `Période (${order.delivery?.time || 'Dès que possible'})`,
    duration: !order.delivery?.status
      ? 'Immédiat'
      : order.delivery?.type === 'express' ? '15-20 min' : '30-45 min',
    note: order.delivery?.note || 'Aucune note de livraison.',
    voiceNoteUri: order.delivery?.voiceNoteUri || '',
    orders: buildItems(order),
  };
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function MerchantOrderBottomSheet({ order, visible, onClose, allOrders }: Props) {
  const [tab, setTab] = useState<Tab>('livraison');
  const [selectedOrderIdx, setSelectedOrderIdx] = useState(0);
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Commande sélectionnée (globale : pilote Livraison ET Commande)
  const currentOrder = allOrders ? (allOrders[selectedOrderIdx] ?? order) : order;
  const user = currentOrder ? buildUser(currentOrder) : null;
  const total = user ? user.orders.reduce((s, o) => s + (o.unitPrice || 0) * o.qty, 0) : 0;
  const hasMultiple = allOrders && allOrders.length > 1;

  useEffect(() => {
    if (visible && order) {
      translateY.setValue(SHEET_HEIGHT);
      overlayOpacity.setValue(0);
      setTab('livraison');
      setSelectedOrderIdx(0);
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 25, stiffness: 180, mass: 0.8 }),
        Animated.timing(overlayOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, order]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: SHEET_HEIGHT, useNativeDriver: true, damping: 30, stiffness: 250 }),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 5,
      onPanResponderMove: (_, g) => { if (g.dy > 0) translateY.setValue(g.dy); },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 100) handleDismiss();
        else Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  if (!user) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleDismiss}>
      <View style={StyleSheet.absoluteFill} pointerEvents="auto">
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />
        </Animated.View>

        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          {/* Header : avatar + nom + fermer */}
          <View {...panResponder.panHandlers} style={styles.header}>
            <View style={styles.userRow}>
              <View style={[styles.avatar, { backgroundColor: user.avColor }]}>
                <Text style={[styles.avatarText, { color: user.avTextColor }]}>{user.initials}</Text>
                <View style={[styles.badge, { backgroundColor: user.badgeColor }]}>
                  <Text style={styles.badgeText}>{user.orderCount}</Text>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>{user.name}</Text>
                <Text style={styles.userAddr} numberOfLines={1}>{user.addr}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleDismiss} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Top tabs : Livraison | Commande */}
          <View style={styles.tabBar}>
            {(['livraison', 'commandes'] as Tab[]).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.tab, tab === t && styles.tabActive]}
                onPress={() => setTab(t)}
              >
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                  {t === 'livraison' ? 'Livraison' : 'Commande'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Contenu (change avec le tab, réactif à selectedOrderIdx) */}
          {tab === 'livraison' ? (
            <ScrollView
              style={styles.content}
              contentContainerStyle={{ paddingBottom: 16 }}
              showsVerticalScrollIndicator={false}
            >
              <LivraisonTab user={user} />
            </ScrollView>
          ) : (
            <CommandesTab orders={user.orders} total={total} />
          )}

          {/* ── Nav multi-commandes EN BAS (globale : pilote les 2 tabs) ── */}
          {hasMultiple && (
            <View style={styles.navBarContainer}>
              {allOrders!.length > 3 && (
                <TouchableOpacity
                  onPress={() => setSelectedOrderIdx(Math.max(0, selectedOrderIdx - 1))}
                  style={styles.navArrow}
                >
                  <Text style={styles.navArrowText}>{'<'}</Text>
                </TouchableOpacity>
              )}
              
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[
                  styles.navBar,
                  { justifyContent: allOrders!.length > 3 ? 'flex-start' : 'center' }
                ]}
                style={{ flexGrow: 0 }}
              >
                {allOrders!.map((_, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.navTab, selectedOrderIdx === idx && styles.navTabActive]}
                    onPress={() => setSelectedOrderIdx(idx)}
                  >
                    <Text style={[styles.navTabText, selectedOrderIdx === idx && styles.navTabTextActive]}>
                      Cmd {idx + 1}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {allOrders!.length > 3 && (
                <TouchableOpacity
                  onPress={() => setSelectedOrderIdx(Math.min(allOrders!.length - 1, selectedOrderIdx + 1))}
                  style={styles.navArrow}
                >
                  <Text style={styles.navArrowText}>{'>'}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: SHEET_HEIGHT, backgroundColor: '#fff',
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    shadowColor: '#000', shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.12, shadowRadius: 15, elevation: 20,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16,
  },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4,
  },
  avatarText: { fontSize: 14, fontWeight: '700' },
  badge: {
    position: 'absolute', bottom: -2, right: -4,
    borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 2, borderColor: '#fff',
  },
  badgeText: { fontSize: 9, color: '#fff', fontWeight: '800' },
  userName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  userAddr: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  closeBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { fontSize: 14, color: '#4B5563' },
  // Top tabs
  tabBar: { flexDirection: 'row', paddingHorizontal: 20, borderBottomWidth: 1, borderColor: '#F3F4F6' },
  tab: { marginRight: 24, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#111827' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
  tabTextActive: { color: '#111827' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  // Bottom nav (global)
  navBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  navArrow: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  navArrowText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  navBar: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 8,
  },
  navTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  navTabActive: { backgroundColor: '#111827', borderColor: '#111827' },
  navTabText: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  navTabTextActive: { color: '#FFFFFF' },
});
