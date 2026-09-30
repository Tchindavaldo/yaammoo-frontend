import { DS } from "@/src/theme/ds";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { CardVariantProps, SKELETON_SIZES, V5_BACKGROUNDS } from "../config";
import { DELIVERY_ETA, feeText, isStockLow, stockLabel, stockRatio } from "./labels";

/**
 * Design 5 aere (HOME_DESIGN = "aere") : photo plein cadre, prix en haut,
 * barre blanche flottante (stock + jauge) en bas ; titre + note, puis
 * livraison (frais + delai groupes) sous la carte (`V5AereMeta`).
 */
const SIZE = SKELETON_SIZES[5];

export const CardV5Aere: React.FC<CardVariantProps> = ({
  menu,
  onPress,
  index,
  isLast,
  stock,
  price,
}) => {
  const source = menu.image ? { uri: menu.image } : V5_BACKGROUNDS[index % V5_BACKGROUNDS.length];
  const low = isStockLow(stock);
  return (
    <TouchableOpacity
      style={[
        styles.card,
        { width: SIZE.width, height: SIZE.height, borderRadius: SIZE.radius },
        isLast && { marginRight: 0 },
      ]}
      onPress={onPress}
      activeOpacity={0.92}
    >
      <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
      <View style={styles.top}>
        <View style={styles.pricePill}>
          <Text style={styles.priceText}>{price}</Text>
        </View>
      </View>
      <View style={styles.floatBar}>
        <Text style={[styles.floatStock, low && { color: DS.dangerInk }]} numberOfLines={1}>
          {stockLabel(stock)}
        </Text>
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              // Rouge fonce : le rouge vif se confondait avec l'orange de marque.
              { width: `${stockRatio(stock) * 100}%`, backgroundColor: low ? DS.dangerInk : DS.ink },
            ]}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

/** Lignes sous la carte : titre + note/avis, puis livraison (frais + delai). */
export const V5AereMeta: React.FC<{
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
    <Text style={styles.metaText} numberOfLines={1}>
      Livraison{" "}
      <Text
        style={{ fontWeight: "800", color: deliveryFeeLabel === "gratuit" ? DS.accentDeep : DS.ink }}
      >
        {feeText(deliveryFeeLabel)}
      </Text>
      {" · Livré en "}
      <Text style={{ fontWeight: "900", color: DS.ink }}>{DELIVERY_ETA}</Text>
    </Text>
  </>
);

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 4 },
  card: { marginRight: 8, overflow: "hidden", backgroundColor: DS.surface },
  top: { position: "absolute", top: 12, left: 12, right: 12, zIndex: 3, flexDirection: "row" },
  pricePill: { backgroundColor: DS.onInk, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  priceText: { color: DS.ink, fontSize: 12, fontWeight: "900" },
  floatBar: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 10,
    zIndex: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: DS.bg,
    shadowColor: DS.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  floatStock: { fontSize: 12, fontWeight: "900", color: DS.ink },
  track: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden", backgroundColor: DS.line },
  fill: { height: 4, borderRadius: 2 },
  metaTitle: { fontSize: 13, fontWeight: "900", color: DS.ink, flexShrink: 1 },
  metaText: { fontSize: 11, fontWeight: "700", color: DS.text2 },
  metaMuted: { fontSize: 11, fontWeight: "600", color: DS.muted },
});
