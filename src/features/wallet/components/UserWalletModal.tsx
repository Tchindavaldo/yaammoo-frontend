import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { TabHeader } from "@/src/components/molecules/TabHeader";
import { HeaderPill } from "@/src/components/molecules/HeaderPill";
import { WalletPanel } from "@/src/features/wallet/components/WalletPanel";

interface UserWalletModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Écran plein écran du portefeuille UTILISATEUR (depuis Settings → Mes activités).
 * Même rendu que WalletManageModal (marchand) : View absolue dans l'arbre (pas
 * un <Modal>), header qui floute le settings dessous, tab bar visible.
 * Réutilise le WalletPanel user (différent du PorteFeuillePanel marchand).
 */
export const UserWalletModal: React.FC<UserWalletModalProps> = ({ visible, onClose }) => {
  const [headerHeight, setHeaderHeight] = useState(70);
  const [walletBalance, setWalletBalance] = useState(0);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={[styles.contentBg, { top: headerHeight }]} pointerEvents="none" />

      <TabHeader
        title="Portefeuille"
        subtitle={`${walletBalance.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} FCFA`}
        right={<HeaderPill label="Retour" icon="arrow-back-outline" onPress={onClose} />}
        onHeightChange={setHeaderHeight}
      />

      <View style={{ flex: 1 }}>
        <WalletPanel onBalanceChange={setWalletBalance} topOffset={headerHeight} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    backgroundColor: "transparent",
  },
  contentBg: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
  },
});
