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
      <View style={styles.scrollWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {fastFood.menu?.map((menu, index) => (
            <DesignItem
              key={index}
              menu={menu}
              variant={3}
              merchantName={fastFood.nom}
              onPress={() => onMenuClick(menu)}
              isLast={index === fastFood.menu!.length - 1}
              deliveryHours={(fastFood as any)?.deliveryHours}
              orderLeadTime={(fastFood as any)?.orderLeadTime}
              stock={(menu as any)?.stock ?? 0}
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Theme.spacing.xs,
    marginBottom: Theme.design.marginBottom,
  },
  scrollWrapper: {
    width: '100%',
    overflow: 'hidden',
  }
});
