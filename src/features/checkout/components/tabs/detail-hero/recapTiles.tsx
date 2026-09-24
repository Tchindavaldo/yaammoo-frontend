import { Theme } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

/**
 * Briques du design « recap photo » (V1..V3), derive du recap menu marchand
 * (`merchant/.../recap-designs/MenuRecapDesign1`, copie R16) : bandeau
 * titre + gros chiffre, pastilles de taille, tuiles combo.
 */
export const ORANGE = Theme.colors.primary;

export const PALETTE = {
  tile: "rgba(255,255,255,0.93)",
  count: ORANGE,
  ink: "#000",
  chip: "rgba(255,255,255,0.88)",
  chipText: Theme.colors.dark,
  chipOn: ORANGE,
  chipTextOn: "white",
};

export const BANNER_HEIGHT = 58;

/** Bandeau haut : nom + description a gauche, gros chiffre a droite. */
export const Banner: React.FC<{
  name: string;
  status: string;
  bigNum: string;
  bigLabel: string;
}> = ({ name, status, bigNum, bigLabel }) => (
  <View style={styles.bannerBox}>
    <View style={styles.banner}>
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <View style={styles.statusRow}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText} numberOfLines={1}>
            {status}
          </Text>
        </View>
      </View>
      <View style={styles.bigBox}>
        <Text style={styles.bigNum} numberOfLines={1} adjustsFontSizeToFit>
          {bigNum}
        </Text>
        <Text style={styles.bigLabel}>{bigLabel}</Text>
      </View>
    </View>
  </View>
);

/** Tuile combo : icone + compteur, titre, sous-titre. */
export const Tile: React.FC<{
  icon: string;
  count: string;
  title: string;
  sub: string;
  onPress?: () => void;
}> = ({ icon, count, title, sub, onPress }) => {
  const p = PALETTE;
  return (
    <TouchableOpacity
      disabled={!onPress}
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.tile, { backgroundColor: p.tile }]}
    >
      <View style={styles.tileHead}>
        <Ionicons name={icon as any} size={15} color={p.ink} />
        <Text
          style={[styles.tileCount, { color: p.count }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {count}
        </Text>
      </View>
      <Text
        style={[styles.tileTitle, { color: p.ink }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {title}
      </Text>
      <Text style={[styles.tileSub, { color: p.ink }]} numberOfLines={1}>
        {sub}
      </Text>
    </TouchableOpacity>
  );
};

/** « 2500 FCFA » → « 2500 » ; « Gratuit » inchange. */
export const amount = (value: string) => value.replace(" FCFA", "");

const styles = StyleSheet.create({
  bannerBox: {
    height: BANNER_HEIGHT,
    borderRadius: Theme.borderRadius.xl,
    overflow: "hidden",
  },
  banner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 8,
    paddingTop: 2,
  },
  name: { fontSize: 18, fontWeight: "900", color: "white", letterSpacing: -0.3 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#aef5d2",
  },
  statusText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.95)",
  },
  bigBox: { alignItems: "center", maxWidth: 110 },
  bigNum: { fontSize: 26, fontWeight: "900", color: "#ff8a4c", lineHeight: 28 },
  bigLabel: { fontSize: 11, fontWeight: "800", color: "rgba(255,255,255,0.9)" },
  tile: {
    flex: 1,
    height: 61,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: Theme.borderRadius.lg,
  },
  tileHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
  },
  tileCount: { flexShrink: 1, fontSize: 16, lineHeight: 20, fontWeight: "900" },
  tileTitle: { fontSize: 12, lineHeight: 15, fontWeight: "800", marginTop: 2 },
  tileSub: { fontSize: 11, lineHeight: 13, fontWeight: "600", marginTop: 1 },
});
