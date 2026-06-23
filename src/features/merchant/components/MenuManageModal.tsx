import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useMerchant } from "@/src/features/merchant/hooks/useMerchant";
import { TabHeader } from "@/src/components/molecules/TabHeader";
import { HeaderPill } from "@/src/components/molecules/HeaderPill";
import { MenuManagePanel } from "@/src/features/merchant/components/MenuManagePanel";

interface MenuManageModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Écran plein écran de gestion des menus (depuis Settings → Boutique).
 * Rendu comme EditBoutiquePanel : View absolue dans l'arbre (PAS un <Modal>),
 * donc le header floute le settings, la tab bar reste visible, et pas de slide.
 */
export const MenuManageModal: React.FC<MenuManageModalProps> = ({ visible, onClose }) => {
  const { menus, loading, refresh, addMenu } = useMerchant();
  const [headerHeight, setHeaderHeight] = useState(70);
  const [openAddMenu, setOpenAddMenu] = useState<(() => void) | null>(null);

  if (!visible) return null;

  const available = menus.filter(
    (m: any) =>
      m.status === "available" ||
      m.disponibilite === "available" ||
      m.disponibilite === "Disponible",
  ).length;

  return (
    <View style={styles.overlay}>
      {/* Fond blanc opaque sous le header (le settings transparaît seulement
          DERRIÈRE le header → effet blur, comme EditBoutique). */}
      <View style={[styles.contentBg, { top: headerHeight }]} pointerEvents="none" />

      <TabHeader
        title="Gestion menu"
        subtitle={`${available} plat${available > 1 ? "s" : ""} disponible${available > 1 ? "s" : ""}`}
        right={
          <HeaderPill label="Retour" icon="arrow-back-outline" onPress={onClose} />
        }
        onHeightChange={setHeaderHeight}
      />

      <View style={{ flex: 1, paddingTop: headerHeight }}>
        <MenuManagePanel
          menus={menus}
          onRefresh={refresh}
          onAddMenu={async (m: any) => { await addMenu(m); }}
          loading={loading}
          onRegisterAddMenu={(fn) => setOpenAddMenu(() => fn)}
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
