import { Commande } from "@/src/types";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
  Image,
  ActivityIndicator,
} from "react-native";
import { BlurView } from "expo-blur";
import MerchantOrderBottomSheet from "./MerchantOrderBottomSheet";
import { BikeAnimation } from "./BikeAnimation";

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface MerchantOrderCardProps {
  order: Commande;
  allOrders?: Commande[];
  onUpdateStatus: (
    status: "processing" | "finished" | "delivering" | "cancelByFastFood",
  ) => Promise<void> | void;
  isForceLaunched?: boolean;
}

export const MerchantOrderCard: React.FC<MerchantOrderCardProps> = ({
  order,
  allOrders,
  onUpdateStatus,
  isForceLaunched = false,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLaunchedLocal, setIsLaunchedLocal] = useState(false);

  const isLaunched = isLaunchedLocal || isForceLaunched;

  const handleUpdateStatus = async (
    newStatus: "processing" | "finished" | "delivering" | "cancelByFastFood",
  ) => {
    setIsUpdating(true);
    try {
      await onUpdateStatus(newStatus);
      if (newStatus === "delivering") {
        setIsLaunchedLocal(true);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const status = (order.status || "pending").toLowerCase();
  const isPending = status === "pending" || status === "pendingtobuy";
  const isActive = status === "active" || status === "processing" || status === "in_progress";
  const isFinished = status === "completed" || status === "finished" || status === "done";
  const isDelivering = status === "delivering";

  // --- Design Variant: Grouped Finished ---
  if (allOrders) {
    const u = (order as any).userData;
    const customerFirstName = u?.firstName || "Client";
    const customerLastName = u?.lastName || "";
    const nameToUse = u ? `${customerFirstName} ${customerLastName}`.trim() : "Client Inconnu";
    const initials = (u ? `${customerFirstName[0]}${customerLastName ? customerLastName[0] : ""}` : "??").toUpperCase();
    
    const deliveryType = (order as any).delivery?.type;
    const isExpress = deliveryType === "express";
    const deliveryColor = isExpress ? "#dc2626" : "#2563eb";
    const deliveryLabel = isExpress ? "Express" : order.delivery?.hour || "Créneau";
    
    const orderCount = allOrders.length;
    const addressStr = order.delivery?.location || "Adresse non spécifiée";
    const isGroupDelivering = isDelivering || isLaunched;

    return (
      <View style={styles.wrapper}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setModalVisible(true)}
          style={styles.summaryRow}
        >
          {/* Avatar avec initiales + badge nombre de commandes */}
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarInitials}>{initials}</Text>
            <View style={[styles.orderCountBadge, { backgroundColor: deliveryColor }]}>
              <Text style={styles.orderCountText}>{orderCount}</Text>
            </View>
          </View>

          {/* Infos */}
          <View style={styles.summaryInfo}>
            <View style={styles.summaryTopRow}>
              <View style={styles.summaryTitleContainer}>
                <Text style={styles.summaryName} numberOfLines={1}>{nameToUse}</Text>
              </View>
            </View>

            <View style={styles.summaryBottomRow}>
              <View style={styles.summaryChipsRow}>
                <View style={[styles.smallChip, styles.chipInactive, { paddingLeft: 0 }]}>
                  <Ionicons name="location-outline" size={14} color="#9ca3af" />
                  <Text style={[styles.chipText, { color: "#9ca3af" }]} numberOfLines={1}>{addressStr.length > 25 ? addressStr.slice(0, 25) + '…' : addressStr}</Text>
                </View>
              </View>
              
              {isGroupDelivering ? (
                <BikeAnimation />
              ) : isUpdating ? (
                <ActivityIndicator size="small" color="#dc2626" />
              ) : (
                <TouchableOpacity
                  style={styles.summaryValidateBtn}
                  disabled={isUpdating}
                  onPress={() => handleUpdateStatus("delivering")}
                >
                  <Ionicons name="bicycle-outline" size={14} color="white" />
                  <Text style={styles.summaryValidateBtnText}>Lancer</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </TouchableOpacity>

        <MerchantOrderBottomSheet
          order={order}
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
        />
      </View>
    );
  }

  // --- Design Variant: Standard (Pending/Progress) ---
  const totalPrice = order.total || 0;
  const userRank = (order as any).rank || 1;
  const menuName = (order.menu as any)?.titre || (order.menu as any)?.name || "—";
  const menuImage = (order.menu as any)?.coverImage || (order.menu as any)?.image;
  const deliveryRaw = order.delivery;
  const deliveryType = deliveryRaw?.type;
  const deliveryColor = deliveryType === "express" ? "#dc2626" : deliveryType === "time" ? "#2563eb" : "black";

  const extras = order.extra || [];
  const extrasActiveCount = Array.isArray(extras) ? extras.filter((x: any) => x.status !== false).length : 0;
  const drinks = order.drink || [];
  const drinksActiveCount = Array.isArray(drinks) ? drinks.filter((x: any) => x.status !== false).length : 0;
  const quantity = order.quantity || 1;

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity activeOpacity={0.85} onPress={() => setModalVisible(true)} style={styles.summaryRow}>
        <View style={styles.avatarContainer}>
          {menuImage ? (
            <Image source={{ uri: menuImage }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="person" size={20} color="#dc2626" />
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
              <Text style={styles.summaryName} numberOfLines={1}> {menuName} (X{quantity})</Text>
            </View>
            <View style={styles.rankContainer}>
              <Ionicons name="trophy-outline" size={14} color="#ccc" />
              <Text style={styles.rankBadgeRow}>{userRank}</Text>
            </View>
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
            
            {(isPending || isActive) && (
              <TouchableOpacity
                style={styles.summaryValidateBtn}
                disabled={isUpdating}
                onPress={() => handleUpdateStatus(isPending ? "processing" : "finished")}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color="white"
                />
                <Text style={styles.summaryValidateBtnText}>Valider</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {isUpdating && (
        <View style={styles.absoluteLoader}>
          <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
          <ActivityIndicator size="large" color="#dc2626" />
        </View>
      )}

      <MerchantOrderBottomSheet order={order} visible={modalVisible} onClose={() => setModalVisible(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    paddingHorizontal: 15,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    paddingLeft: 0,
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
  deliveryIcon: {
    position: "absolute",
    bottom: -2,
    left: -2,
    backgroundColor: "#dc2626",
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
    color: "#dc2626",
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
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  summaryTitleContainer: {
    flexDirection: "column",
    flex: 1,
  },
  rankContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  rankBadgeRow: {
    fontSize: 10,
    fontWeight: "900",
    color: "#6b7280",
    marginLeft: 2,
  },
  summaryValidateBtn: {
    backgroundColor: "black",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
  },
  summaryValidateBtnText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
    marginLeft: 4,
  },
  summaryBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  absoluteLoader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: "900",
    color: "#dc2626",
  },
  orderCountBadge: {
    position: "absolute",
    bottom: -2,
    left: -2,
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

