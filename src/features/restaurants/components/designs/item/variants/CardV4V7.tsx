import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  CARD_BOTTOM_STYLE,
  CardVariantProps,
  SHOW_BOTTOM_BAR,
  USE_VARIABLE_BACKGROUNDS,
  V4_BACKGROUNDS,
  V4_SHOW_CONTENT,
} from "../config";
import { CardBottom, DarkBottomShade } from "../parts/CardBottom";
import { sharedStyles as shared } from "../styles/sharedStyles";

const IS_ANDROID = Platform.OS === "android";

const V4_COLORS = [
  "#fdeded",
  "#f5f0ee",
  "#e8f4f8",
  "#f2e8f8",
  "#f8f2e8",
  "#e8f8f2",
  "#f8e8e8",
  "#fdf2e9",
  "#fdeded",
  "#ebf5eb",
];
const V4_ACCENTS = [
  "#e8440a",
  "#6c5ce7",
  "#00b894",
  "#fd79a8",
  "#0984e3",
  "#e17055",
  "#fdcb6e",
  "#00cec9",
];

/** DESIGN 4 : PIZZA SPECIALS (Ex-D5) — image de fond plein cadre. */
export const CardV4: React.FC<CardVariantProps> = ({
  menu,
  onPress,
  index,
  isLast,
  stock,
  price,
  deliveryTime,
}) => {
  const bgColor = USE_VARIABLE_BACKGROUNDS
    ? V4_COLORS[index % V4_COLORS.length]
    : V4_COLORS[0];
  const accentColor = USE_VARIABLE_BACKGROUNDS
    ? V4_ACCENTS[index % V4_ACCENTS.length]
    : V4_ACCENTS[0];
  const accent = "#e8440a";

  return (
    <TouchableOpacity
      style={[
        styles.v4Card,
        { backgroundColor: bgColor },
        isLast && { marginRight: 0 },
      ]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <Image
        source={
          menu.image
            ? { uri: menu.image }
            : V4_BACKGROUNDS[index % V4_BACKGROUNDS.length]
        }
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        cachePolicy="memory-disk"
      />

      {/* TEMPORAIRE — contenu masque pour ne voir que l'image de fond.
          Remettre `V4_SHOW_CONTENT` a true (config.ts) pour le retablir. */}
      {V4_SHOW_CONTENT && (
        <>
          <View style={[styles.v4Blob, { backgroundColor: accentColor }]} />
          <View style={[styles.v4Blob2, { backgroundColor: accentColor }]} />
          <View style={[styles.v4ImgWrap, { shadowColor: accentColor }]}>
            <Image
              source={
                menu.image
                  ? { uri: menu.image }
                  : require("@/assets/images/purre-avocat-tomate-legume.png")
              }
              style={styles.v4Image}
              cachePolicy="memory-disk"
            />
          </View>
          <View style={styles.v4TopSection}>
            <Text style={styles.v4TitleNew} numberOfLines={2}>
              {menu.titre}
            </Text>
            <View style={styles.v4PriceBadgeNew}>
              <Text style={styles.v4PriceNew}>{price}</Text>
            </View>
          </View>
        </>
      )}

      {/* ANDROID : ombre interne noire en bas, barre sans fond blanc. */}
      {IS_ANDROID && <DarkBottomShade />}
      {SHOW_BOTTOM_BAR && (
        <CardBottom
          accent={accent}
          deliveryTime={deliveryTime}
          stock={stock}
          dark={IS_ANDROID}
        />
      )}
      <View
        style={[
          shared.v7PricePill,
          {
            backgroundColor: "#fff",
            position: "absolute",
            top: 14,
            left: 14,
            zIndex: 50,
            elevation: 5,
          },
          IS_ANDROID && shared.darkPricePill,
        ]}
      >
        <Text style={[shared.v7PriceText, IS_ANDROID && shared.darkPriceText]}>
          {price}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

/** DESIGN 7 : IMMERSIVE MINI — image plein fond + degrade. */
export const CardV7: React.FC<CardVariantProps> = ({
  menu,
  onPress,
  isLast,
  stock,
  price,
  deliveryTime,
  deliveryFeeLabel,
}) => (
  <TouchableOpacity
    style={[styles.v7Card, isLast && { marginRight: 0 }]}
    onPress={onPress}
    activeOpacity={0.9}
  >
    <Image
      source={
        menu.image
          ? { uri: menu.image }
          : require("@/assets/images/burger1-nobackground1.webp")
      }
      style={styles.v7BgImg}
      contentFit="cover"
      cachePolicy="memory-disk"
    />

    {/* Triple gradient : haut clair → transparent → bas ultra sombre.
        Retire en mode blur (fond clair, textes sombres). */}
    {CARD_BOTTOM_STYLE !== "blur" && (
      <LinearGradient
        colors={[
          "rgba(0, 0, 0, 0.6)",
          "rgba(255,255,255,0)",
          "rgba(0,0,0,0)",
          "rgba(0,0,0,0.5)",
          "rgba(0,0,0,0.95)",
        ]}
        locations={[0, 0.15, 0.35, 0.6, 1]}
        style={StyleSheet.absoluteFill}
      />
    )}

    <View style={shared.v7TopChips}>
      <View style={[shared.v7PricePill, { backgroundColor: "#fff" }]}>
        <Text style={shared.v7PriceText}>{price}</Text>
      </View>
    </View>

    {/* Zone basse commune (flag CARD_BOTTOM_STYLE, fond deja porte) */}
    <CardBottom
      accent="#e8440a"
      deliveryTime={deliveryTime}
      stock={stock}
      withBackground={false}
      deliveryFeeLabel={deliveryFeeLabel}
    />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  // --- DESIGN 4 ---
  v4Card: {
    width: 240,
    height: 240,
    borderRadius: 16,
    marginRight: 8,
    overflow: "hidden",
  },
  v4Blob: {
    position: "absolute",
    top: -50,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    opacity: 0.07,
  },
  v4Blob2: {
    position: "absolute",
    bottom: -40,
    left: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    opacity: 0.05,
  },
  v4TopSection: {
    padding: 14,
    paddingBottom: 10,
    zIndex: 3,
    position: "relative",
  },
  v4TitleNew: {
    fontSize: 20,
    fontWeight: "900",
    color: "#1a1a1a",
    lineHeight: 23,
    marginBottom: 10,
  },
  v4PriceBadgeNew: {
    alignSelf: "flex-start",
    borderRadius: 14,
    paddingHorizontal: 0,
    paddingVertical: 5,
    overflow: "hidden",
  },
  v4PriceNew: {
    color: "#e8440a",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0,
  },
  v4ImgWrap: {
    position: "absolute",
    bottom: -20,
    right: -40,
    width: 220,
    height: 220,
    zIndex: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  v4Image: { width: "110%", height: "110%", borderRadius: 110 },

  // --- DESIGN 7 ---
  v7Card: {
    width: 150,
    height: 190,
    borderRadius: 12,
    marginRight: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  v7BgImg: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
});
