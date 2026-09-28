import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { DS } from "@/src/theme/ds";
import type { LatLng } from "../services/orderTrackingService";

/**
 * Carte de l'onglet « Suivi » (détail client). COPIE DÉDIÉE (R16) de
 * `src/components/MapComponent` (partagé avec le marchand) : deux marqueurs
 * (livreur, adresse de livraison), le tracé de l'itinéraire restant quand il
 * est connu, et une région recalculée pour contenir le tout. Interactions coupées, comme l'original : la carte suit les
 * positions, l'utilisateur n'a rien à manipuler dans un sheet de 450 px.
 */

type Props = {
  driver: LatLng | null;
  destination: LatLng | null;
  /** Itinéraire restant (OpenRouteService), absent tant qu'il n'est pas calculé. */
  route?: LatLng[] | null;
};

/** Marge autour des deux points ; delta minimal ≈ 1 km pour ne pas zoomer à l'excès. */
const PADDING = 1.8;
const MIN_DELTA = 0.01;

const regionFor = (points: LatLng[]) => {
  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * PADDING, MIN_DELTA),
    longitudeDelta: Math.max((maxLng - minLng) * PADDING, MIN_DELTA),
  };
};

const OrderTrackingMap: React.FC<Props> = ({ driver, destination, route }) => {
  const region = useMemo(() => {
    const points = [driver, destination, ...(route ?? [])].filter(
      Boolean,
    ) as LatLng[];
    return points.length ? regionFor(points) : null;
  }, [driver, destination, route]);

  if (!region) return <View style={styles.empty} />;

  return (
    <MapView
      style={styles.map}
      region={region}
      zoomEnabled={false}
      scrollEnabled={false}
      rotateEnabled={false}
      pitchEnabled={false}
      toolbarEnabled={false}
    >
      {route && route.length > 1 && (
        <Polyline
          coordinates={route}
          strokeColor={DS.accent}
          strokeWidth={4}
          lineCap="round"
          lineJoin="round"
        />
      )}
      {destination && (
        <Marker coordinate={destination} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.destination}>
            <Ionicons name="home" size={13} color={DS.onInk} />
          </View>
        </Marker>
      )}
      {driver && (
        <Marker coordinate={driver} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.driver}>
            <Ionicons name="bicycle" size={16} color={DS.onInk} />
          </View>
        </Marker>
      )}
    </MapView>
  );
};

const styles = StyleSheet.create({
  map: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  empty: {
    flex: 1,
    backgroundColor: DS.gray100,
  },
  driver: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DS.accent,
    borderWidth: 3,
    borderColor: DS.bg,
  },
  destination: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DS.ink,
    borderWidth: 3,
    borderColor: DS.bg,
  },
});

export default OrderTrackingMap;
