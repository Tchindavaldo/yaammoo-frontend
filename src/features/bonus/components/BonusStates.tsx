import { Theme } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

// Ces états s'affichent sur le fond CLAIR de la page (image floutée + voile
// blanc) : il leur faut donc des tons SOMBRES translucides. En blanc, comme
// avant, ils étaient invisibles et la page paraissait vide au chargement.
const BLOCK = "rgba(0,0,0,0.07)";
const BLOCK_SOFT = "rgba(0,0,0,0.045)";
const TEXT = Theme.colors.dark;
const TEXT_DIM = Theme.colors.gray[600];
// Fond des fausses cartes : même verre translucide que les vraies (BonusGlassCard).
const CARD = "rgba(255,255,255,0.34)";
const CARD_BORDER = "rgba(255,255,255,0.55)";

const GUTTER = Theme.spacing.md;

/** Bloc gris arrondi — brique de base des squelettes. */
const Block: React.FC<{ style?: any }> = ({ style }) => (
  <View style={[styles.block, style]} />
);

/**
 * Placeholder affiché pendant le chargement des bonus. Il reproduit la
 * silhouette réelle de la page (carte principale + stats + mini-cartes +
 * ligne de réclamation) pour que l'arrivée des vraies données ne fasse pas
 * sauter la mise en page, et pulse doucement pour signaler l'attente.
 */
export const BonusSkeleton: React.FC = () => {
  const pulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.5,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View style={[styles.root, { opacity: pulse }]}>
      {/* Deux blocs de stats (Commandes / Montant) */}
      <View style={styles.row}>
        {[0, 1].map((i) => (
          <View key={i} style={[styles.card, styles.statBlock]}>
            <Block style={{ width: "55%", height: 11 }} />
            <View style={styles.statCells}>
              {[0, 1, 2].map((j) => (
                <View key={j} style={styles.statCell}>
                  <Block style={{ width: 26, height: 18 }} />
                  <Block style={{ width: 18, height: 9 }} />
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>

      {/* Carte principale */}
      <View style={[styles.card, styles.mainCard]}>
        <View style={styles.mainTop}>
          <Block style={{ width: "45%", height: 24 }} />
          <Block style={{ width: 84, height: 30, borderRadius: 15 }} />
        </View>
        <Block style={{ width: "60%", height: 16 }} />
        <Block style={{ width: "85%", height: 12 }} />
        <Block style={{ width: "100%", height: 8, borderRadius: 4 }} />
        <View style={styles.mainInfos}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.infoCol}>
              <Block style={{ width: 34, height: 11 }} />
              <Block style={{ width: 48, height: 16 }} />
            </View>
          ))}
        </View>
      </View>

      {/* Mini-cartes */}
      <View style={styles.row}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.card, styles.mini]}>
            <Block style={{ width: "70%", height: 12 }} />
            <Block style={{ width: "50%", height: 9 }} />
            <Block style={{ width: "100%", height: 30, borderRadius: 8 }} />
            <Block style={{ width: "100%", height: 6, borderRadius: 3 }} />
          </View>
        ))}
      </View>

      {/* Ligne de réclamation */}
      <View style={styles.row}>
        <View style={[styles.card, styles.claimRow]}>
          <Block style={{ width: 40, height: 40, borderRadius: 14 }} />
          <View style={styles.claimText}>
            <Block style={{ width: "55%", height: 14 }} />
            <Block style={{ width: "80%", height: 11 }} />
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

/** État vide / erreur, avec message et icône. */
export const BonusEmptyState: React.FC<{
  icon?: any;
  title: string;
  subtitle?: string;
}> = ({ icon = "gift-outline", title, subtitle }) => (
  <View style={styles.empty}>
    <View style={styles.emptyIcon}>
      <Ionicons name={icon} size={40} color={TEXT} />
    </View>
    <Text style={styles.emptyTitle}>{title}</Text>
    {!!subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "space-around" },
  block: { backgroundColor: BLOCK, borderRadius: 6 },
  row: { flexDirection: "row", gap: 10, marginHorizontal: GUTTER - 10 },

  // Fausses cartes : mêmes verre, rayon et liseré que les vraies.
  card: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: CARD_BORDER,
  },
  statBlock: { flex: 1, borderRadius: 16, padding: 10, gap: 8 },
  statCells: { flexDirection: "row", marginTop: 2 },
  statCell: { flex: 1, gap: 4 },

  mainCard: {
    marginHorizontal: GUTTER - 10,
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 10,
    gap: 10,
  },
  mainTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  mainInfos: { flexDirection: "row", justifyContent: "space-between" },
  infoCol: { flex: 1, gap: 4 },

  mini: { flex: 1, borderRadius: 16, padding: 10, gap: 6 },

  claimRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  claimText: { flex: 1, gap: 5 },

  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: BLOCK_SOFT,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: TEXT,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13,
    color: TEXT_DIM,
    textAlign: "center",
    lineHeight: 19,
  },
});
