"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { TabHeader } from "@/src/components/molecules/TabHeader";
import { ShopNewHeader, type BackTone } from "@/src/features/profile/components/shop-hero/ShopNewHeader";
import { ShopOrdersSection } from "@/src/features/profile/components/shop-hero/ShopOrdersSection";
import { ShopHeroCard } from "@/src/features/profile/components/shop-hero/ShopHeroCard";
import { ShopPageFrame } from "@/src/features/merchant/components/shop/ShopPageFrame";
import { ShopManageGrid } from "@/src/features/profile/components/shop-hero/ShopManageGrid";
import { useLanguage } from "@/src/i18n";
import { DS } from "@/src/theme/ds";

/**
 * Settings → Boutique → « Nouveau design » : apercu du futur profil marchand
 * (header du profil actuel + sections), SANS navbar (Stack `app/shop` :
 * retour par glissement depuis le bord gauche / geste systeme).
 * Le reste sera ajoute au fur et a mesure.
 */
export default function NewDesignScreen() {
  useLanguage();
  const [headerHeight, setHeaderHeight] = useState(150);
  const { v } = useLocalSearchParams<{ v?: string }>();
  const [tone, setTone] = useState<BackTone>("plain");
  return (
    <ShopPageFrame>
    <View style={{ flex: 1, backgroundColor: DS.bg }}>
      <TabHeader onHeightChange={setHeaderHeight}>
        <ShopNewHeader tone={tone} />
      </TabHeader>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: headerHeight + 6,
          paddingHorizontal: 16,
          gap: 18,
          // Le conteneur Boutique (dernier) prend tout l'espace restant.
          flexGrow: 1,
          paddingBottom: 16,
        }}
      >
        <ShopHeroCard />
        <ShopOrdersSection />
        <ShopManageGrid onTone={setTone} variant={v === "2" ? "S1C" : v === "3" ? "S1A" : "S1D"} />
      </ScrollView>
    </View>
    </ShopPageFrame>
  );
}
