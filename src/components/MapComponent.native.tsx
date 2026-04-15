import React from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

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
}

const MapComponent: React.FC<MapComponentProps> = ({ region, coords }) => {
  if (!region || !coords) return null;

  return (
    <MapView
      style={StyleSheet.absoluteFill}
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

export default MapComponent;
