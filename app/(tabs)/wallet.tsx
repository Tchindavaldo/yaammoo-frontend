"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
// Onglet Portefeuille (mode marchand). Copie de WalletManageModal sans bouton
// Retour : la page est un onglet de la navbar.
import React, { useState } from "react";
import { View } from "react-native";
import { DS } from "@/src/theme";
import { useMerchant } from "@/src/features/merchant/hooks/useMerchant";
import { TabHeader } from "@/src/components/molecules/TabHeader";
import { PorteFeuillePanel } from "@/src/features/merchant/components/PorteFeuillePanel";
import { useTabBarHeight } from "@/src/hooks/useTabBarHeight";
import { t, useLanguage } from "@/src/i18n";

export default function WalletTab() {
  useLanguage();
  const { refresh } = useMerchant();
  const tabBarHeight = useTabBarHeight();
  const [headerHeight, setHeaderHeight] = useState(70);
  const [walletBalance, setWalletBalance] = useState(0);

  return (
    <View style={{ flex: 1, backgroundColor: DS.bg }}>
      <TabHeader
        title={t("Portefeuille")}
        subtitle={`${walletBalance.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} XAF`}
        onHeightChange={setHeaderHeight}
      />
      <View style={{ flex: 1, paddingTop: headerHeight, paddingBottom: tabBarHeight }}>
        <PorteFeuillePanel onRefresh={refresh} onBalanceChange={setWalletBalance} onRegisterWithdraw={() => {}} />
      </View>
    </View>
  );
}
