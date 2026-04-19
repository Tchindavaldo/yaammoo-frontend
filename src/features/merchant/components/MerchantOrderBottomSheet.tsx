import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  Modal,
} from 'react-native';
import { Commande } from "@/src/types";
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import MapComponent from '@/src/components/MapComponent';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = 480;

export type OrderItem = {
  name: string;
  qty: number;
  price: string;
  unitPrice?: number;
  hasQty?: boolean;
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

// Helper function to build order items with correct prices
function buildItems(order: Commande): OrderItem[] {
  const items: OrderItem[] = [];

  // Menu principal - use selectedPriceIndex to pick the right price from prices array
  const priceIdx = ((order as any).selectedPriceIndex || 1) - 1;
  const menuPrice = order.menu?.prices?.[priceIdx]?.price || order.menu?.prices?.[0]?.price || 0;
  items.push({
    name: order.menu?.titre || order.menu?.name || "Menu principal",
    qty: order.quantity || 1,
    price: `${menuPrice * (order.quantity || 1)} F`,
    unitPrice: menuPrice,
    hasQty: true,
  });

  // Extras - uniquement ceux sélectionnés (status === true), sans quantité
  const extras = order.extra || [];
  extras.forEach((ex: any) => {
    if (ex.status === true && ex.name !== "Aucun") {
      const exPrice = ex.prix || ex.price || 0;
      items.push({ name: ex.name, qty: 1, price: `${exPrice} F`, unitPrice: exPrice, hasQty: false });
    }
  });

  // Boissons - uniquement celles sélectionnées avec leur vraie quantité
  const drinks = order.drink || [];
  drinks.forEach((dr: any) => {
    if (dr.status === true && dr.name !== "Aucune") {
      const drPrice = dr.prix || dr.price || 0;
      const drQty = dr.quantite || 1;
      items.push({ name: dr.name, qty: drQty, price: `${drPrice * drQty} F`, unitPrice: drPrice, hasQty: true });
    }
  });

  return items;
}

export default function MerchantOrderBottomSheet({ order, visible, onClose, allOrders }: Props) {
  const [tab, setTab] = useState<Tab>('livraison');
  const [selectedOrderIdx, setSelectedOrderIdx] = useState(0);
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [user, setUser] = useState<DeliveryUser | null>(null);

  useEffect(() => {
    if (order) {
      // Déterminer la commande à afficher (sélectionnée ou première)
      const selectedOrder = allOrders ? allOrders[selectedOrderIdx] || order : order;

      // Construire les items avec la fonction helper
      const items = buildItems(selectedOrder);

      const customerFirstName = selectedOrder.userData?.firstName || "Client";
      const customerLastName = selectedOrder.userData?.lastName || "";
      const initials = `${customerFirstName[0]}${customerLastName ? customerLastName[0] : ""}`.toUpperCase();
      const theme = COLORS[initials.charCodeAt(0) % COLORS.length];

      setUser({
        initials,
        name: `${customerFirstName} ${customerLastName}`,
        addr: selectedOrder.delivery?.location || "Adresse non spécifiée",
        avColor: theme.bg,
        avTextColor: theme.text,
        badgeColor: theme.badge,
        orderCount: (selectedOrder as any).rank || 1,
        rating: 4,
        phone: selectedOrder.delivery?.phone || selectedOrder.userData?.phoneNumber?.toString() || "Non fourni",
        creneau: !selectedOrder.delivery?.type || selectedOrder.delivery?.type === 'aucun'
          ? "Sur place"
          : selectedOrder.delivery?.type === 'express'
            ? "Express"
            : `Période (${selectedOrder.delivery?.time || "Dès que possible"})`,
        duration: !selectedOrder.delivery?.type || selectedOrder.delivery?.type === 'aucun'
          ? "Immédiat"
          : selectedOrder.delivery?.type === 'express' ? "15-20 min" : "30-45 min",
        note: selectedOrder.delivery?.note || "Aucune note de livraison.",
        voiceNoteUri: selectedOrder.delivery?.voiceNoteUri || "",
        orders: items
      });
    }
  }, [order, allOrders, selectedOrderIdx]);

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

  const total = user.orders.reduce((sum, o) => sum + (o.unitPrice || 0) * o.qty, 0);

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
          <View {...panResponder.panHandlers} style={styles.dragZone}>
            <View style={styles.handle} />
          </View>

          <View style={styles.header}>
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

          {tab === 'livraison' ? (
            <ScrollView
              style={styles.content}
              contentContainerStyle={{ paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
            >
              <LivraisonTab user={user} />
            </ScrollView>
          ) : (
            <CommandesTab
              orders={user.orders}
              total={total}
              allOrders={allOrders}
              selectedIdx={selectedOrderIdx}
              onSelectOrder={setSelectedOrderIdx}
            />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

function LivraisonTab({ user }: { user: DeliveryUser }) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0); // 0 to 1
  const [isOpeningMaps, setIsOpeningMaps] = useState(false);
  const [region, setRegion] = useState<any>(null);

  const parseLocation = (addr: string) => {
    if (!addr || typeof addr !== 'string') return null;
    // Basic regex to check if it looks like coords
    if (!/^-?\d+\.\d+,\s*-?\d+\.\d+$/.test(addr)) return null;
    
    const parts = addr.split(',').map(p => parseFloat(p.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return { latitude: parts[0], longitude: parts[1] };
    }
    return null;
  };

  const coords = React.useMemo(() => parseLocation(user.addr), [user.addr]);

  useEffect(() => {
    if (coords) {
      setRegion({
        ...coords,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
    } else {
      setRegion(null);
    }
  }, [coords]);

  const openInMaps = () => {
    if (!coords) return;
    setIsOpeningMaps(true);
    const { latitude, longitude } = coords;
    const label = encodeURIComponent(user.name);
    
    const url = Platform.select({
      ios: `maps://app?daddr=${latitude},${longitude}&label=${label}`,
      android: `google.navigation:q=${latitude},${longitude}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
    });

    Linking.canOpenURL(url).then(supported => {
      const finalUrl = supported ? url : `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
      Linking.openURL(finalUrl).finally(() => {
        setTimeout(() => setIsOpeningMaps(false), 2000);
      });
    });
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

      console.log('Loading Sound');
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
      ? () => {
          console.log('Unloading Sound');
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  return (
    <>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10, height: 110 }}>
        {/* Left Column: Fixed height 110px */}
        <View style={{ width: '42%', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <InfoCard label="Créneau" value={user.creneau} compact />
          </View>
          <View style={{ flex: 1 }}>
            <InfoCard label="Téléphone" value={user.phone} small compact />
          </View>
        </View>

        {/* Right Column: Map matching exactly 110px */}
        <View style={{ flex: 1, height: 110 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={openInMaps}
            style={[styles.mapPlaceholder, { overflow: 'hidden', borderRadius: 12, flex: 1 }]}
            disabled={!coords}
          >
            <MapComponent
              region={region}
              coords={coords}
              address={user.addr}
              deliveryType={user.creneau.includes('Express') ? 'express' : 'standard'}
            />

            {isOpeningMaps && (
              <View style={styles.mapLoadingOverlay}>
                <View style={styles.mapLoaderCircle}>
                   <Text style={{ fontSize: 18 }}>📍</Text>
                </View>
                <Text style={styles.mapLoadingText}>Ouverture Maps...</Text>
              </View>
            )}
          </TouchableOpacity>
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

function CommandesTab({
  orders,
  total,
  allOrders,
  selectedIdx,
  onSelectOrder
}: {
  orders: OrderItem[];
  total: number;
  allOrders?: Commande[];
  selectedIdx?: number;
  onSelectOrder?: (idx: number) => void;
}) {
  return (
    <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
      {/* Container arrondi englobant items + total */}
      <View style={[styles.infoCard, { flex: 1, padding: 0, overflow: 'hidden', marginBottom: 12 }]}>
        {/* Items scrollables */}
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 12 }}
        >
          {orders.map((o, i) => {
            const unitPrice = o.unitPrice || 0;
            const lineTotal = unitPrice * o.qty;
            return (
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
                <Text style={[styles.cmdName, { flex: 1 }]}>{o.name}</Text>
                <Text style={styles.cmdPrice}>
                  {o.hasQty ? `${unitPrice} x${o.qty} = ${lineTotal} F` : `${unitPrice} F`}
                </Text>
              </View>
            );
          })}
        </ScrollView>

        {/* Total fixe en bas du container */}
        <View style={{ padding: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
          <View style={styles.cmdTotal}>
            <Text style={styles.cmdTotalLabel}>Total</Text>
            <Text style={styles.cmdTotalVal}>{total} F</Text>
          </View>
        </View>
      </View>

      {/* Nav tab en bas (hors du container, si plusieurs commandes) */}
      {allOrders && allOrders.length > 1 && onSelectOrder && (
        <View style={styles.cmdNavTabs}>
          {allOrders.map((_, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.cmdNavTab,
                selectedIdx === idx && styles.cmdNavTabActive
              ]}
              onPress={() => onSelectOrder(idx)}
            >
              <Text
                style={[
                  styles.cmdNavTabText,
                  selectedIdx === idx && styles.cmdNavTabTextActive
                ]}
              >
                Cmd {idx + 1}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
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

function Stars({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2, marginTop: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Text key={i} style={{ fontSize: 12, color: i <= rating ? '#BA7517' : '#D3D1C7' }}>
          ★
        </Text>
      ))}
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
  dragZone: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#E5E7EB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: '800',
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  userAddr: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    color: '#4B5563',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
  },
  tab: {
    marginRight: 24,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#111827',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  tabTextActive: {
    color: '#111827',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  mapPlaceholder: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  mapGridH: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  mapGridV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  pinContainer: {
    position: 'absolute',
    top: '35%',
    left: '51%',
  },
  pinRing: {
    position: 'absolute',
    top: -6,
    left: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#EF4444',
    opacity: 0.3,
  },
  pinDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
    borderWidth: 2.5,
    borderColor: '#fff',
  },
  mapLabel: {
    position: 'absolute',
    bottom: 10,
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
  },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mapLoaderCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mapLoadingText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ec4913',
    textTransform: 'uppercase',
  },
  grid2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
    marginTop: 12,
  },
  infoCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '700',
    marginBottom: 6,
  },
  infoVal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  infoValSm: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
  },
  voiceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderLeftWidth: 10,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: '#fff',
    marginLeft: 3,
  },
  wave: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  wavebar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
  },
  waveDur: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  cmdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  cmdRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cmdIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cmdName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  cmdQty: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  cmdPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  cmdTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cmdTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  cmdTotalVal: {
    fontSize: 15,
    fontWeight: '900',
    color: '#EF4444',
  },
  cmdQtyPrice: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 2,
  },
  cmdNavTabs: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cmdNavTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cmdNavTabActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  cmdNavTabText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
  },
  cmdNavTabTextActive: {
    color: '#FFFFFF',
  },
});
