import { DS } from "@/src/theme/ds";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { CardVariantProps, SKELETON_SIZES } from "../config";
import { DELIVERY_ETA, feeText, isStockLow, stockParts, stockRatio } from "./labels";

/**
 * Design 7 aere (HOME_DESIGN = "aere") : petite carte sous degrade sombre,
 * prix en haut, stock + jauge en bas ; titre + note, puis livraison sous la
 * carte (`V7AereMeta`).
 */
const FALLBACK = require("@/assets/images/burger1-nobackground1.webp");
const SIZE = SKELETON_SIZES[7];

export const CardV7Aere: React.FC<CardVariantProps> = ({ menu, onPress, isLast, stock, price }) => {
  const { value, unit } = stockParts(stock);
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
      <Image
        source={menu.image ? { uri: menu.image } : FALLBACK}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
      <LinearGradient
        pointerEvents="none"
        colors={[DS.scrimTop, DS.scrimNone, DS.scrimNone, DS.scrimMid, DS.scrimEnd]}
        locations={[0, 0.22, 0.45, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.top}>
        <View style={styles.pricePill}>
          <Text style={styles.priceText}>{price}</Text>
        </View>
      </View>
      <View style={styles.bottom}>
        <Text style={styles.stock} numberOfLines={1}>
          {value} <Text style={styles.stockUnit}>{unit}</Text>
        </Text>
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              // Rouge vif sur fond sombre (le rouge fonce y disparaitrait).
              { width: `${stockRatio(stock) * 100}%`, backgroundColor: isStockLow(stock) ? DS.danger : DS.onInk },
            ]}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

/** Lignes sous la carte (etroite) : titre + note et avis en court, puis livraison. */
export const V7AereMeta: React.FC<{
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
      <Ionicons name="star" size={11} color={DS.star} />
      <Text style={[styles.metaText, { color: DS.ink }]}>{rating}</Text>
      <Text style={styles.metaMuted}>({votes})</Text>
    </View>
    <Text style={styles.metaText} numberOfLines={1}>
      Livraison{" "}
      <Text
        style={{ fontWeight: "800", color: deliveryFeeLabel === "gratuit" ? DS.accentDeep : DS.ink }}
      >
        {feeText(deliveryFeeLabel)}
      </Text>
      {" · "}
      <Text style={{ fontWeight: "900", color: DS.ink }}>{DELIVERY_ETA}</Text>
    </Text>
  </>
);

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 4 },
  card: {
    marginRight: 8,
    overflow: "hidden",
    backgroundColor: DS.ink,
    shadowColor: DS.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  top: { position: "absolute", top: 8, left: 8, right: 8, zIndex: 3, flexDirection: "row" },
  pricePill: { backgroundColor: DS.onInk, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  priceText: { color: DS.ink, fontSize: 12, fontWeight: "900" },
  bottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3,
    gap: 6,
    paddingHorizontal: 10,
    paddingBottom: 12,
  },
  stock: { color: DS.onInk, fontSize: 12, fontWeight: "900" },
  stockUnit: { color: DS.onInkMuted, fontSize: 10, fontWeight: "700" },
  track: { height: 4, borderRadius: 2, overflow: "hidden", backgroundColor: DS.onInkTrack },
  fill: { height: 4, borderRadius: 2 },
  metaTitle: { fontSize: 13, fontWeight: "900", color: DS.ink, flexShrink: 1 },
  metaText: { fontSize: 11, fontWeight: "700", color: DS.text2 },
  metaMuted: { fontSize: 11, fontWeight: "600", color: DS.muted },
});
