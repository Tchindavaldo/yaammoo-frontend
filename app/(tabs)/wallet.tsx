"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
// Onglet Portefeuille (mode marchand). Copie de WalletManageModal : pas de
// bouton Retour (onglet), « Faire un retrait » dans le header a droite.
import React, { useState } from "react";
import { View } from "react-native";
import { DS } from "@/src/theme";
import { useMerchant } from "@/src/features/merchant/hooks/useMerchant";
import { TabHeader } from "@/src/components/molecules/TabHeader";
import { MerchantWalletTabPanel } from "@/src/features/merchant/components/MerchantWalletTabPanel";
import { HeaderPill } from "@/src/components/molecules/HeaderPill";
import { useTabBarHeight } from "@/src/hooks/useTabBarHeight";
import { t, useLanguage } from "@/src/i18n";

export default function WalletTab() {
  useLanguage();
  const { refresh } = useMerchant();
  const tabBarHeight = useTabBarHeight();
  const [headerHeight, setHeaderHeight] = useState(70);
  const [walletBalance, setWalletBalance] = useState(0);
  const [openWithdraw, setOpenWithdraw] = useState<(() => void) | null>(null);

  return (
    <View style={{ flex: 1, backgroundColor: DS.bg }}>
      <TabHeader
        title={t("Portefeuille")}
        subtitle={`${walletBalance.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} XAF`}
        right={<HeaderPill label={t("Faire un retrait")} icon="arrow-up" onPress={() => openWithdraw?.()} />}
        onHeightChange={setHeaderHeight}
      />
      <View style={{ flex: 1, paddingTop: headerHeight, paddingBottom: tabBarHeight }}>
        <MerchantWalletTabPanel onRefresh={refresh} onBalanceChange={setWalletBalance} onRegisterWithdraw={(fn) => setOpenWithdraw(() => fn)} />
      </View>
    </View>
  );
}
