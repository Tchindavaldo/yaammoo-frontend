import { BonusPagerView } from "@/modules/bonus-pager";
import { Theme } from "@/src/theme";
import Ionicons from "@expo/vector-icons/Ionicons";
import React, { memo, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import type { Bonus, BonusClaimStatus } from "../types/bonus.types";
import { toPagerItem } from "../utils/bonusPagerItem";
import { BonusCard } from "./BonusCard";
import { CAROUSEL_INTERVAL } from "./BonusCarousel";

/**
 * Carrousel NATIF de la sheet Bonus (iOS, `modules/bonus-pager`), à la place
 * de `BonusCarousel` + carte de pagination React.
 *
 * Les cartes restent des `BonusCard` React ; le natif possède le défilement
 * et dessine le pied de page (galerie + panneau héro), recalé dans le même
 * appel que le scroll : aucun `scrollX` JS, aucun aller-retour par image.
 * React ne fait rien pendant le geste.
 */

/**
 * Pied de page réservé en bas : `marginTop` 10 + `paddingVertical` 2 × 10 +
 * mini-carte de la galerie (71), comme la carte de pagination React.
 */
const FOOTER_HEIGHT = 101;
const ICON_FONT = Ionicons.getFontFamily?.() ?? null;

interface NativeBonusPagerProps {
  bonuses: Bonus[];
  claims: Record<string, BonusClaimStatus>;
  onClaim: (bonus: Bonus) => void;
  onActivate: (bonus: Bonus) => void;
  arming?: Record<string, boolean>;
  onBlocked: (reason: string) => void;
}

const NativeBonusPagerBase = ({
  bonuses,
  claims,
  onClaim,
  onActivate,
  arming,
  onBlocked,
}: NativeBonusPagerProps) => {
  const items = useMemo(() => bonuses.map(toPagerItem), [bonuses]);
  const footerHeight = bonuses.length > 1 ? FOOTER_HEIGHT : 0;

  if (!BonusPagerView) return null;
  return (
    <BonusPagerView
      style={[styles.pager, { paddingBottom: footerHeight }]}
      items={items}
      footerHeight={footerHeight}
      textColor={Theme.colors.dark}
      iconFontFamily={ICON_FONT}
    >
      {bonuses.map((bonus) => (
        // `collapsable={false}` : une vraie vue native par page, montée telle
        // quelle dans la piste du scroll natif (jamais aplatie par Fabric).
        <View key={bonus.id} collapsable={false} style={styles.page}>
          <BonusCard
            bonus={bonus}
            claimStatus={claims[bonus.id]}
            onClaim={onClaim}
            cardImage={null}
            onActivate={onActivate}
            arming={!!arming?.[bonus.id]}
            onBlocked={onBlocked}
          />
        </View>
      ))}
    </BonusPagerView>
  );
};

/** Mémoïsé : ne dépend que des bonus, des statuts et de callbacks stables. */
export const NativeBonusPager = memo(NativeBonusPagerBase);

const styles = StyleSheet.create({
  // Les pages se suivent en ligne (page N à N × largeur) ; le natif les monte
  // dans son UIScrollView pagine.
  pager: { flex: 1, flexDirection: "row" },
  page: { width: CAROUSEL_INTERVAL, flexShrink: 0, justifyContent: "center" },
});
