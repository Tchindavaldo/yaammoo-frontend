import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { DS } from "@/src/theme/ds";
import type { LatLng } from "../services/orderTrackingService";

/**
 * Web : `react-native-maps` n'existe pas. Même rôle que le repli web de
 * `MapComponent` : un simple cadre, la version native vit dans
 * `OrderTrackingMap.native.tsx`.
 */
type Props = {
  driver: LatLng | null;
  destination: LatLng | null;
  route?: LatLng[] | null;
};

const OrderTrackingMap: React.FC<Props> = () => (
  <View style={styles.box}>
    <Ionicons name="map-outline" size={26} color={DS.faint} />
    <Text style={styles.text}>Carte disponible dans l'application</Text>
  </View>
);

const styles = StyleSheet.create({
  box: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: DS.gray100,
  },
  text: {
    fontSize: 11,
    fontWeight: "600",
    color: DS.muted,
  },
});

export default OrderTrackingMap;
