import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { TabHeader } from "@/src/components/molecules/TabHeader";
import { HeaderPill } from "@/src/components/molecules/HeaderPill";
import { CartStatusPanel } from "@/src/features/orders/components/CartStatusPanel";

interface UserOrdersModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Écran plein écran « État des commandes » (depuis Settings → Mes activités).
 * Même rendu que les autres modals settings : View absolue (pas un <Modal>),
 * header qui floute le settings dessous. Délègue tout au CartStatusPanel.
 */
export const UserOrdersModal: React.FC<UserOrdersModalProps> = ({ visible, onClose }) => {
  const [headerHeight, setHeaderHeight] = useState(70);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={[styles.contentBg, { top: headerHeight }]} pointerEvents="none" />

      <TabHeader
        title="Mes commandes"
        right={<HeaderPill label="Retour" icon="arrow-back-outline" onPress={onClose} />}
        onHeightChange={setHeaderHeight}
      />

      <CartStatusPanel topOffset={headerHeight} bottomOffset={20} />
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
