"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import React, { useState } from "react";
import { ScrollView, View } from "react-native";
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
  return (
    <View style={{ flex: 1, backgroundColor: DS.bg }} onLayout={onLayoutRootView}>
      <TabHeader onHeightChange={setHeaderHeight}>
        <MerchantHomeHeader />
      </TabHeader>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: headerHeight + 6, paddingHorizontal: 16, gap: 18, paddingBottom: tabBarHeight + 16 }}
      >
        <ShopHeroCard />
        <ShopOrdersSection />
        <ShopManageGrid />
      </ScrollView>
    </View>
  );
}
