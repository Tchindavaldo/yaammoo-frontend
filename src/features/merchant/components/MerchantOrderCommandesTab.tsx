import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
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

type Props = {
  orders: OrderItem[];
  total: number;
  zone?: string;
  deliveryPrice?: number;
};

export function CommandesTab({ orders, total, zone = '', deliveryPrice = 0 }: Props) {
  const hasDelivery = deliveryPrice > 0 || !!zone;
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

        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total commande</Text>
          <Text style={styles.totalVal}>{total} {CURRENCY}</Text>
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
  },
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
