import { BlurView } from "expo-blur";
import React from "react";
import { Animated, StyleSheet, View } from "react-native";

// Mêmes constantes que la page web (public/payment/index.html) pour que le
// squelette se superpose EXACTEMENT au rendu final.
export const SHEET_HEIGHT = 384;
const CAPSULE_HEIGHT = 70;
const GAP = 12;

/**
 * Squelette affiché pendant le chargement de la page de paiement : reprend au
 * pixel près le panel HAUT (récap + réseaux) et la capsule BAS (saisie du n°).
 */
export const PaymentWebViewSkeleton: React.FC = () => {
  const pulse = React.useRef(new Animated.Value(0.5)).current;

  React.useEffect(() => {
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
    <View style={styles.zone} pointerEvents="none">
      {/* Fond flouté de la zone des deux overlays (comme la page web) */}
      <BlurView intensity={40} tint="dark" style={styles.zoneBlur} />

      {/* Panel HAUT */}
      <Animated.View style={[styles.panel, { opacity: pulse }]}>
        <View style={styles.menuHeader}>
          <View style={styles.menuImage} />
          <View style={styles.menuHeaderInfo}>
            <View style={[styles.line, { width: "45%", height: 16 }]} />
            <View
              style={[styles.line, { width: "95%", height: 11, marginTop: 8 }]}
            />
            <View
              style={[styles.line, { width: "60%", height: 11, marginTop: 5 }]}
            />
          </View>
        </View>

        <View style={styles.recapRow}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.recapItem}>
              <View style={styles.recapIcon} />
              <View style={[styles.line, { width: 42, height: 10 }]} />
              <View style={[styles.line, { width: 34, height: 11 }]} />
            </View>
          ))}
        </View>

        <View style={styles.totalRow}>
          <View style={[styles.line, { width: 90, height: 14 }]} />
          <View style={[styles.line, { width: 130, height: 24 }]} />
        </View>

        <View style={styles.actionArea}>
          <View style={[styles.line, { width: "70%", height: 13 }]} />
          <View style={styles.networkRow}>
            <View style={styles.networkChip} />
            <View style={styles.networkChip} />
          </View>
        </View>
      </Animated.View>

      {/* Capsule BAS */}
      <Animated.View style={[styles.capsule, { opacity: pulse }]}>
        <View style={styles.circle} />
        <View style={styles.inputPill} />
        <View style={styles.circle} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  zone: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    paddingHorizontal: 8,
    paddingBottom: 2,
  },
  zoneBlur: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: SHEET_HEIGHT,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  // --- Panel HAUT ---
  panel: {
    height: SHEET_HEIGHT - CAPSULE_HEIGHT - GAP - 8,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.85)",
    padding: 14,
    marginBottom: GAP,
  },
  menuHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  menuImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  menuHeaderInfo: { flex: 1 },
  recapRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  recapItem: { flex: 1, alignItems: "center", gap: 5 },
  recapIcon: {
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: "rgba(236,73,19,0.25)",
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  actionArea: { marginTop: "auto" },
  networkRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  networkChip: {
    flex: 1,
    height: 43,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  line: { borderRadius: 6, backgroundColor: "rgba(0,0,0,0.09)" },
  // --- Capsule BAS ---
  capsule: {
    width: "100%",
    height: CAPSULE_HEIGHT,
    borderRadius: 80,
    backgroundColor: "rgba(0,0,0,0.4)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  inputPill: {
    flex: 1,
    height: 45,
    borderRadius: 22.5,
    marginHorizontal: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
});
