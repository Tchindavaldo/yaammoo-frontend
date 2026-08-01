import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, Dimensions, PanResponder, Pressable, Modal,
  NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Commande } from '@/src/types';
import { Toast } from '@/src/components/Toast';
import { LivraisonTab } from './MerchantOrderLivraisonTab';
import { CommandesTab } from './MerchantOrderCommandesTab';
import { MontantTab } from './MerchantOrderMontantTab';
import { orderGroupKey } from '../utils/orderGroupKey';
import { DriverInfoTab } from '@/src/features/orders/components/DriverInfoTab';

const SHEET_HEIGHT = 520;

// ─── Types publics (réexportés pour les sous-composants) ──────────────────────
export type OrderItem = {
  name: string;
  qty: number;
  price: string;
  unitPrice?: number;
  hasQty?: boolean;
  type?: 'menu' | 'extra' | 'drink';
  /** Visuel du plat (type `menu` uniquement) : affiché à la place de l'icône. */
  image?: string;
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
  zone: string;
  deliveryPrice: number;
  orders: OrderItem[];
};

type Tab = 'livraison' | 'commandes' | 'montant' | 'livreur';

type Props = {
  order: Commande | null;
  visible: boolean;
  onClose: () => void;
  allOrders?: Commande[];
  /**
   * Toutes les commandes de la boutique. L'onglet Montant y recompose le groupe
   * ABSOLU de la commande affichée (même clé de groupage), indépendamment du
   * filtre de statut de la liste : le récap est donc identique en « En attente »,
   * « En cours » ou « Terminées ».
   */
  groupPool?: Commande[];
  /** Validation d'UNE commande (le bouton vit dans l'onglet Commande). */
  onValidate?: (order: Commande) => Promise<void> | void;
  /** Masque le bouton Valider quand la commande n'est plus validable. */
  canValidate?: boolean;
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
    image: (order.menu as any)?.coverImage || (order.menu as any)?.image,
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
    zone: (order.delivery as any)?.zone || '',
    deliveryPrice: Number((order.delivery as any)?.prix) || 0,
    orders: buildItems(order),
  };
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function MerchantOrderBottomSheet({
  order, visible, onClose, allOrders, groupPool, onValidate, canValidate = false,
}: Props) {
  const [tab, setTab] = useState<Tab>('livraison');
  const [selectedOrderIdx, setSelectedOrderIdx] = useState(0);
  const [validating, setValidating] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Commande sélectionnée (globale : pilote Livraison ET Commande)
  const currentOrder = allOrders ? (allOrders[selectedOrderIdx] ?? order) : order;
  const user = currentOrder ? buildUser(currentOrder) : null;

  // ─── Garde de consultation ──────────────────────────────────────────────────
  // Une commande contenant des extras/boissons doit avoir son onglet Commande
  // ouvert ET scrollé jusqu'en bas avant de pouvoir être validée.
  const orderList = allOrders && allOrders.length > 0 ? allOrders : (order ? [order] : []);
  const [checkedIdx, setCheckedIdx] = useState<Set<number>>(new Set());
  // Commandes déjà validées pendant cette ouverture : le sheet ne se ferme que
  // lorsqu'il n'en reste plus aucune à traiter.
  const [validatedIdx, setValidatedIdx] = useState<Set<number>>(new Set());

  const markChecked = useCallback((idx: number) => {
    setCheckedIdx((prev) => {
      if (prev.has(idx)) return prev;
      const next = new Set(prev);
      next.add(idx);
      return next;
    });
  }, []);

  // Contenu à vérifier de la commande AFFICHÉE (la garde est propre à chaque Cmd).
  const hasExtra = (currentOrder?.extra || []).some(
    (e: any) => e.status === true && e.name && e.name !== 'Aucun' && e.name !== 'Aucune',
  );
  const hasDrink = (currentOrder?.drink || []).some(
    (d: any) => d.status === true && d.name && d.name !== 'Aucune' && d.name !== 'Aucun',
  );
  // Rien à vérifier → considérée consultée d'office.
  const currentChecked = (!hasExtra && !hasDrink) || checkedIdx.has(selectedOrderIdx);

  /** Message du toast pour la commande affichée. */
  const buildBlockedMessage = () => {
    const label = hasExtra && hasDrink ? 'extras et boissons'
      : hasExtra ? 'extras'
        : 'boissons';
    const prefix = orderList.length > 1 ? `Cmd ${selectedOrderIdx + 1} : ` : '';
    return `${prefix}${label} non vérifiés — faites défiler la liste`;
  };

  // ─── Chips « Cmd » du header : compteur de débordement « +N » ───────────────
  // Largeur d'un chip + gap : sert à convertir des pixels masqués en nb de chips.
  const CMD_CHIP_W = 58;
  const [cmdViewportW, setCmdViewportW] = useState(0);
  const [cmdContentW, setCmdContentW] = useState(0);
  const [cmdScrollX, setCmdScrollX] = useState(0);

  const handleCmdLayout = useCallback(
    (e: { nativeEvent: { layout: { width: number } } }) => setCmdViewportW(e.nativeEvent.layout.width),
    [],
  );
  const handleCmdContentSize = useCallback((w: number) => setCmdContentW(w), []);
  const handleCmdScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => setCmdScrollX(e.nativeEvent.contentOffset.x),
    [],
  );

  // Pixels encore masqués à droite → nombre de chips restants. Un chip n'est
  // compté que s'il est masqué à plus de moitié : à peine rogné, il reste lisible
  // et ne doit pas gonfler le compteur.
  const hiddenPx = Math.max(0, cmdContentW - cmdViewportW - cmdScrollX);
  const hiddenCount = Math.floor(hiddenPx / CMD_CHIP_W + 0.5);

  const handleValidate = async () => {
    if (validating) return;
    if (!currentChecked) {
      setToastMsg('');
      // Re-déclenche l'animation même si le message est identique.
      requestAnimationFrame(() => setToastMsg(buildBlockedMessage()));
      return;
    }
    setValidating(true);
    try {
      await onValidate?.(currentOrder!);

      // Commandes restant à traiter une fois celle-ci validée.
      const done = new Set(validatedIdx);
      done.add(selectedOrderIdx);
      setValidatedIdx(done);
      const remaining = orderList
        .map((_, i) => i)
        .filter((i) => !done.has(i));

      if (remaining.length === 0) {
        handleDismiss();
      } else {
        // Il reste des commandes : on bascule sur la première non traitée.
        setSelectedOrderIdx(remaining[0]);
      }
    } finally {
      setValidating(false);
    }
  };

  // Tab « Livreur » (lecture seule côté marchand) : course lancée/terminée,
  // qu'un livreur soit délégué ou que le marchand livre lui-même.
  const showDriverTab =
    currentOrder?.status === 'delivering' ||
    currentOrder?.status === 'delivered';
  const total = user ? user.orders.reduce((s, o) => s + (o.unitPrice || 0) * o.qty, 0) : 0;

  // Livraison offerte (bonus/campagne couvert par le fastfood) ou mutualisée sur
  // un groupe de livraison : dans les deux cas, pas de prix sur cette commande.
  const offer = (currentOrder as any)?.deliveryOffer;
  const deliveryOffered = offer?.active === true && offer?.coveredBy === 'fastfood';
  // « Cmd groupée » n'a de sens qu'à partir de 2 commandes portant le MÊME
  // deliveryGroupId : seule une commande avec ce groupe ne mutualise rien.
  const currentGroupId = (currentOrder as any)?.deliveryGroupId;
  const deliveryGrouped =
    !!currentGroupId &&
    orderList.filter((o) => (o as any).deliveryGroupId === currentGroupId).length > 1;
  const billableDelivery =
    deliveryOffered || deliveryGrouped ? 0 : (user?.deliveryPrice ?? 0);
  const hasMultiple = allOrders && allOrders.length > 1;

  // Groupe ABSOLU de la commande affichée : toutes les commandes de la boutique
  // partageant sa clé de groupage, tous statuts confondus. Le récap de l'onglet
  // Montant ne dépend donc pas de l'onglet de statut d'où le sheet a été ouvert.
  const montantOrders = useMemo(() => {
    if (!currentOrder) return [];
    const pool = groupPool && groupPool.length > 0 ? groupPool : orderList;
    const key = orderGroupKey(currentOrder);
    const group = pool.filter((o) => orderGroupKey(o) === key);
    return group.length > 0 ? group : orderList;
  }, [currentOrder, groupPool, orderList]);

  const showMontantTab = montantOrders.length > 1;

  // On dépend de l'ID et non de l'objet `order` : au retour d'arrière-plan, un
  // refresh des données fournit une nouvelle référence pour la MÊME commande, ce
  // qui rejouait l'animation d'ouverture (le sheet semblait se fermer/rouvrir).
  const orderId = order?.id;
  useEffect(() => {
    if (!visible || !orderId) return;
    translateY.setValue(SHEET_HEIGHT);
    overlayOpacity.setValue(0);
    setTab('livraison');
    setSelectedOrderIdx(0);
    setCheckedIdx(new Set());
    setValidatedIdx(new Set());
    setToastMsg('');
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 25, stiffness: 180, mass: 0.8 }),
      Animated.timing(overlayOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [visible, orderId]);

  // Revenir à Livraison si la commande courante n'a plus de tab Livreur.
  useEffect(() => {
    if (tab === 'livreur' && !showDriverTab) setTab('livraison');
    if (tab === 'montant' && !showMontantTab) setTab('livraison');
  }, [tab, showDriverTab, showMontantTab]);

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
          {/* Header : avatar + nom + chips Cmd (fermeture : swipe ou tap overlay) */}
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
                {hasMultiple ? (
                  /* Multi-commandes : chips Cmd 1/2/3… à la place de la zone. */
                  <View style={styles.cmdRow}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.cmdScroll}
                      style={{ flexShrink: 1 }}
                      onScroll={handleCmdScroll}
                      scrollEventThrottle={16}
                      onLayout={handleCmdLayout}
                      onContentSizeChange={handleCmdContentSize}
                    >
                      {allOrders!.map((_, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={[styles.cmdChip, selectedOrderIdx === idx && styles.cmdChipActive]}
                          onPress={() => setSelectedOrderIdx(idx)}
                        >
                          <Text
                            style={[
                              styles.cmdChipText,
                              selectedOrderIdx === idx && styles.cmdChipTextActive,
                            ]}
                          >
                            Cmd {idx + 1}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    {/* Débordement : « +N » tant que la liste n'a pas été scrollée. */}
                    {hiddenCount > 0 && (
                      <View style={styles.cmdMore}>
                        <Text style={styles.cmdMoreText}>+{hiddenCount}</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <Text style={styles.userAddr} numberOfLines={1}>
                    {user.zone ? `Zone de livraison : ${user.zone}` : user.addr}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Top tabs : Livraison | Commande | (Livreur) */}
          <View style={styles.tabBar}>
            {(
              [
                'livraison',
                'commandes',
                // Le récap Montant n'a d'intérêt qu'à partir de 2 commandes groupées.
                ...(showMontantTab ? ['montant'] : []),
                ...(showDriverTab ? ['livreur'] : []),
              ] as Tab[]
            ).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.tab, tab === t && styles.tabActive]}
                onPress={() => setTab(t)}
              >
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                  {t === 'livraison'
                    ? 'Livraison'
                    : t === 'commandes'
                      ? 'Commande'
                      : t === 'montant'
                        ? 'Montant'
                        : 'Livreur'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Contenu (change avec le tab, réactif à selectedOrderIdx) */}
          {tab === 'livreur' && showDriverTab ? (
            <ScrollView
              style={styles.content}
              contentContainerStyle={{ paddingTop: 16, paddingBottom: 16 }}
              showsVerticalScrollIndicator={false}
            >
              <DriverInfoTab order={currentOrder!} allowRating={false} />
            </ScrollView>
          ) : tab === 'montant' ? (
            <MontantTab orders={montantOrders} />
          ) : tab === 'livraison' ? (
            <ScrollView
              style={styles.content}
              contentContainerStyle={{ paddingBottom: 16 }}
              showsVerticalScrollIndicator={false}
            >
              <LivraisonTab user={user} />
            </ScrollView>
          ) : (
            <CommandesTab
              // Remonte la tab à zéro et réarme la détection à chaque changement de Cmd.
              key={selectedOrderIdx}
              orders={user.orders}
              total={total + billableDelivery}
              zone={user.zone}
              deliveryPrice={user.deliveryPrice}
              deliveryOffered={deliveryOffered}
              deliveryGrouped={deliveryGrouped}
              onFullyScrolled={() => markChecked(selectedOrderIdx)}
              canValidate={canValidate}
              checked={currentChecked}
              validating={validating}
              onValidate={handleValidate}
            />
          )}

        </Animated.View>

        {/* Toast de blocage (au-dessus du sheet) */}
        {toastMsg ? (
          <Toast
            message={toastMsg}
            type="error"
            duration={3000}
            onHide={() => setToastMsg('')}
          />
        ) : null}
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
  // Chips « Cmd » dans le header (multi-commandes)
  cmdRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  cmdScroll: { flexDirection: 'row', gap: 6, paddingRight: 2 },
  cmdChip: {
    minWidth: 28, height: 24, paddingHorizontal: 8, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB',
  },
  cmdChipActive: { backgroundColor: '#111827', borderColor: '#111827' },
  cmdChipText: { fontSize: 11, fontWeight: '700', color: '#6B7280' },
  cmdChipTextActive: { color: '#FFFFFF' },
  cmdMore: {
    height: 24, paddingHorizontal: 7, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#E5E7EB',
  },
  cmdMoreText: { fontSize: 10, fontWeight: '800', color: '#4B5563' },
  // Top tabs
  tabBar: { flexDirection: 'row', paddingHorizontal: 20, borderBottomWidth: 1, borderColor: '#F3F4F6' },
  tab: { marginRight: 24, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#111827' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
  tabTextActive: { color: '#111827' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
});
