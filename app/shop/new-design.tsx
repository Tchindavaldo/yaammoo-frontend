"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { ShopPageFrame } from "@/src/features/merchant/components/shop/ShopPageFrame";
import { TabHeader } from "@/src/components/molecules/TabHeader";
import { SettingsHeaderProfile } from "@/src/features/profile/components/SettingsHeaderProfile";
import { ShopHeroCard } from "@/src/features/profile/components/shop-hero/ShopHeroCard";
import { showToast } from "@/src/services/globalToast";
import { t, useLanguage } from "@/src/i18n";
import { DS } from "@/src/theme/ds";

/**
 * Settings → Boutique → « Nouveau design » : apercu du futur profil marchand
 * (header du profil actuel + hero). Le reste sera ajoute au fur et a mesure.
 * Retour : geste systeme / glissement (Stack `app/shop`).
 */
export default function ShopNewDesignScreen() {
  useLanguage();
  const [headerHeight, setHeaderHeight] = useState(150);
  return (
    <ShopPageFrame>
      <View style={{ flex: 1, backgroundColor: DS.bg }}>
        <TabHeader onHeightChange={setHeaderHeight}>
          <SettingsHeaderProfile
            onAddAccount={() => showToast(t("Bientôt disponible"), "info")}
          />
        </TabHeader>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: headerHeight + 16, paddingHorizontal: 16 }}
        >
          <ShopHeroCard />
        </ScrollView>
      </View>
    </ShopPageFrame>
  );
}
