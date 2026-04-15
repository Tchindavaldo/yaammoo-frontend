import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MapComponentProps {
  region: any;
  coords: any;
  address?: string;
}

const MapComponent: React.FC<MapComponentProps> = ({ address }) => {
  return (
    <View style={styles.mapPlaceholder}>
      <View style={styles.mapGridH} />
      <View style={styles.mapGridV} />
      <View style={styles.pinContainer}>
        <View style={styles.pinRing} />
        <View style={styles.pinDot} />
      </View>
      <Text style={styles.mapLabel} numberOfLines={1}>
        {address || "Localisation (Web Preview)"}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  mapPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mapGridH: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  mapGridV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  pinContainer: {
    position: 'absolute',
    top: '35%',
    left: '48%',
  },
  pinRing: {
    position: 'absolute',
    top: -6,
    left: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#EF4444',
    opacity: 0.3,
  },
  pinDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
    borderWidth: 2.5,
    borderColor: '#fff',
  },
  mapLabel: {
    position: 'absolute',
    bottom: 10,
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
  },
});

export default MapComponent;
