import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useMerchant } from "@/src/features/merchant/hooks/useMerchant";
import { TabHeader } from "@/src/components/molecules/TabHeader";
import { HeaderPill } from "@/src/components/molecules/HeaderPill";
import { PorteFeuillePanel } from "@/src/features/merchant/components/PorteFeuillePanel";

interface WalletManageModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Écran plein écran du portefeuille marchand (depuis Settings → Boutique).
 * Rendu comme EditBoutiquePanel : View absolue dans l'arbre (PAS un <Modal>),
 * donc le header floute le settings, la tab bar reste visible, et pas de slide.
 */
export const WalletManageModal: React.FC<WalletManageModalProps> = ({ visible, onClose }) => {
  const { refresh } = useMerchant();
  const [headerHeight, setHeaderHeight] = useState(70);
  const [walletBalance, setWalletBalance] = useState(0);
  const [openWithdraw, setOpenWithdraw] = useState<(() => void) | null>(null);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      {/* Fond blanc opaque sous le header (le settings transparaît seulement
          DERRIÈRE le header → effet blur, comme EditBoutique). */}
      <View style={[styles.contentBg, { top: headerHeight }]} pointerEvents="none" />

      <TabHeader
        title="Portefeuille"
        subtitle={`${walletBalance.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} XAF`}
        right={
          <HeaderPill label="Retour" icon="arrow-back-outline" onPress={onClose} />
        }
        onHeightChange={setHeaderHeight}
      />

      <View style={{ flex: 1, paddingTop: headerHeight }}>
        <PorteFeuillePanel
          onRefresh={refresh}
          onBalanceChange={setWalletBalance}
          onRegisterWithdraw={(fn) => setOpenWithdraw(() => fn)}
        />
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
