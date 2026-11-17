"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import { Image } from "expo-image";
import React, { memo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DS } from "@/src/theme/ds";
import { t } from "@/src/i18n";
import { SearchRow } from "../hooks/useShopSearch";

/** Hauteur FIXE : `getItemLayout` de la liste en dépend (aucune mesure au scroll). */
export const SEARCH_ROW_HEIGHT = 84;

interface Props {
  row: SearchRow;
  onPress: (row: SearchRow) => void;
}

/** Gabarit UNIQUE des résultats : vignette, plat, boutique, prix. */
export const SearchResultRow = memo(({ row, onPress }: Props) => (
  <TouchableOpacity
    style={styles.row}
    activeOpacity={0.7}
    disabled={!row.available}
    onPress={() => onPress(row)}
  >
    {row.image ? (
      <Image source={{ uri: row.image }} style={styles.thumb} contentFit="cover" recyclingKey={row.key} />
    ) : (
      <View style={[styles.thumb, styles.thumbEmpty]}>
        <Ionicons name="restaurant-outline" size={22} color={DS.faint} />
      </View>
    )}
    <View style={styles.body}>
      <Text style={styles.title} numberOfLines={1}>{row.title}</Text>
      <View style={styles.shopLine}>
        <Ionicons name="storefront-outline" size={13} color={DS.text2} />
        <Text style={styles.shop} numberOfLines={1}>{row.shopName}</Text>
      </View>
      <Text style={[styles.price, !row.available && styles.off]} numberOfLines={1}>
        {row.available ? `${row.price} F` : t("Indisponible")}
      </Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color={DS.idle} />
  </TouchableOpacity>
));

const styles = StyleSheet.create({
  row: {
    height: SEARCH_ROW_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DS.line,
    backgroundColor: DS.bg,
  },
  thumb: { width: 60, height: 60, borderRadius: 12, backgroundColor: DS.surface },
  thumbEmpty: { alignItems: "center", justifyContent: "center" },
  body: { flex: 1, gap: 2 },
  title: { fontSize: 14.5, fontWeight: "700", color: DS.ink },
  shopLine: { flexDirection: "row", alignItems: "center", gap: 4 },
  shop: { flexShrink: 1, fontSize: 12.5, fontWeight: "600", color: DS.text2 },
  price: { fontSize: 13, fontWeight: "700", color: DS.accent },
  off: { color: DS.faint },
});
