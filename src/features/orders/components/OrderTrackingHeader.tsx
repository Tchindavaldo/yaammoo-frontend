import { Theme } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface OrderTrackingHeaderProps {
  activeStatus: string;
  onStatusChange: (status: any) => void;
  counts: {
    pending: number;
    processing: number;
    finished: number;
    delivered: number;
  };
  /** Stats de la date sélectionnée : nb commandes + nb de fastfoods. */
  orderCount?: number;
  fastFoodCount?: number;
}

export const OrderTrackingHeader: React.FC<OrderTrackingHeaderProps> = ({
  activeStatus,
  onStatusChange,
  counts,
  orderCount = 0,
  fastFoodCount = 0,
}) => {
  return (
    <View style={styles.container}>
      {/* Dates gérées par le header de page (TabHeader / DatePill). */}

      {/* Stats Row (identique au manager panel marchand) */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <View style={styles.statValRow}>
            <Text style={styles.statVal} numberOfLines={1}>
              {orderCount}
            </Text>
            <Text style={styles.statUnit}>cmd</Text>
          </View>
          <Text style={styles.statLbl}>Commandes effectue</Text>
        </View>
        <View style={styles.statBox}>
          <View style={styles.statValRow}>
            <Text style={styles.statVal} numberOfLines={1}>
              {fastFoodCount}
            </Text>
            <Text style={styles.statUnit}>FF</Text>
          </View>
          <Text style={styles.statLbl}>Fastfood total</Text>
        </View>
      </View>

      {/* Status Chips Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statusScroll}
      >
        <StatusChip
          label="En Attente"
          icon="time-outline"
          count={counts.pending}
          active={activeStatus === "pending"}
          onPress={() => onStatusChange("pending")}
        />
        <StatusChip
          label="En cours"
          icon="restaurant-outline"
          count={counts.processing}
          active={activeStatus === "active"}
          onPress={() => onStatusChange("active")}
        />
        <StatusChip
          label="Terminées"
          icon="checkmark-done-outline"
          count={counts.finished}
          active={activeStatus === "finished"}
          onPress={() => onStatusChange("finished")}
        />
      </ScrollView>
    </View>
  );
};

const StatusChip = ({
  label,
  icon,
  count,
  active,
  onPress,
  activeColor = "rgba(236,73,19,1.00)",
  inactiveBg = Theme.colors.primary + "10",
  inactiveIconColor = Theme.colors.primary,
}: any) => (
  <TouchableOpacity
    style={[
      styles.statusChip,
      { backgroundColor: active ? activeColor : inactiveBg },
    ]}
    onPress={onPress}
  >
    <Ionicons
      name={icon as any}
      size={14}
      color={active ? "white" : inactiveIconColor}
    />
    <Text
      style={[
        styles.statusLabel,
        { color: active ? "white" : inactiveIconColor },
      ]}
    >
      {label}
    </Text>
    <Text
      style={[
        styles.statusCount,
        { color: active ? "white" : inactiveIconColor },
      ]}
    >
      ({count})
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    paddingTop: 0,
    overflow: "hidden",
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "white",
    paddingHorizontal: 15,
    paddingVertical: 15,
    gap: 15,
  },
  statBox: {
    flex: 1,
    minWidth: 0,
    alignItems: "flex-start",
    // Même fond que la pilule du header (orange translucide) : marie bien avec le blur.
    backgroundColor: Theme.colors.primary + "10",
    padding: 10,
    borderRadius: 10,
  },
  statValRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  statVal: {
    fontSize: 31,
    fontWeight: "900",
    color: "black",
    flexShrink: 1,
  },
  statUnit: {
    fontSize: 25,
    color: Theme.colors.primary,
    marginLeft: 8,
    fontWeight: "900",
  },
  statLbl: {
    fontSize: 11,
    color: "rgba(0,0,0,0.44)",
    fontWeight: "bold",
    marginTop: 2,
  },
  statusScroll: {
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 4,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    // Même fond que la pilule du header (orange translucide).
    backgroundColor: Theme.colors.primary + "10",
    gap: 4,
    height: 32,
  },
  statusLabel: {
    fontSize: 10,
    color: "black",
    fontWeight: "bold",
  },
  statusCount: {
    fontSize: 10,
    fontWeight: "900",
    color: "black",
    marginLeft: 0,
  },
});
