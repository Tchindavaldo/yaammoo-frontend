import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Theme } from '@/src/theme';

interface MerchantHeaderProps {
  name: string;
  image?: string;
  rating?: number;
}

export const MerchantHeader: React.FC<MerchantHeaderProps> = ({ name, image, rating = 4.5 }) => {
  const stars = Array.from({ length: 5 }, (_, i) => {
    const fill = Math.min(Math.max(rating - i, 0), 1);
    return fill;
  });

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <View style={styles.avatarContainer}>
          <Image 
            source={{ uri: image || 'https://via.placeholder.com/40' }} 
            style={styles.avatar} 
          />
        </View>
        <Text style={styles.name}>{name}</Text>
      </View>
      <View style={styles.ratingContainer}>
        {stars.map((fill, i) => (
          <View key={i} style={styles.starWrapper}>
            <Ionicons name="star" size={14} color={Theme.colors.gray[200]} />
            <View style={[styles.starFill, { width: `${fill * 100}%` }]}>
              <Ionicons name="star" size={14} color={Theme.colors.primary} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    backgroundColor: Theme.colors.white,
    marginBottom: Theme.spacing.sm,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Theme.colors.gray[100],
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  name: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Theme.colors.dark,
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 2,
    backgroundColor: Theme.colors.gray[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.pill,
  },
  starWrapper: {
    position: 'relative',
  },
  starFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    overflow: 'hidden',
  }
});
