import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { FastFood, Menu } from '@/src/types';
import { MerchantHeader } from '../MerchantHeader';
import { DesignItem } from './DesignItem';
import { Theme } from '@/src/theme';
import { useRowCommitProbe } from '../../utils/useRowCommitProbe';

interface DesignProps {
  fastFood: FastFood;
  onMenuClick: (menu: Menu) => void;
}

export const Design3: React.FC<DesignProps> = ({ fastFood, onMenuClick }) => {
  useRowCommitProbe(3, fastFood.menu?.length ?? 0, (fastFood as any)?.id);

  const menus = useMemo(() => fastFood.menu ?? [], [fastFood.menu]);
  const menuCount = menus.length;

  const renderItem = useCallback(({ item, index }: { item: Menu; index: number }) => (
    <DesignItem
      menu={item}
      variant={3}
      merchantName={fastFood.nom}
      onPress={() => onMenuClick(item)}
      index={index}
      isLast={index === menuCount - 1}
      deliveryHours={(fastFood as any)?.deliveryHours}
      orderLeadTime={(fastFood as any)?.orderLeadTime}
      stock={(item as any)?.stock ?? 0}
    />
  ), [fastFood.nom, onMenuClick, fastFood.deliveryHours, fastFood.orderLeadTime, menuCount]);

  const keyExtractor = useCallback((item: Menu) => item.id ?? String(Math.random()), []);

  const getItemLayout = useCallback(
    (data: Menu[], index: number) => ({
      length: 138,
      offset: 138 * index,
      index,
    }),
    [],
  );

  return (
    <View style={styles.container}>
      <MerchantHeader
        name={fastFood.nom}
        image={fastFood.image}
        rating={fastFood.stats?.rating}
        syncWithImage={fastFood.menu?.[0]?.image}
      />
      <View style={styles.scrollWrapper}>
        <FlashList
          data={menus}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          horizontal
          showsHorizontalScrollIndicator={false}
          estimatedItemSize={138}
        />
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
