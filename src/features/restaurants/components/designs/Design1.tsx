import React from 'react';
import { View, StyleSheet } from 'react-native';
import { FastFood, Menu } from '@/src/types';
import { MerchantHeader } from '../MerchantHeader';
import { DesignItem } from './DesignItem';
import { Theme } from '@/src/theme';

interface DesignProps {
  fastFood: FastFood;
  onMenuClick: (menu: Menu) => void;
}

export const Design1: React.FC<DesignProps> = ({ fastFood, onMenuClick }) => {
  return (
    <View style={styles.container}>
      <MerchantHeader 
        name={fastFood.nom} 
        image={fastFood.image} 
        rating={fastFood.stats?.rating} 
      />
      <View style={styles.list}>
        {fastFood.menu?.map((menu, index) => (
          <DesignItem 
            key={index} 
            menu={menu} 
            variant={1} 
            onPress={() => onMenuClick(menu)} 
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Theme.spacing.sm,
  },
  list: {
    paddingHorizontal: Theme.spacing.md,
  }
});
