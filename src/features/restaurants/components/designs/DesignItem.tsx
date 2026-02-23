import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Theme } from '@/src/theme';
import { Menu } from '@/src/types';

interface DesignItemProps {
  menu: Menu;
  variant: 1 | 2 | 3 | 4;
  onPress: () => void;
}

export const DesignItem: React.FC<DesignItemProps> = ({ menu, variant, onPress }) => {
  const isAvailable = menu.disponibilite === 'available' || menu.disponibilite === 'Disponible';

  if (variant === 1 || variant === 3) {
    return (
      <TouchableOpacity style={styles.v1Container} onPress={onPress} activeOpacity={0.8}>
        <View style={styles.v1Content}>
          <Text style={styles.v1Title}>{menu.titre}</Text>
          <View style={[styles.statusBadge, { backgroundColor: isAvailable ? Theme.colors.success : Theme.colors.danger }]}>
            <Text style={styles.statusText}>{isAvailable ? 'Disponible' : 'Indisponible'}</Text>
          </View>
          <Text style={styles.v1Price}>{menu.prix1} F</Text>
        </View>
        <Image
          source={menu.image ? { uri: menu.image } : require('@/assets/blur3.jpg')}
          style={styles.v1Image}
        />
      </TouchableOpacity>
    );
  }

  if (variant === 2) {
    return (
      <TouchableOpacity style={styles.v2Container} onPress={onPress} activeOpacity={0.8}>
        <Image
          source={menu.image ? { uri: menu.image } : require('@/assets/blur3.jpg')}
          style={styles.v2Image}
        />
        <View style={styles.v2Content}>
          <Text style={styles.v2Title} numberOfLines={1}>{menu.titre}</Text>
          <Text style={styles.v2Price}>{menu.prix1} F</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.v4Container} onPress={onPress} activeOpacity={0.9}>
      <Image
        source={menu.image ? { uri: menu.image } : require('@/assets/blur3.jpg')}
        style={styles.v4Image}
      />
      <View style={styles.v4Overlay}>
        <Text style={styles.v4Title}>{menu.titre}</Text>
        <Text style={styles.v4Price}>{menu.prix1} F</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Variant 1 & 3
  v1Container: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.white,
    padding: Theme.spacing.md,
    marginVertical: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  v1Content: {
    flex: 1,
  },
  v1Title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Theme.colors.dark,
    marginBottom: 4,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 8,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  v1Price: {
    fontSize: 16,
    fontWeight: '900',
    color: Theme.colors.primary,
  },
  v1Image: {
    width: 80,
    height: 80,
    borderRadius: Theme.borderRadius.md,
    marginLeft: Theme.spacing.md,
  },

  // Variant 2 (Grid)
  v2Container: {
    width: '48%',
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.borderRadius.lg,
    marginBottom: Theme.spacing.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  v2Image: {
    width: '100%',
    height: 120,
  },
  v2Content: {
    padding: Theme.spacing.sm,
  },
  v2Title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Theme.colors.dark,
  },
  v2Price: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Theme.colors.primary,
    marginTop: 4,
  },

  // Variant 4 (Slider)
  v4Container: {
    width: 280,
    height: 180,
    marginRight: Theme.spacing.md,
    borderRadius: Theme.borderRadius.xl,
    overflow: 'hidden',
  },
  v4Image: {
    ...StyleSheet.absoluteFillObject,
  },
  v4Overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
    padding: Theme.spacing.md,
  },
  v4Title: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  v4Price: {
    color: Theme.colors.primary,
    fontSize: 16,
    fontWeight: '900',
  }
});
