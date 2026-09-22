import { AppBlurView as BlurView } from "@/src/components/AppBlurView";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { CardVariantProps, SHOW_BOTTOM_BAR } from "../config";
import { CardBottom } from "../parts/CardBottom";
import { sharedStyles as shared } from "../styles/sharedStyles";

/** Chip prix blanc en haut-gauche, positionne en absolu. */
const cornerPrice = (top: number, left: number) => [
  shared.v7PricePill,
  {
    backgroundColor: "#fff",
    position: "absolute" as const,
    top,
    left,
    zIndex: 50,
    elevation: 5,
  },
];

/** DESIGN 1 : SPECIAL OFFERS (Ex-D3). */
export const CardV1: React.FC<CardVariantProps> = ({
  menu,
  onPress,
  isLast,
  stock,
  price,
  deliveryTime,
}) => (
  <TouchableOpacity
    style={[styles.v1Card, isLast && { marginRight: 0 }]}
    onPress={onPress}
    activeOpacity={0.9}
  >
    <Image
      source={require("@/assets/images/purre-avocat-tomate-legume-flouter.png")}
      style={[StyleSheet.absoluteFill, { transform: [{ scale: 1.5 }] }]}
      contentFit="cover"
    />
    <BlurView
      disableAndroidBlur
      intensity={40}
      tint="light"
      style={StyleSheet.absoluteFill}
      fallbackStyle={shared.blurFallbackLight}
    />

    <View style={styles.v1Header}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <View style={[shared.v7PricePill, { backgroundColor: "#fff" }]}>
          <Text style={shared.v7PriceText}>{price}</Text>
        </View>
        <BlurView
          disableAndroidBlur
          intensity={60}
          tint="dark"
          style={styles.v1LabelBlur}
          fallbackStyle={shared.blurFallbackDark}
        >
          <Text style={styles.v1Label}>{menu.titre}</Text>
        </BlurView>
      </View>
      <BlurView
        disableAndroidBlur
        intensity={60}
        tint="dark"
        style={styles.v1Heart}
        fallbackStyle={shared.blurFallbackDark}
      >
        <Ionicons name="heart" size={16} color="#e8440a" />
      </BlurView>
    </View>

    <View style={styles.v1ImgWrapper}>
      <Image
        source={
          menu.image
            ? { uri: menu.image }
            : require("@/assets/images/burger1-nobackground1.webp")
        }
        style={styles.v1Image}
        contentFit="contain"
        cachePolicy="memory-disk"
      />
      <BlurView
        disableAndroidBlur
        intensity={60}
        tint="dark"
        style={styles.v1BadgeTime}
        fallbackStyle={shared.blurFallbackDark}
      >
        <Ionicons name="time-outline" size={12} color="white" />
      </BlurView>
      <BlurView
        disableAndroidBlur
        intensity={60}
        tint="dark"
        style={styles.v1BadgeCal}
        fallbackStyle={shared.blurFallbackDark}
      >
        <Text style={styles.v1BadgeTextDetail}>350 cal</Text>
      </BlurView>
    </View>

    {SHOW_BOTTOM_BAR && (
      <CardBottom accent="#e8440a" deliveryTime={deliveryTime} stock={stock} />
    )}
  </TouchableOpacity>
);

