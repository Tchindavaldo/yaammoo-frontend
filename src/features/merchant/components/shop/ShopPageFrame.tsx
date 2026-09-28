import React from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaDebugBand } from "@/src/components/SafeAreaDebugBand";
import { SAFE_AREA_BG, usePageBottomInset } from "@/src/hooks/usePageBottomInset";

/**
 * Cadre des pages entieres Settings → Boutique (`app/shop/*`). Reserve la
 * safe area basse (source unique, `usePageBottomInset`) et TRONQUE tout ce qui
 * deborde au-dessus : aucun element de la page ne passe sous la barre systeme.
 * Le contenu n'ajoute donc jamais `insets.bottom` lui-meme.
 *
 * `ownFooter` : la page a un pied de page fixe qui gere lui-meme la safe area
 * (`useFooterBottomInset`) en descendant jusqu'au bord ; le cadre ne reserve
 * alors rien en bas (sinon le pied flotte au-dessus d'une bande vide).
 */
export const ShopPageFrame: React.FC<{ children: React.ReactNode; ownFooter?: boolean }> = ({
  children,
  ownFooter = false,
}) => {
  const bottom = usePageBottomInset();
  return (
    <View style={[styles.root, { paddingBottom: ownFooter ? 0 : bottom }]}>
      <View style={styles.clip}>{children}</View>
      {/* Mode verification : rend visible la safe-area absorbee par le pied. */}
      {ownFooter && <SafeAreaDebugBand />}
    </View>
  );
};

const styles = StyleSheet.create({
  // Couleur de la bande reservee : globale (SAFE_AREA_BG).
  root: { flex: 1, backgroundColor: SAFE_AREA_BG },
  clip: { flex: 1, overflow: "hidden" },
});
