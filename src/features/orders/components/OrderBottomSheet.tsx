import { Commande, FastFood } from "@/src/types";
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
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
import { BikeAnimation } from '../../merchant/components/BikeAnimation';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = 480;

export type OrderItem = {
  name: string;
  qty: number;
  price: string;
  unitPrice?: number;
  hasQty?: boolean;
};

const COLORS = [
  { bg: '#EAF3DE', text: '#4B7C16', badge: '#7CB342' }, 
  { bg: '#FDEBD0', text: '#A04000', badge: '#E67E22' }, 
  { bg: '#D6EAF8', text: '#1B4F72', badge: '#3498DB' }, 
  { bg: '#E8DAEF', text: '#512E5F', badge: '#8E44AD' }, 
];

type Props = {
  order: Commande | null;
  isVisible: boolean;
  onClose: () => void;
  boutique?: FastFood | null;
  allOrders?: Commande[];
};

type Tab = 'livraison' | 'commandes';

export const OrderBottomSheet: React.FC<Props> = ({ order, isVisible, onClose, boutique, allOrders }) => {
  const [tab, setTab] = useState<Tab>('livraison');
  const [selectedOrderIdx, setSelectedOrderIdx] = useState(0);
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  // Déterminer la commande à afficher (de façon synchrone)
  const selectedOrder = allOrders ? allOrders[selectedOrderIdx] || order : order;

  // Construire les items dynamiquement (plus besoin de state ni de useEffect pour ça)
  const items: OrderItem[] = React.useMemo(() => {
    if (!selectedOrder) return [];
    const extras = selectedOrder.extra || [];
    const drinks = selectedOrder.drink || [];
    const newItems: OrderItem[] = [];

    const priceIdx = ((selectedOrder as any).selectedPriceIndex || 1) - 1;
    const menuPrice = selectedOrder.menu?.prices?.[priceIdx]?.price || selectedOrder.menu?.prices?.[0]?.price || 0;
    newItems.push({
      name: selectedOrder.menu?.titre || selectedOrder.menu?.name || "Menu principal",
      qty: selectedOrder.quantity || 1,
      price: `${menuPrice * (selectedOrder.quantity || 1)} F`,
      unitPrice: menuPrice,
      hasQty: true,
    });

    extras.forEach((ex: any) => {
      if (ex.status === true && ex.name !== "Aucun") {
        const exPrice = ex.prix || ex.price || 0;
        newItems.push({ name: ex.name, qty: 1, price: `${exPrice} F`, unitPrice: exPrice, hasQty: false });
      }
    });

    drinks.forEach((dr: any) => {
      if (dr.status === true && dr.name !== "Aucune") {
        const drPrice = dr.prix || dr.price || 0;
        const drQty = dr.quantite || 1;
        newItems.push({ name: dr.name, qty: drQty, price: `${drPrice * drQty} F`, unitPrice: drPrice, hasQty: true });
      }
    });
    return newItems;
  }, [selectedOrder]);

  useEffect(() => {
    if (isVisible && order) {
      // Animation Open
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
  }, [isVisible, order]);

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

  if (!order) return null;
  const initials = (boutique?.nom || "B").substring(0, 2).toUpperCase();
  const theme = COLORS[initials.charCodeAt(0) % COLORS.length];

  return (
    <Modal
      visible={isVisible}
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
              <View style={[styles.avatar, { backgroundColor: theme.bg }]}>
                <Text style={[styles.avatarText, { color: theme.text }]}>
                  {initials}
                </Text>
                <View style={[styles.badge, { backgroundColor: theme.badge }]}>
                  <Text style={styles.badgeText}>{allOrders ? allOrders.length : 1}</Text>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>{boutique?.nom || "Boutique"}</Text>
                <Text style={styles.userAddr} numberOfLines={1}>{selectedOrder.delivery?.location || "Sur place"}</Text>
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
              <LivraisonTab order={selectedOrder} boutiqueName={boutique?.nom || "Boutique"} />
            </ScrollView>
          ) : (
            <CommandesTab
              items={items}
              total={selectedOrder?.total || 0}
            />
          )}

          {/* ── Nav multi-commandes EN BAS (globale) ── */}
          {allOrders && allOrders.length > 1 && (
            <View style={styles.cmdNavTabsContainer}>
              {allOrders.length > 3 && (
                <TouchableOpacity
                  onPress={() => setSelectedOrderIdx(Math.max(0, selectedOrderIdx - 1))}
                  style={styles.navArrow}
                >
                  <Ionicons name="chevron-back" size={20} color="#111827" />
                </TouchableOpacity>
              )}
              
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[
                  styles.cmdNavTabs,
                  { justifyContent: allOrders.length > 3 ? 'flex-start' : 'center' }
                ]}
                style={{ flexGrow: 0 }}
              >
                {allOrders.map((_, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.cmdNavTab, selectedOrderIdx === idx && styles.cmdNavTabActive]}
                    onPress={() => setSelectedOrderIdx(idx)}
                  >
                    <Text style={[styles.cmdNavTabText, selectedOrderIdx === idx && styles.cmdNavTabTextActive]}>
                      Cmd {idx + 1}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {allOrders.length > 3 && (
                <TouchableOpacity
                  onPress={() => setSelectedOrderIdx(Math.min(allOrders.length - 1, selectedOrderIdx + 1))}
                  style={styles.navArrow}
                >
                  <Ionicons name="chevron-forward" size={20} color="#111827" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

function LivraisonTab({ order, boutiqueName }: { order: Commande; boutiqueName: string }) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);

  async function playSound() {
    if (!order.delivery?.voiceNoteUri) return;
    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
        return;
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: order.delivery.voiceNoteUri },
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
       console.log(error);
    }
  }

  useEffect(() => {
    return sound ? () => { sound.unloadAsync(); } : undefined;
  }, [sound]);

  return (
    <>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10, height: 110 }}>
        <View style={{ width: '42%', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <InfoCard label="Créneau" value={order.delivery?.time || "Dès que possible"} compact />
          </View>
          <View style={{ flex: 1 }}>
            <InfoCard label="Téléphone" value={order.delivery?.phone || "—"} small compact />
          </View>
        </View>

        <View style={{ flex: 1 }}>
          {order.status === 'delivering' ? (
            <View style={[styles.mapPlaceholder, { height: '100%', marginBottom: 0, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8 }]}>
              <BikeAnimation />
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#27500A' }}>Livraison en cours...</Text>
            </View>
          ) : (
            <View style={[styles.mapPlaceholder, { height: '100%', marginBottom: 0, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8 }]}>
              <BikeAnimation paused hideLabel />
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#9CA3AF' }}>En attente de livraison</Text>
            </View>
          )}
        </View>
      </View>

      <View style={[styles.infoCard, { marginTop: 12, padding: 12 }]}>
        <Text style={styles.infoLabel}>Note de livraison</Text>
        <Text style={styles.infoValSm}>{order.delivery?.note || "Aucune note."}</Text>
      </View>

      {order.delivery?.voiceNoteUri ? (
        <>
          <Text style={[styles.infoLabel, { marginTop: 14, marginBottom: 8 }]}>Message vocal</Text>
          <TouchableOpacity style={styles.voiceBar} activeOpacity={0.7} onPress={playSound}>
            <View style={styles.playBtn}>
              <Ionicons name={isPlaying ? "pause" : "play"} size={16} color="#ec4913" />
            </View>
            <Waveform active={isPlaying} progress={playbackProgress} />
            <Text style={styles.waveDur}>{Math.round(playbackProgress * 100)}%</Text>
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
  items,
  total,
}: {
  items: OrderItem[];
  total: number;
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
          {items.map((o, i) => {
            const unitPrice = o.unitPrice || 0;
            const lineTotal = unitPrice * o.qty;
            return (
              <View
                key={i}
                style={[
                  styles.cmdRow,
                  i < items.length - 1 && styles.cmdRowBorder,
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

    </View>
  );
}

function InfoCard({ label, value, small, compact }: { label: string; value: string; small?: boolean; compact?: boolean }) {
  return (
    <View style={[styles.infoCard, compact && { padding: 10, flex: 1 }]}>
      <Text style={[styles.infoLabel, compact && { marginBottom: 2, fontSize: 9 }]}>{label}</Text>
      <Text style={[styles.infoVal, small && styles.infoValSm]}>{value}</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 24,
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
    paddingTop: 0,
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
  cmdNavTabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 32,
    paddingTop:8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cmdNavTabs: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 8,
    // paddingBottom:32,
  },
  navArrow: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cmdNavTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
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
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  cmdNavTabTextActive: {
    color: '#FFFFFF',
  },
});