/** DESIGN 2 : RICE & SALAD (Ex-D4). */
export const CardV2: React.FC<CardVariantProps> = ({
  menu,
  onPress,
  isLast,
  stock,
  price,
  deliveryTime,
}) => (
  <TouchableOpacity
    style={[styles.v2Card, isLast && { marginRight: 0 }]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <View style={cornerPrice(4, 6)}>
      <Text style={shared.v7PriceText}>{price}</Text>
    </View>
    {/* Badge dispo en haut-droite (prix en haut-gauche) */}
    <View style={styles.v2DispoBadge}>
      <View style={styles.v2DispoPulse} />
      <Text style={styles.v2DispoText}>
        <Text style={{ color: "#4faa71ff", fontWeight: "900" }}>{stock}</Text>
        <Text style={{ color: "#666" }}> En Stock</Text>
      </Text>
    </View>
    <View style={styles.v2ImgWrap}>
      <Image
        source={
          menu.image
            ? { uri: menu.image }
            : require("@/assets/images/riz-spaghettis-oeuf-poulet-pane-fritz-platain-noBG.png")
        }
        style={styles.v2Image}
        cachePolicy="memory-disk"
      />
    </View>
    <View style={styles.v2Content}>
      <View style={styles.v2TitleRow}>
        <Text style={styles.v2Name} numberOfLines={1}>
          {menu.titre}
        </Text>
      </View>
    </View>
    {SHOW_BOTTOM_BAR && (
      <CardBottom accent="#e8440a" deliveryTime={deliveryTime} stock={stock} />
    )}
  </TouchableOpacity>
);

/** DESIGN 3 : COMPACT GEM. */
export const CardV3: React.FC<CardVariantProps> = ({
  menu,
  onPress,
  isLast,
  stock,
  price,
  deliveryTime,
}) => (
  <TouchableOpacity
    style={[styles.v3Card, isLast && { marginRight: 0 }]}
    onPress={onPress}
    activeOpacity={0.88}
  >
    <View style={cornerPrice(6, 6)}>
      <Text style={shared.v7PriceText}>{price}</Text>
    </View>
    <LinearGradient
      colors={["#fff1ec", "#ffe0d4"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
    />
    <View style={styles.v3StockTextRow}>
      <View style={styles.v3StockDot} />
      <Text style={styles.v3StockTxt}>{stock} en stock</Text>
    </View>
    <View style={styles.v3HeroZone}>
      <Image
        source={
          menu.image
            ? { uri: menu.image }
            : require("@/assets/images/burger1-nobackground.webp")
        }
        style={styles.v3Image}
        contentFit="contain"
        cachePolicy="memory-disk"
      />
    </View>
    <Text style={styles.v3Title} numberOfLines={2}>
      {menu.titre}
    </Text>
    {SHOW_BOTTOM_BAR && (
      <CardBottom accent="#e8440a" deliveryTime={deliveryTime} stock={stock} />
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  // --- DESIGN 1 ---
  v1Card: {
    width: 260,
    height: 280,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginRight: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  v1Header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    zIndex: 30,
  },
  v1Heart: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  v1LabelBlur: {
    borderRadius: 12,
    overflow: "hidden",
    alignSelf: "flex-start",
    marginRight: 10,
  },
  v1Label: {
    color: "white",
    fontSize: 13,
    fontWeight: "500",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  v1ImgWrapper: { flex: 1, marginTop: 0, alignItems: "center" },
  v1Image: {
    width: "100%",
    height: "100%",
    transform: [{ scale: 1.6 }, { rotate: "-10deg" }],
  },
  v1BadgeTime: {
    backgroundColor: "#fff",
    position: "absolute",
    top: 50,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    overflow: "hidden",
  },
  v1BadgeCal: {
    position: "absolute",
    top: 110,
    left: 0,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: "hidden",
  },
  v1BadgeTextDetail: { color: "white", fontSize: 11, fontWeight: "500" },

  // --- DESIGN 2 ---
  v2Card: {
    width: 220,
    backgroundColor: "white",
    borderRadius: 14,
    padding: 14,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#efefef",
    overflow: "hidden",
  },
  v2ImgWrap: {
    width: "100%",
    height: 140,
    borderRadius: 16,
    overflow: "hidden",
  },
  v2Image: { width: 130, height: 130, marginLeft: -3 },
  v2Name: { fontSize: 14, fontWeight: "800", color: "#111", marginTop: 10 },
  v2DispoBadge: {
    zIndex: 10,
    position: "absolute",
    top: 4,
    right: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  v2DispoPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4ade80",
    shadowColor: "#4ade80",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  v2DispoText: { fontSize: 11, fontWeight: "700" },
  v2Content: { marginTop: 10 },
  v2TitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  // --- DESIGN 3 ---
  v3Card: {
    width: 130,
    borderRadius: 12,
    marginRight: 8,
    overflow: "hidden",
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 5,
  },
  v3HeroZone: {
    width: "100%",
    height: 120,
    borderRadius: 20,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  v3Image: {
    width: 90,
    height: 90,
    transform: [{ scale: 1.2 }, { rotate: "-6deg" }],
  },
  v3Title: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111",
    textAlign: "center",
    lineHeight: 15,
    paddingHorizontal: 6,
    marginTop: 8,
  },
  v3StockTextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    justifyContent: "center",
    marginTop: 4,
  },
  v3StockDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#4ade80",
    shadowColor: "#4ade80",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  v3StockTxt: { fontSize: 9, fontWeight: "700", color: "#157237ff" },
});
