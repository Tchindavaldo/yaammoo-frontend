import React, { useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OrderItem } from './MerchantOrderBottomSheet';

const ITEM_ICONS: Record<string, string> = {
  menu: '\uD83C\uDF7D\uFE0F',
  extra: '\u2795',
  drink: '\uD83E\uDD64',
};

const ITEM_LABEL: Record<string, string> = {
  menu: 'Menu',
  extra: 'Extra',
  drink: 'Boisson',
};

// Devise
const CURRENCY = 'XAF';

/** Marge de tolérance (px) pour considérer le bas de la liste atteint. */
const SCROLL_END_SLOP = 24;

type Props = {
  orders: OrderItem[];
  total: number;
  zone?: string;
  deliveryPrice?: number;
  /** Remonté quand la liste a été vue en entier (bas atteint, ou rien à scroller). */
  onFullyScrolled?: () => void;
  /** Affiche le bouton Valider dans la ligne de total (propre à CETTE commande). */
  canValidate?: boolean;
  /** Cette commande a-t-elle été consultée (liste scrollée jusqu'en bas) ? */
  checked?: boolean;
  /** Validation de CETTE commande uniquement. */
  onValidate?: () => void;
  validating?: boolean;
};

export function CommandesTab({
  orders,
  total,
  zone = '',
  deliveryPrice = 0,
  onFullyScrolled,
  canValidate = false,
  checked = false,
  onValidate,
  validating = false,
}: Props) {
  const hasDelivery = deliveryPrice > 0 || !!zone;

  // Une seule remontée par montage : évite de spammer le parent à chaque frame.
  const notified = useRef(false);
  const notifyOnce = useCallback(() => {
    if (notified.current) return;
    notified.current = true;
    onFullyScrolled?.();
  }, [onFullyScrolled]);

  // Hauteur visible de la zone scrollable + hauteur du contenu : si le contenu
  // tient entièrement dans la fenêtre, il n'y a rien à scroller → déjà tout vu.
  const viewportH = useRef(0);
  const contentH = useRef(0);

  const checkNoScrollNeeded = useCallback(() => {
    if (viewportH.current > 0 && contentH.current > 0
      && contentH.current <= viewportH.current + SCROLL_END_SLOP) {
      notifyOnce();
    }
  }, [notifyOnce]);

  const handleLayout = useCallback(
    (e: { nativeEvent: { layout: { height: number } } }) => {
      viewportH.current = e.nativeEvent.layout.height;
      checkNoScrollNeeded();
    },
    [checkNoScrollNeeded],
  );

  const handleContentSizeChange = useCallback(
    (_w: number, h: number) => {
      contentH.current = h;
      checkNoScrollNeeded();
    },
    [checkNoScrollNeeded],
  );

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
      if (layoutMeasurement.height + contentOffset.y >= contentSize.height - SCROLL_END_SLOP) {
        notifyOnce();
      }
    },
    [notifyOnce],
  );

  if (orders.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Aucun détail de commande disponible</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
      {/* Container arrondi : items scrollables + total fixe */}
      <View style={styles.card}>
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 12 }}
          onLayout={handleLayout}
          onContentSizeChange={handleContentSizeChange}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {orders.map((o, i) => {
            const unitPrice = o.unitPrice || 0;
            const lineTotal = unitPrice * o.qty;
            const icon = ITEM_ICONS[o.type || 'menu'];
            const typeLabel = ITEM_LABEL[o.type || 'menu'];

            return (
              <View
                key={i}
                style={[
                  styles.row,
                  (i < orders.length - 1 || hasDelivery) && styles.rowBorder,
                ]}
              >
                {/* Icône + badge type */}
                <View style={[
                  styles.iconBox,
                  o.type === 'extra' && { backgroundColor: '#FFF7ED' },
                  o.type === 'drink' && { backgroundColor: '#EFF6FF' },
                ]}>
                  <Text style={{ fontSize: 13 }}>{icon}</Text>
                </View>

                {/* Nom + type label */}
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName} numberOfLines={1}>{o.name}</Text>
                  <Text style={styles.itemType}>{typeLabel}</Text>
                </View>

                {/* Prix */}
                <View style={{ alignItems: 'flex-end' }}>
                  {o.hasQty && o.qty > 1 ? (
                    <>
                      <Text style={styles.itemPrice}>{lineTotal} {CURRENCY}</Text>
                      <Text style={styles.itemPriceSub}>{unitPrice} {CURRENCY} × {o.qty}</Text>
                    </>
                  ) : (
                    <Text style={styles.itemPrice}>{unitPrice > 0 ? `${unitPrice} ${CURRENCY}` : 'Inclus'}</Text>
                  )}
                </View>
              </View>
            );
          })}

          {/* Ligne livraison : zone + prix */}
          {hasDelivery && (
            <View style={styles.row}>
              <View style={[styles.iconBox, { backgroundColor: '#FEF2F2' }]}>
                <Text style={{ fontSize: 13 }}>🛵</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={1}>Livraison</Text>
                {zone ? (
                  <Text style={styles.itemZone}>{zone}</Text>
                ) : null}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.itemPrice}>
                  {deliveryPrice > 0 ? `${deliveryPrice} ${CURRENCY}` : 'Inclus'}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Total : libellé + montant en dessous, bouton Valider à droite */}
        <View style={styles.totalRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.totalLabel}>Total commande</Text>
            <Text style={styles.totalVal}>{total} {CURRENCY}</Text>
          </View>

          {canValidate && (
            <TouchableOpacity
              onPress={onValidate}
              disabled={validating}
              style={[styles.validateBtn, !checked && styles.validateBtnBlocked]}
            >
              {validating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons
                  name={checked ? 'checkmark-circle' : 'lock-closed'}
                  size={15}
                  color="#fff"
                />
              )}
              <Text style={styles.validateBtnText}>
                {validating ? 'Validation…' : 'Valider'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    overflow: 'hidden',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  itemType: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  itemZone: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
    fontWeight: '600',
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  itemPriceSub: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 1,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  totalVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ec4913',
    marginTop: 2,
  },
  // Bouton Valider propre à la commande affichée.
  validateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#ec4913',
  },
  // Bloqué : gris, mais toujours pressable pour déclencher le toast explicatif.
  validateBtnBlocked: { backgroundColor: '#D1D5DB' },
  validateBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
});
