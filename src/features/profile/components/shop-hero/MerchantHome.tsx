"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import React, { useCallback, useState } from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { useMerchant } from "@/src/features/merchant/hooks/useMerchant";
import { TabHeader } from "@/src/components/molecules/TabHeader";
import { MerchantHomeHeader } from "./MerchantHomeHeader";
import { ShopOrdersSection } from "./ShopOrdersSection";
import { ShopHeroCard } from "./ShopHeroCard";
import { ShopManageGrid } from "./ShopManageGrid";
import { useTabBarHeight } from "@/src/hooks/useTabBarHeight";
import { useHideSplash } from "@/src/hooks/useHideSplash";
import { useLanguage } from "@/src/i18n";
import { DS } from "@/src/theme/ds";

/** Home en mode marchand : nouveau design S1D (copie de app/shop/new-design), header D « Mode client ». */
export function MerchantHome() {
  useLanguage();
  const onLayoutRootView = useHideSplash();
  const tabBarHeight = useTabBarHeight();
  const [headerHeight, setHeaderHeight] = useState(150);
  const { refresh } = useMerchant();
  const [refreshTick, setRefreshTick] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  // Pull-to-refresh : relance les stats (spinner jusqu'a leur reponse) et les commandes.
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshTick((n) => n + 1);
    void refresh(false);
  }, [refresh]);
  const onRefreshed = useCallback(() => setRefreshing(false), []);
  return (
    <View style={{ flex: 1, backgroundColor: DS.bg }} onLayout={onLayoutRootView}>
      <TabHeader onHeightChange={setHeaderHeight}>
        <MerchantHomeHeader />
      </TabHeader>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} progressViewOffset={headerHeight} tintColor={DS.accent} colors={[DS.accent]} />}
        contentContainerStyle={{ paddingTop: headerHeight + 6, paddingHorizontal: 16, gap: 18, paddingBottom: tabBarHeight + 16 }}
      >
        <ShopHeroCard refreshTick={refreshTick} onRefreshed={onRefreshed} />
        <ShopOrdersSection />
        <ShopManageGrid />
      </ScrollView>
    </View>
  );
}
