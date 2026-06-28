import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Commande, FastFood } from "@/src/types";
import { BikeAnimation } from "../../merchant/components/BikeAnimation";

interface ClientOrderCardProps {
  order: Commande;
  allOrders?: Commande[];
  fastFood?: FastFood;
  onDelete?: (id: string) => void;
  onUpdateQuantity?: (id: string, qty: number) => void;
  showActions?: boolean;
  hideRanking?: boolean;
  onPress?: () => void;
}


export const ClientOrderCard: React.FC<ClientOrderCardProps> = ({
  order,
  allOrders,
  fastFood,
  onDelete,
  onUpdateQuantity,
  showActions = false,
  hideRanking = false,
  onPress,
}) => {
  if (allOrders && allOrders.length > 0) {
    const orderCount = allOrders.length;
    const ffName = fastFood?.nom || fastFood?.name || "Boutique";
    const initials = ffName.substring(0, 2).toUpperCase();
    const ffImage = fastFood?.logo || fastFood?.coverImage;
    
    // Status delivery group
    const isAnyDelivering = allOrders.some(o => (o.status || "").toLowerCase() === "delivering");
    const addressStr = order.delivery?.location || "Sur place";
    
    // On calcule le prix total de toutes les commandes du groupe
    const totalPriceGroup = allOrders.reduce((sum, o) => sum + (o.total || 0), 0);

    return (
      <TouchableOpacity activeOpacity={0.8} style={styles.wrapper} onPress={onPress} disabled={!onPress}>
        <View style={styles.summaryRow}>
          <View style={styles.avatarContainer}>
            {ffImage ? (
              <Image source={{ uri: ffImage }} style={styles.avatarImage} cachePolicy="memory-disk" transition={150} />
            ) : (
              <Text style={styles.avatarInitials}>{initials}</Text>
            )}
            <View style={[styles.orderCountBadge, { backgroundColor: "#ec4913" }]}>
              <Text style={styles.orderCountText}>{orderCount}</Text>
            </View>
          </View>

          <View style={styles.summaryInfo}>
            <View style={styles.summaryTopRow}>
              <View style={styles.summaryTitleContainer}>
                <Text style={styles.summaryPrice}>{totalPriceGroup} F</Text>
                <Text style={styles.summaryName} numberOfLines={1}>{ffName}</Text>
              </View>
              {isAnyDelivering && (
                <View style={styles.bikeAnimationTop}>
                  <BikeAnimation />
                </View>
              )}
            </View>

            <View style={styles.summaryBottomRow}>
              <View style={styles.summaryChipsRow}>
                <View style={[styles.smallChip, styles.chipInactive, { paddingLeft: 0 }]}>
                  <Ionicons name="location-outline" size={14} color="#9ca3af" />
                  <Text style={[styles.chipText, { color: "#9ca3af" }]} numberOfLines={1}>
                    {addressStr.length > 25 ? addressStr.slice(0, 25) + '…' : addressStr}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  const totalPrice = order.total || 0;
  const menuName = (order.menu as any)?.titre || (order.menu as any)?.name || "—";
  const menuImage = (order.menu as any)?.coverImage || (order.menu as any)?.image;
  const status = (order.status || "pending").toLowerCase();
  const isDelivering = status === "delivering";
  
  const deliveryRaw = order.delivery;
  const deliveryType = deliveryRaw?.type;
  const deliveryColor = deliveryType === "express" ? "#ec4913" : deliveryType === "time" ? "#2563eb" : "#ccc";

  const extras = order.extra || [];
  const extrasActiveCount = Array.isArray(extras) ? extras.filter((x: any) => x.status !== false).length : 0;
  const drinks = order.drink || [];
  const drinksActiveCount = Array.isArray(drinks) ? drinks.filter((x: any) => x.status !== false).length : 0;

  const quantity = order.quantity || 1;

  return (
    <TouchableOpacity activeOpacity={0.8} style={styles.wrapper} onPress={onPress} disabled={!onPress}>
      <View style={styles.summaryRow}>
        <View style={styles.avatarContainer}>
          {menuImage ? (
            <Image
              source={{ uri: menuImage }}
              style={styles.avatarImage}
              cachePolicy="memory-disk"
              transition={150}
            />
          ) : (
            <Ionicons name="fast-food" size={24} color="#ec4913" />
          )}
          <Ionicons
            name="navigate"
            size={12}
            color="white"
            style={[styles.deliveryIcon, { backgroundColor: deliveryColor }]}
          />
        </View>

        <View style={styles.summaryInfo}>
          <View style={styles.summaryTopRow}>
            <View style={styles.summaryTitleContainer}>
              <Text style={styles.summaryPrice}>{totalPrice} F</Text>
              <Text style={styles.summaryName} numberOfLines={1}>{menuName}{hideRanking ? '' : ` (X${quantity})`}</Text>
            </View>
                        {isDelivering && (
              <View style={styles.bikeAnimationTop}>
                <BikeAnimation />
              </View>
            )}

          </View>

          <View style={styles.summaryBottomRow}>
            <View style={styles.summaryChipsRow}>
              <View style={[styles.smallChip, styles.chipInactive, { paddingLeft: 0 }]}>
                <Ionicons name="fast-food-outline" size={14} color="#ccc" />
                <Text style={[styles.chipText, { color: "#ccc" }]}>Extras +{extrasActiveCount}</Text>
              </View>
              <View style={[styles.smallChip, styles.chipInactive]}>
                <Ionicons name="beer-outline" size={14} color="#ccc" />
                <Text style={[styles.chipText, { color: "#ccc" }]}>Boisson +{drinksActiveCount}</Text>
              </View>
            </View>

            <View style={styles.rightActionColumn}>
              {showActions ? (
                <View style={styles.qtyContainer}>
                  <TouchableOpacity
                    onPress={() => onDelete?.(order.id)}
                    style={styles.deleteBtn}
                  >
                    <Ionicons name="trash-outline" size={16} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              ) : hideRanking ? (
                <View style={styles.qtyLabel}>
                  <Text style={styles.qtyLabelText}>x{quantity}</Text>
                </View>
              ) : (status === "pending" || status === "processing") && order.rank ? (
                <View style={styles.rankContainer}>
                  <Ionicons name="trophy-outline" size={14} color="#ccc" />
                  <Text style={styles.rankText}>
                    {status === "pending" ? "En attente" : "En cours"} • {order.rank}
                  </Text>
                </View>
              ) : (
                <View style={styles.qtyLabel}>
                  <Text style={styles.qtyLabelText}>x{quantity}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};



const qtyBtnMain = {
    backgroundColor: "black",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center" as const,
    alignItems: "center" as const,
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    paddingHorizontal: 16,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    backgroundColor: "white",
  },
  avatarContainer: {
    width: 50,
    height: 55,
    borderRadius: 25,
    backgroundColor: "#fee2e2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    position: "relative",
  },
  avatarImage: {
    width: 48,
    height: 53,
    borderRadius: 24,
  },
  bikeAnimationTop: {
  
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightActionColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  deliveryIcon: {
    position: "absolute",
    bottom: -2,
    left: -2,
    padding: 2,
    borderRadius: 6,
    zIndex: 10,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryName: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#111827",
    flex: 1,
  },
  summaryPrice: {
    fontSize: 14,
    fontWeight: "900",
    color: "#ec4913",
  },
  summaryChipsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  smallChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    marginRight: 5,
    marginBottom: 4,
  },
  chipInactive: {
    backgroundColor: "rgba(0,0,0,0.03)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  chipText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  summaryTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  summaryTitleContainer: {
    flexDirection: "column",
    flex: 1,
    justifyContent: "flex-start",
  },
  statusBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9ca3af',
  },
  summaryBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: 14,
    fontWeight: 'bold',
    minWidth: 16,
    textAlign: 'center',
  },
  deleteBtn: {
    marginLeft: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyLabel: {
    backgroundColor: 'black',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  qtyLabelText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  rankText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#6b7280',
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: "900",
    color: "#ec4913",
  },
  orderCountBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
    zIndex: 10,
  },
  orderCountText: {
    color: "white",
    fontSize: 9,
    fontWeight: "900",
  },
});
