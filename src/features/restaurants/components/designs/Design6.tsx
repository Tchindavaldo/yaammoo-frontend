import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { FastFood, Menu } from '@/src/types';
import { MerchantHeader } from '../MerchantHeader';
import { DesignItem } from './DesignItem';
import { Theme } from '@/src/theme';
import { useRowCommitProbe } from '../../utils/useRowCommitProbe';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_WIDTH_6 = Math.round(SCREEN_WIDTH * 0.78) + 8; // width + gap from SKELETON_SIZES

interface DesignProps {
  fastFood: FastFood;
  onMenuClick: (menu: Menu) => void;
}

export const Design6: React.FC<DesignProps> = ({ fastFood, onMenuClick }) => {
  useRowCommitProbe(6, fastFood.menu?.length ?? 0, (fastFood as any)?.id);

  const menus = useMemo(() => fastFood.menu ?? [], [fastFood.menu]);
  const menuCount = menus.length;

  const renderItem = useCallback(({ item, index }: { item: Menu; index: number }) => (
    <DesignItem
      menu={item}
      variant={6}
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
      length: ITEM_WIDTH_6,
      offset: ITEM_WIDTH_6 * index,
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
          estimatedItemSize={ITEM_WIDTH_6}
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
