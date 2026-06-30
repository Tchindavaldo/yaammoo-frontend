// Web-specific version of MerchantOrderBottomSheet
// react-native-maps is not supported on web, so we replace MapView with a static placeholder
import { Commande } from "@/src/types";
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Linking from 'expo-linking';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = 480;

export type OrderItem = {
  name: string;
  qty: number;
  price: string;
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

type Props = {
  order: Commande | null;
  visible: boolean;
  onClose: () => void;
  allOrders?: Commande[];
};

type Tab = 'livraison' | 'commandes';

const COLORS = [
  { bg: '#EAF3DE', text: '#4B7C16', badge: '#7CB342' },
  { bg: '#FDEBD0', text: '#A04000', badge: '#E67E22' },
  { bg: '#D6EAF8', text: '#1B4F72', badge: '#3498DB' },
  { bg: '#E8DAEF', text: '#512E5F', badge: '#8E44AD' },
];

function buildItems(order: Commande): OrderItem[] {
  const items: OrderItem[] = [];

  const priceIdx = ((order as any).selectedPriceIndex || 1) - 1;
  const menuPrice = order.menu?.prices?.[priceIdx]?.price || order.menu?.prices?.[0]?.price || (order.menu as any)?.prix1 || 0;
  
  items.push({
    name: order.menu?.titre || order.menu?.name || "Menu principal",
    qty: order.quantity || order.quantite || 1,
    price: `${menuPrice * (order.quantity || order.quantite || 1)} XAF`,
    unitPrice: menuPrice,
    hasQty: true,
  } as any);

  const extras = order.extra || (order as any).embalage || [];
  extras.forEach((ex: any) => {
    if (ex.status === true && ex.name && ex.name !== "Aucun" && ex.name !== "Aucune") {
      const p = ex.prix || ex.price || 0;
      items.push({ name: ex.name || ex.type, qty: 1, price: `${p} XAF`, unitPrice: p, hasQty: false } as any);
    }
  });

  const drinks = order.drink || [(order as any).boisson];
  drinks.forEach((dr: any) => {
    if (dr && dr.status === true && dr.name && dr.name !== "Aucune" && dr.name !== "Aucun") {
      const p = dr.prix || dr.price || 0;
      const q = dr.quantite || 1;
      items.push({ name: dr.name || dr.type, qty: q, price: `${p * q} XAF`, unitPrice: p, hasQty: q > 1 } as any);
    }
  });

  return items;
}

function buildUser(order: Commande): DeliveryUser {
  const customerFirstName = order.userData?.firstName || "Client";
  const customerLastName = order.userData?.lastName || "";
  const initials = `${customerFirstName[0]}${customerLastName ? customerLastName[0] : ""}`.toUpperCase();
  const theme = COLORS[initials.charCodeAt(0) % COLORS.length];

  return {
    initials,
    name: `${customerFirstName} ${customerLastName}`.trim(),
    addr: order.delivery?.location || (order as any).livraison?.address || "Adresse non spécifiée",
    avColor: theme.bg,
    avTextColor: theme.text,
    badgeColor: theme.badge,
    orderCount: (order as any).rank || 1,
    rating: 4,
    phone: order.delivery?.phone || (order as any).livraison?.phone || order.userData?.phoneNumber?.toString() || "Non fourni",
    creneau: !order.delivery?.status
      ? "Sur place"
      : order.delivery?.type === 'express'
        ? "Express"
        : `Période (${order.delivery?.time || (order as any).livraison?.hour || "Dès que possible"})`,
    duration: !order.delivery?.status
      ? "Immédiat"
      : order.delivery?.type === 'express' ? "15-20 min" : "30-45 min",
    note: order.delivery?.note || (order as any).livraison?.note || "Aucune note de livraison.",
    voiceNoteUri: order.delivery?.voiceNoteUri || (order as any).livraison?.voiceNoteUri || "",
    orders: buildItems(order)
  };
}

export default function MerchantOrderBottomSheet({ order, visible, onClose, allOrders }: Props) {
  const [tab, setTab] = useState<Tab>('livraison');
  const [selectedOrderIdx, setSelectedOrderIdx] = useState(0);
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const currentOrder = allOrders ? (allOrders[selectedOrderIdx] ?? order) : order;
  const user = currentOrder ? buildUser(currentOrder) : null;
  const hasMultiple = allOrders && allOrders.length > 1;

  useEffect(() => {
    if (visible && order) {
      translateY.setValue(SHEET_HEIGHT);
      overlayOpacity.setValue(0);
      setTab('livraison');
      setSelectedOrderIdx(0);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 25,
          stiffness: 180,
          mass: 0.8,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, order]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: SHEET_HEIGHT,
        useNativeDriver: true,
        damping: 30,
        stiffness: 250,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 5,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 100) {
          handleDismiss();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  if (!user) return null;

  const total = user.orders.reduce((sum, o: any) => sum + ((o.unitPrice || 0) * (o.qty || 1)), 0);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleDismiss}
    >
      <View style={StyleSheet.absoluteFill} pointerEvents="auto">
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />
        </Animated.View>

        <Animated.View
          style={[styles.sheet, { transform: [{ translateY }] }]}
        >
          <View {...panResponder.panHandlers} style={styles.header}>
            <View style={styles.userRow}>
              <View style={[styles.avatar, { backgroundColor: user.avColor }]}>
                <Text style={[styles.avatarText, { color: user.avTextColor }]}>
                  {user.initials}
                </Text>
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

          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tab, tab === 'livraison' && styles.tabActive]}
              onPress={() => setTab('livraison')}
            >
              <Text style={[styles.tabText, tab === 'livraison' && styles.tabTextActive]}>
                Livraison
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, tab === 'commandes' && styles.tabActive]}
              onPress={() => setTab('commandes')}
            >
              <Text style={[styles.tabText, tab === 'commandes' && styles.tabTextActive]}>
                Commandes
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          >
            {tab === 'livraison' ? (
              <LivraisonTab user={user} />
            ) : (
              <CommandesTab orders={user.orders} total={total} />
            )}
          </ScrollView>

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

