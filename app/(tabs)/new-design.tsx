"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { TabHeader } from "@/src/components/molecules/TabHeader";
import { SettingsHeaderProfile } from "@/src/features/profile/components/SettingsHeaderProfile";
import { ShopOrdersSection } from "@/src/features/profile/components/shop-hero/ShopOrdersSection";
import { ShopHeroCard } from "@/src/features/profile/components/shop-hero/ShopHeroCard";
import { useTabBarHeight } from "@/src/hooks/useTabBarHeight";
import { showToast } from "@/src/services/globalToast";
import { t, useLanguage } from "@/src/i18n";
import { DS } from "@/src/theme/ds";

/**
 * Settings → Boutique → « Nouveau design » : apercu du futur profil marchand
 * (header du profil actuel + hero), AVEC la navbar (route (tabs) sans onglet).
 * Le reste sera ajoute au fur et a mesure.
 */
export default function NewDesignScreen() {
  useLanguage();
  const [headerHeight, setHeaderHeight] = useState(150);
  const tabBarHeight = useTabBarHeight();
  return (
    <View style={{ flex: 1, backgroundColor: DS.bg }}>
      <TabHeader onHeightChange={setHeaderHeight}>
        <SettingsHeaderProfile
          onAddAccount={() => showToast(t("Bientôt disponible"), "info")}
        />
      </TabHeader>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: headerHeight + 16,
          // La navbar flotte sur le bas : fin de page juste au-dessus (R19).
          paddingBottom: tabBarHeight + 8,
          paddingHorizontal: 16,
          gap: 18,
        }}
      >
        <ShopHeroCard />
        <ShopOrdersSection />
      </ScrollView>
    </View>
  );
}
