import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { FastFood, Menu } from '@/src/types';
import { MerchantHeader } from '../MerchantHeader';
import { DesignItem } from './DesignItem';
import { Theme } from '@/src/theme';

interface DesignProps {
  fastFood: FastFood;
  onMenuClick: (menu: Menu) => void;
}

export const Design3: React.FC<DesignProps> = ({ fastFood, onMenuClick }) => {
  return (
    <View style={styles.container}>
      <MerchantHeader 
        name={fastFood.nom} 
        image={fastFood.image} 
        rating={fastFood.stats?.rating} 
      />
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        {fastFood.menu?.map((menu, index) => (
          <DesignItem 
            key={index} 
            menu={menu} 
            variant={3} 
            merchantName={fastFood.nom}
            onPress={() => onMenuClick(menu)} 
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Theme.spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  }
});
