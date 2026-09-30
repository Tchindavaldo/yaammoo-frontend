import { DS } from "@/src/theme/ds";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { CardVariantProps, SKELETON_SIZES, V4_BACKGROUNDS } from "../config";
import { DELIVERY_ETA, feeText, isStockLow, stockParts, stockRatio } from "./labels";

/**
 * Design 4 aere (HOME_DESIGN = "aere") : photo plein cadre sous degrade
 * sombre, prix en haut, stock en 10 segments en bas ; titre, note, livraison
 * sous la carte (`V4AereMeta`).
 */
const SIZE = SKELETON_SIZES[4];
const SEGMENTS = 10;

export const CardV4Aere: React.FC<CardVariantProps> = ({
  menu,
  onPress,
  index,
  isLast,
  stock,
  price,
}) => {
  const source = menu.image ? { uri: menu.image } : V4_BACKGROUNDS[index % V4_BACKGROUNDS.length];
  const { value, unit } = stockParts(stock);
  const filled = Math.ceil(stockRatio(stock) * SEGMENTS);
  return (
    <TouchableOpacity
      style={[
        styles.card,
        { width: SIZE.width, height: SIZE.height, borderRadius: SIZE.radius },
        isLast && { marginRight: 0 },
      ]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
      <LinearGradient
        pointerEvents="none"
        colors={[DS.scrimTop, DS.scrimNone, DS.scrimNone, DS.scrimMid, DS.scrimEnd]}
        locations={[0, 0.24, 0.45, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.top}>
        <View style={styles.pricePill}>
          <Text style={styles.priceText}>{price}</Text>
        </View>
      </View>
      <View style={styles.bottom}>
        <View style={[styles.row, { alignItems: "baseline", gap: 6 }]}>
          <Text style={styles.stock}>{value}</Text>
          <Text style={styles.stockUnit}>{unit}</Text>
        </View>
        <View style={[styles.row, { gap: 3 }]}>
          {Array.from({ length: SEGMENTS }, (_, i) => (
            <View
              key={i}
              style={[
                styles.segment,
                // Rouge vif sur fond sombre (le rouge fonce y disparaitrait).
                i < filled && { backgroundColor: isStockLow(stock) ? DS.danger : DS.onInk },
              ]}
            />
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );
};

/** Lignes sous la carte : titre + note/avis, puis frais a gauche et delai a droite. */
export const V4AereMeta: React.FC<{
  title: string;
  rating: number;
  votes: number;
  deliveryFeeLabel: string;
}> = ({ title, rating, votes, deliveryFeeLabel }) => (
  <>
    <View style={styles.row}>
      <Text style={styles.metaTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.flex} />
      <Ionicons name="star" size={12} color={DS.star} />
      <Text style={[styles.metaText, { color: DS.ink }]}>{rating}</Text>
      <Text style={styles.metaMuted}>({votes} avis)</Text>
    </View>
    <View style={styles.row}>
      <Text style={styles.metaText}>
        Livraison{" "}
        <Text
          style={{ fontWeight: "800", color: deliveryFeeLabel === "gratuit" ? DS.accentDeep : DS.ink }}
        >
          {feeText(deliveryFeeLabel)}
        </Text>
      </Text>
      <View style={styles.flex} />
      <Text style={styles.metaText}>
        Livré en <Text style={{ color: DS.ink, fontWeight: "900" }}>{DELIVERY_ETA}</Text>
      </Text>
    </View>
  </>
);

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 4 },
  card: { marginRight: 8, overflow: "hidden", backgroundColor: DS.surface },
  top: { position: "absolute", top: 12, left: 12, right: 12, zIndex: 3, flexDirection: "row" },
  pricePill: { backgroundColor: DS.onInk, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  priceText: { color: DS.ink, fontSize: 12, fontWeight: "900" },
  bottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3,
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  stock: { color: DS.onInk, fontSize: 17, fontWeight: "900" },
  stockUnit: { color: DS.onInkMuted, fontSize: 11, fontWeight: "700" },
  segment: { flex: 1, height: 5, borderRadius: 2, backgroundColor: DS.onInkTrack },
  metaTitle: { fontSize: 13, fontWeight: "900", color: DS.ink, flexShrink: 1 },
  metaText: { fontSize: 11, fontWeight: "700", color: DS.text2 },
  metaMuted: { fontSize: 11, fontWeight: "600", color: DS.muted },
});
