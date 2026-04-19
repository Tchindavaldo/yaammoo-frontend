import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

interface MapComponentProps {
  region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null;
  coords: {
    latitude: number;
    longitude: number;
  } | null;
  deliveryType?: 'express' | 'time' | string;
}

const MapComponent: React.FC<MapComponentProps> = ({ region, coords, deliveryType }) => {
  const isNoDelivery = deliveryType === 'surplace' || !deliveryType;

  if (isNoDelivery) {
    return (
      <View style={styles.errorContainer}>
        <Text style={{ fontSize: 28 }}>📍</Text>
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={styles.errorText}>Pas de livraison</Text>
          <Text style={[styles.errorText, { fontSize: 10 }]}>Le client va passer à la boutique prendre</Text>
        </View>
      </View>
    );
  }

  if (!region || !coords) {
    return (
      <View style={styles.errorContainer}>
        <Text style={{ fontSize: 28 }}>📍</Text>
        <Text style={styles.errorText}>Le client n'a pas envoyé ses coordonnées</Text>
      </View>
    );
  }

  return (
    <MapView
      style={styles.map}
      region={region}
      zoomEnabled={false}
      scrollEnabled={false}
      rotateEnabled={false}
      pitchEnabled={false}
    >
      <Marker coordinate={coords} pinColor="#ec4913" />
    </MapView>
  );
};

const styles = StyleSheet.create({
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  errorText: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default MapComponent;
