import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { FastFood, Menu } from '@/src/types';
import { DesignItem } from './DesignItem';
import { Theme } from '@/src/theme';

interface DesignProps {
  fastFood: FastFood;
  onMenuClick: (menu: Menu) => void;
}

export const Design4: React.FC<DesignProps> = ({ fastFood, onMenuClick }) => {
  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {fastFood.menu?.map((menu, index) => (
          <DesignItem 
            key={index} 
            menu={menu} 
            variant={4} 
            onPress={() => onMenuClick(menu)} 
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Theme.spacing.md,
  },
  scrollContent: {
    paddingLeft: Theme.spacing.md,
  }
});
