import { Commande } from "@/src/types";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MerchantOrderBottomSheet from "../../merchant/components/MerchantOrderBottomSheet";
import { BikeAnimation } from "../../merchant/components/BikeAnimation";

/** Hauteur fixe d'une carte livreur (alignée sur la carte marchand). */
export const LIVREUR_CARD_HEIGHT = 94.33;

type DriverStatus = "delivering" | "finished";

interface DriverOrderCardProps {
  order: Commande;
  /** Toutes les commandes du même client dans le groupe (livraison groupée). */
  allOrders?: Commande[];
  onUpdateStatus: (status: DriverStatus) => Promise<void> | void;
}

/**
 * Carte commande côté LIVREUR.
 *
 * Deux transitions possibles :
 *  - `delivering` (Lancer)  : commande prête → le livreur démarre la course.
 *  - `finished`   (Terminer): course en cours → le livreur clôt la livraison.
 *
 * Tap sur la carte = détails (réutilise le bottom sheet marchand, en lecture).
 */
export const DriverOrderCard: React.FC<DriverOrderCardProps> = ({
  order,
  allOrders,
  onUpdateStatus,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateStatus = async (status: DriverStatus) => {
    setIsUpdating(true);
    try {
      await onUpdateStatus(status);
    } finally {
      setIsUpdating(false);
    }
  };

  const status = (order.status || "pending").toLowerCase();
  const isDelivering = status === "delivering";

  const group = allOrders ?? [order];
  const u = (order as any).userData;
  const customerFirstName = u?.firstName || "Client";
  const customerLastName = u?.lastName || "";
  const nameToUse = u
    ? `${customerFirstName} ${customerLastName}`.trim()
    : "Client Inconnu";
  const initials = (
    u ? `${customerFirstName[0]}${customerLastName ? customerLastName[0] : ""}` : "??"
  ).toUpperCase();

  const deliveryType = (order as any).delivery?.type;
  const isExpress = deliveryType === "express";
  const deliveryColor = isExpress ? "#ec4913" : "#2563eb";
  const orderCount = group.length;
  const addressStr =
    order.delivery?.location || order.delivery?.address || "Adresse non spécifiée";

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setModalVisible(true)}
        style={styles.summaryRow}
      >
        {/* Avatar initiales + badge nb commandes */}
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarInitials}>{initials}</Text>
          <View style={[styles.orderCountBadge, { backgroundColor: deliveryColor }]}>
            <Text style={styles.orderCountText}>{orderCount}</Text>
          </View>
        </View>

        <View style={styles.summaryInfo}>
          <View style={styles.summaryTopRow}>
            <Text style={styles.summaryName} numberOfLines={1}>
              {nameToUse}
            </Text>
          </View>

          <View style={styles.summaryBottomRow}>
            <View style={styles.summaryChipsRow}>
              <View style={[styles.smallChip, { paddingLeft: 0 }]}>
                <Ionicons name="location-outline" size={14} color="#9ca3af" />
                <Text style={styles.chipText} numberOfLines={1}>
                  {addressStr.length > 25 ? addressStr.slice(0, 25) + "…" : addressStr}
                </Text>
              </View>
            </View>

            {isUpdating ? (
              <ActivityIndicator size="small" color="#ec4913" />
            ) : isDelivering ? (
              <View style={styles.actionRow}>
                <BikeAnimation />
                <TouchableOpacity
                  style={styles.finishBtn}
                  onPress={() => handleUpdateStatus("finished")}
                >
                  <Ionicons name="checkmark-done" size={14} color="white" />
                  <Text style={styles.finishBtnText}>Terminer</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.launchBtn}
                onPress={() => handleUpdateStatus("delivering")}
              >
                <Ionicons name="bicycle-outline" size={14} color="white" />
                <Text style={styles.launchBtnText}>Lancer</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>

      <MerchantOrderBottomSheet
        order={order}
        allOrders={allOrders}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
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
  avatarInitials: {
    fontSize: 16,
    fontWeight: "900",
    color: "#ec4913",
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
  summaryInfo: {
    flex: 1,
  },
  summaryTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  summaryName: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#111827",
    flex: 1,
  },
  summaryBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryChipsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
    flex: 1,
  },
  smallChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    marginRight: 5,
    marginBottom: 4,
    backgroundColor: "rgba(0,0,0,0.03)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  chipText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#9ca3af",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  launchBtn: {
    backgroundColor: "black",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
  },
  launchBtnText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
    marginLeft: 4,
  },
  finishBtn: {
    backgroundColor: "#16a34a",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
  },
  finishBtnText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
    marginLeft: 4,
  },
});