// Web map placeholder — uses Google Maps link instead of native MapView
function WebMapPlaceholder({ addr, onPress }: { addr: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.mapPlaceholder, { height: '100%', marginBottom: 0, overflow: 'hidden', borderRadius: 12 }]}
    >
      <View style={styles.mapGridH} />
      <View style={styles.mapGridV} />
      <View style={styles.pinContainer}>
        <View style={styles.pinRing} />
        <View style={styles.pinDot} />
      </View>
      <Text style={styles.mapLabel} numberOfLines={1}>{addr}</Text>
      <View style={styles.webMapTag}>
        <Ionicons name="map-outline" size={10} color="#6B7280" />
        <Text style={styles.webMapTagText}>Ouvrir Maps</Text>
      </View>
    </TouchableOpacity>
  );
}

function LivraisonTab({ user }: { user: DeliveryUser }) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);

  const parseLocation = (addr: string) => {
    if (!addr) return null;
    const parts = addr.split(',').map(p => parseFloat(p.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return { latitude: parts[0], longitude: parts[1] };
    }
    return null;
  };

  const coords = parseLocation(user.addr);

  const openInMaps = () => {
    if (!coords) return;
    const { latitude, longitude } = coords;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    Linking.openURL(url);
  };

  async function playSound() {
    if (!user.voiceNoteUri) return;
    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          const status = await sound.getStatusAsync();
          if (status.isLoaded && status.positionMillis >= (status.durationMillis || 0)) {
            await sound.setPositionAsync(0);
          }
          await sound.playAsync();
          setIsPlaying(true);
        }
        return;
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: user.voiceNoteUri },
        { shouldPlay: true }
      );
      setSound(newSound);
      setIsPlaying(true);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          if (status.durationMillis) {
            setPlaybackProgress(status.positionMillis / status.durationMillis);
          }
          if (status.didJustFinish) {
            setIsPlaying(false);
            setPlaybackProgress(0);
          }
        }
      });
    } catch (error) {
      console.log('Error playing sound', error);
    }
  }

  useEffect(() => {
    return sound
      ? () => { sound.unloadAsync(); }
      : undefined;
  }, [sound]);

  return (
    <>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10, height: 110 }}>
        <View style={{ width: '42%', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <InfoCard label="Créneau" value={user.creneau} compact />
          </View>
          <View style={{ flex: 1 }}>
            <InfoCard label="Téléphone" value={user.phone} small compact />
          </View>
        </View>

        <View style={{ flex: 1 }}>
          <WebMapPlaceholder addr={user.addr} onPress={openInMaps} />
        </View>
      </View>

      <View style={[styles.infoCard, { marginTop: 12, padding: 12 }]}>
        <Text style={styles.infoLabel}>Note de livraison</Text>
        <Text style={styles.infoValSm}>{user.note}</Text>
      </View>

      {user.voiceNoteUri ? (
        <>
          <Text style={[styles.infoLabel, { marginTop: 14, marginBottom: 8 }]}>Message vocal</Text>
          <TouchableOpacity
            style={styles.voiceBar}
            activeOpacity={0.7}
            onPress={playSound}
          >
            <View style={styles.playBtn}>
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={16}
                color="#ec4913"
              />
            </View>
            <Waveform active={isPlaying} progress={playbackProgress} />
            <Text style={styles.waveDur}>{isPlaying ? `${Math.round(playbackProgress * 100)}%` : "0:18"}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={[styles.infoCard, { marginTop: 12, padding: 12, opacity: 0.5 }]}>
          <Text style={styles.infoLabel}>Message vocal</Text>
          <Text style={styles.infoValSm}>Aucun message vocal</Text>
        </View>
      )}
    </>
  );
}

