import React from "react";
import { StyleSheet, View } from "react-native";
import {
  SAFE_AREA_BG,
  SAFE_AREA_DEBUG,
  useFooterBottomInset,
  usePageBottomInset,
} from "@/src/hooks/usePageBottomInset";

/**
 * Cadre des pages entieres Settings → Boutique (`app/shop/*`). Reserve la
 * safe area basse (ratio par OS, `usePageBottomInset`) et TRONQUE tout ce qui
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
  const footerInset = useFooterBottomInset();
  return (
    <View style={[styles.root, { paddingBottom: ownFooter ? 0 : bottom }]}>
      <View style={styles.clip}>{children}</View>
      {/* Mode verification (SAFE_AREA_DEBUG) : rend visible la safe-area
          absorbee par le pied de page. */}
      {ownFooter && SAFE_AREA_DEBUG && (
        <View pointerEvents="none" style={[styles.debugBand, { height: footerInset }]} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // Couleur de la bande reservee : globale (SAFE_AREA_BG).
  root: { flex: 1, backgroundColor: SAFE_AREA_BG },
  clip: { flex: 1, overflow: "hidden" },
  debugBand: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: SAFE_AREA_BG },
});
