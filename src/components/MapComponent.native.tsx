"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { DS } from "@/src/theme/ds";
import { t, useLanguage } from "@/src/i18n";

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
  useLanguage();
  const isNoDelivery = deliveryType === 'surplace' || !deliveryType;

  if (isNoDelivery) {
    return (
      <View style={styles.errorContainer}>
        <Text style={{ fontSize: 28 }}>📍</Text>
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={styles.errorText}>{t("Pas de livraison")}</Text>
          <Text style={[styles.errorText, { fontSize: 10 }]}>{t("Le client va passer à la boutique prendre")}</Text>
        </View>
      </View>
    );
  }

  if (!region || !coords) {
    return (
      <View style={styles.errorContainer}>
        <Text style={{ fontSize: 28 }}>📍</Text>
        <Text style={styles.errorText}>{t("Le client n'a pas envoyé ses coordonnées")}</Text>
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
      <Marker coordinate={coords} pinColor={DS.accent} />
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
    backgroundColor: DS.gray100,
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
