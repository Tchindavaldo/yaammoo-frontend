import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { FastFood } from '@/src/types';
import { Theme } from '../../../theme';

interface RestaurantCardProps {
  restaurant: FastFood;
  onPress?: (restaurant: FastFood) => void;
}

export const RestaurantCard: React.FC<RestaurantCardProps> = ({ restaurant, onPress }) => {
  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={() => onPress?.(restaurant)}
      activeOpacity={0.8}
    >
      <Image
        source={restaurant.image ? { uri: restaurant.image } : require('@/assets/blur3.jpg')}
        style={styles.image}
        contentFit="cover"
        transition={300}
      />
      <View style={styles.info}>
        <Text style={styles.name}>{restaurant.nom}</Text>
        <Text style={styles.details}>{restaurant.menu?.length || 0} menus disponibles</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: Theme.colors.white,
    shadowColor: Theme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 150,
    backgroundColor: Theme.colors.gray[100],
  },
  info: {
    padding: Theme.spacing.md,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: Theme.colors.dark,
  },
  details: {
    fontSize: 14,
    color: Theme.colors.gray[600],
    marginTop: Theme.spacing.xs,
  },
});
