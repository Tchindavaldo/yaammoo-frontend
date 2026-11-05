"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { DS } from "@/src/theme";
import { useMerchant } from "@/src/features/merchant/hooks/useMerchant";
import { TabHeader } from "@/src/components/molecules/TabHeader";
import { WalletCardsVariant } from "@/src/features/merchant/components/WalletNetworkCards";
import { PorteFeuillePanel } from "@/src/features/merchant/components/PorteFeuillePanel";
import { t, useLanguage } from "@/src/i18n";

interface WalletManageModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Écran plein écran du portefeuille marchand (depuis Settings → Boutique).
 * Rendu par la route `app/shop/wallet.tsx` : page entière hors (tabs), sans navbar.
 */
export const WalletManageModal: React.FC<WalletManageModalProps> = ({ visible, onClose }) => {
  useLanguage();
  const { refresh } = useMerchant();
  const [headerHeight, setHeaderHeight] = useState(70);
  const [walletBalance, setWalletBalance] = useState(0);
  const [openWithdraw, setOpenWithdraw] = useState<(() => void) | null>(null);
  const [variant, setVariant] = useState<WalletCardsVariant>(1);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      {/* Fond blanc opaque sous le header (le settings transparaît seulement
          DERRIÈRE le header → effet blur, comme EditBoutique). */}
      <View style={[styles.contentBg, { top: headerHeight }]} pointerEvents="none" />

      <TabHeader
        title={t("Portefeuille")}
        subtitle={`${walletBalance.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} XAF`}
        right={
          // Choix temporaire de la présentation des cartes (maquettes C et G).
          <View style={styles.variants}>
            {([1, 2] as WalletCardsVariant[]).map((v) => (
              <TouchableOpacity
                key={v}
                onPress={() => setVariant(v)}
                style={[styles.variantBtn, variant === v && styles.variantBtnOn]}
              >
                <Text style={[styles.variantTxt, variant === v && styles.variantTxtOn]}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>
        }
        onHeightChange={setHeaderHeight}
      />

      <View style={{ flex: 1, paddingTop: headerHeight }}>
        <PorteFeuillePanel
          onRefresh={refresh}
          onBalanceChange={setWalletBalance}
          onRegisterWithdraw={(fn) => setOpenWithdraw(() => fn)}
          cardsVariant={variant}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: DS.bg,
  },
  contentBg: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: DS.bg,
  },
  variants: { flexDirection: "row", gap: 6 },
  variantBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: DS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  variantBtnOn: { backgroundColor: DS.accent },
  variantTxt: { fontSize: 12, fontWeight: "700", color: DS.ink },
  variantTxtOn: { color: DS.onInk },
});
