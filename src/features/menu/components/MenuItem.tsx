import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Menu } from '@/src/types';
import { Theme } from '../../../theme';

interface MenuItemProps {
  menu: Menu;
}

export const MenuItem: React.FC<MenuItemProps> = ({ menu }) => {
  return (
    <TouchableOpacity style={styles.container} activeOpacity={0.7}>
      <Image
        source={menu.image ? { uri: menu.image } : require('@/assets/blur3.jpg')}
        style={styles.image}
      />
      <View style={styles.content}>
        <Text style={styles.title}>{menu.titre}</Text>
        <Text style={styles.price}>{menu.prix1} FCFA</Text>
        <View style={[
          styles.badge, 
          { backgroundColor: menu.disponibilite === 'available' ? '#E8F5E9' : '#FFEBEE' }
        ]}>
          <Text style={[
            styles.badgeText, 
            { color: menu.disponibilite === 'available' ? Theme.colors.success : Theme.colors.danger }
          ]}>
            {menu.disponibilite === 'available' ? 'Disponible' : 'Indisponible'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: Theme.spacing.md,
    backgroundColor: Theme.colors.white,
    marginHorizontal: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.gray[100],
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: Theme.borderRadius.sm,
    backgroundColor: Theme.colors.gray[100],
  },
  content: {
    flex: 1,
    marginLeft: Theme.spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Theme.colors.dark,
  },
  price: {
    fontSize: 15,
    color: Theme.colors.primary,
    fontWeight: '600',
    marginVertical: 4,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
});
