import { Theme } from "@/src/theme";
import { FastFood, Menu } from "@/src/types";
import { FlashList } from "@shopify/flash-list";
import React, { useCallback, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useRowCommitProbe } from "../../utils/useRowCommitProbe";
import { MerchantHeader } from "../MerchantHeader";
import { DesignItem } from "./DesignItem";

interface DesignProps {
  fastFood: FastFood;
  onMenuClick: (menu: Menu) => void;
}

const LIMIT_MENUS_ENABLED = false;
const MAX_VISIBLE_MENUS = 3;

export const Design2: React.FC<DesignProps> = ({ fastFood, onMenuClick }) => {
  useRowCommitProbe(2, fastFood.menu?.length ?? 0, (fastFood as any)?.id);

  const menus = useMemo(() => fastFood.menu ?? [], [fastFood.menu]);
  const menuCount = menus.length;
  const visibleMenus = useMemo(
    () => (LIMIT_MENUS_ENABLED ? menus.slice(0, MAX_VISIBLE_MENUS) : menus),
    [menus],
  );
  const visibleCount = visibleMenus.length;

  const renderItem = useCallback(
    ({ item, index }: { item: Menu; index: number }) => (
      <DesignItem
        menu={item}
        variant={2}
        merchantName={fastFood.nom}
        onPress={() => onMenuClick(item)}
        index={index}
        isLast={index === visibleCount - 1}
        deliveryHours={(fastFood as any)?.deliveryHours}
        orderLeadTime={(fastFood as any)?.orderLeadTime}
        stock={(item as any)?.stock ?? 0}
      />
    ),
    [
      fastFood.nom,
      onMenuClick,
      fastFood.deliveryHours,
      fastFood.orderLeadTime,
      visibleCount,
    ],
  );

  const keyExtractor = useCallback(
    (item: Menu) => item.id ?? String(Math.random()),
    [],
  );

  const getItemLayout = useCallback(
    (data: Menu[], index: number) => ({
      length: 228,
      offset: 228 * index,
      index,
    }),
    [],
  );

  return (
    <View style={styles.container}>
      <MerchantHeader
        // name="2"
        name={fastFood.nom}
        image={fastFood.image}
        rating={fastFood.stats?.rating}
        orderCount={(fastFood as any)?.stats?.orders ?? 0}
        reviewCount={(fastFood as any)?.stats?.votes ?? 0}
        syncWithImage={fastFood.menu?.[0]?.image}
      />
      <View style={styles.scrollWrapper}>
        <FlashList
          data={visibleMenus}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          horizontal
          showsHorizontalScrollIndicator={false}
          estimatedItemSize={228}
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
    width: "100%",
    overflow: "hidden",
  },
});