function CommandesTab({ orders, total }: { orders: OrderItem[]; total: number }) {
  return (
    <View style={styles.infoCard}>
      {orders.map((o, i) => (
        <View
          key={i}
          style={[
            styles.cmdRow,
            i < orders.length - 1 && styles.cmdRowBorder,
          ]}
        >
          <View style={styles.cmdIcon}>
            <Text style={{ fontSize: 12 }}>📦</Text>
          </View>
          <Text style={styles.cmdName}>{o.name}</Text>
          <Text style={styles.cmdQty}>x{o.qty}</Text>
          <Text style={styles.cmdPrice}>{o.price}</Text>
        </View>
      ))}
      <View style={styles.cmdTotal}>
        <Text style={styles.cmdTotalLabel}>Total</Text>
        <Text style={styles.cmdTotalVal}>
          {total} XAF
        </Text>
      </View>
    </View>
  );
}

function InfoCard({
  label,
  value,
  small,
  compact,
  renderValue,
}: {
  label: string;
  value: string;
  small?: boolean;
  compact?: boolean;
  renderValue?: () => React.ReactNode;
}) {
  return (
    <View style={[styles.infoCard, compact && { padding: 10 }]}>
      <Text style={[styles.infoLabel, compact && { marginBottom: 2, fontSize: 9 }]}>{label}</Text>
      {renderValue ? (
        renderValue()
      ) : (
        <Text style={[
          small ? styles.infoValSm : styles.infoVal,
          compact && { fontSize: 13, lineHeight: 18 }
        ]}>{value}</Text>
      )}
    </View>
  );
}

function Waveform({ active, progress = 0 }: { active?: boolean; progress?: number }) {
  const heights = [4, 7, 12, 6, 10, 14, 8, 5, 11, 9, 13, 6, 8, 12, 5, 10, 7, 14, 6, 9, 11, 4, 8, 12, 7, 5, 10, 13, 6, 9];
  return (
    <View style={styles.wave}>
      {heights.map((h, i) => {
        const barProgress = (i + 1) / heights.length;
        const isPlayed = progress >= barProgress;
        return (
          <View
            key={i}
            style={[
              styles.wavebar,
              { height: h },
              (active && isPlayed) && { backgroundColor: '#ec4913' },
              (active && !isPlayed) && { backgroundColor: 'rgba(236,19,49,0.2)' }
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.12,
    shadowRadius: 15,
    elevation: 20,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 2, paddingBottom: 16 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  avatarText: { fontSize: 14, fontWeight: '700' },
  badge: { position: 'absolute', bottom: -2, right: -4, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 2, borderColor: '#fff' },
  badgeText: { fontSize: 9, color: '#fff', fontWeight: '800' },
  userName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  userAddr: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  closeBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 14, color: '#4B5563' },
  tabBar: { flexDirection: 'row', paddingHorizontal: 20, borderBottomWidth: 1, borderColor: '#F3F4F6' },
  tab: { marginRight: 24, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#111827' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
  tabTextActive: { color: '#111827' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  mapPlaceholder: { backgroundColor: '#F3F4F6', borderRadius: 20, marginBottom: 8, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', borderWidth: 1, borderColor: '#E5E7EB' },
  mapGridH: { position: 'absolute', left: 0, right: 0, top: '50%', height: 1, backgroundColor: 'rgba(0,0,0,0.03)' },
  mapGridV: { position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, backgroundColor: 'rgba(0,0,0,0.03)' },
  pinContainer: { position: 'absolute', top: '35%', left: '51%' },
  pinRing: { position: 'absolute', top: -6, left: -6, width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#EF4444', opacity: 0.3 },
  pinDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#EF4444', borderWidth: 2.5, borderColor: '#fff' },
  mapLabel: { position: 'absolute', bottom: 20, fontSize: 11, fontWeight: '500', color: '#6B7280' },
  webMapTag: { position: 'absolute', bottom: 6, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  webMapTagText: { fontSize: 9, color: '#6B7280', fontWeight: '600' },
  infoCard: { backgroundColor: '#F9FAFB', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#F3F4F6' },
  infoLabel: { fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '700', marginBottom: 6 },
  infoVal: { fontSize: 14, fontWeight: '600', color: '#111827' },
  infoValSm: { fontSize: 13, color: '#374151', lineHeight: 20 },
  voiceBar: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F9FAFB', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#F3F4F6' },
  playBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' },
  wave: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, height: 32 },
  wavebar: { width: 2.5, borderRadius: 2, backgroundColor: '#D1D5DB' },
  waveDur: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', minWidth: 28, textAlign: 'right' },
  cmdRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  cmdRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  cmdIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  cmdName: { flex: 1, fontSize: 13, color: '#374151', fontWeight: '500' },
  cmdQty: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  cmdPrice: { fontSize: 13, fontWeight: '700', color: '#111827' },
  cmdTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, marginTop: 4, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  cmdTotalLabel: { fontSize: 13, fontWeight: '700', color: '#374151' },
  cmdTotalVal: { fontSize: 16, fontWeight: '800', color: '#111827' },
  navBarContainer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  navArrow: { paddingHorizontal: 12, paddingVertical: 8 },
  navArrowText: { fontSize: 18, fontWeight: '800', color: '#111827' },
  navBar: { flexDirection: 'row', gap: 6, paddingHorizontal: 8 },
  navTab: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8,
    backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB',
  },
  navTabActive: { backgroundColor: '#111827', borderColor: '#111827' },
  navTabText: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  navTabTextActive: { color: '#FFFFFF' },
});
