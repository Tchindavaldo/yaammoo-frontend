import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle, Text as SvgText } from "react-native-svg";
import {
  CardVariantProps,
  SCREEN_WIDTH,
  SHOW_BOTTOM_BAR,
  USE_VARIABLE_BACKGROUNDS,
  V5_BACKGROUNDS,
  V5_SHOW_CONTENT,
  V6_BACKGROUND,
  V6_SHOW_CONTENT,
} from "../config";
import { CardBottom, V5BottomBar } from "../parts/CardBottom";
import { sharedStyles as shared } from "../styles/sharedStyles";

const V5_ACCENTS = ["#e8440a", "#6c5ce7", "#00b894", "#fd79a8", "#0984e3", "#e17055"];
const V6_BG = ["#fef4f0", "#f0f4fe", "#f0fef4", "#fef0fa", "#f4f0fe", "#fefaf0"];
const V6_ACCENT = ["#e8440a", "#0984e3", "#00b894", "#e84393", "#6c5ce7", "#e17055"];

/** DESIGN 5 : GLASS SHOWCASE — poster en fond, bande livraison en bas. */
export const CardV5: React.FC<CardVariantProps> = ({
  menu,
  onPress,
  index,
  isLast,
  stock,
  price,
  deliveryTime,
  deliveryFeeLabel,
}) => {
  const accent = USE_VARIABLE_BACKGROUNDS
    ? V5_ACCENTS[index % V5_ACCENTS.length]
    : V5_ACCENTS[0];

  return (
    <TouchableOpacity
      style={[styles.v5Card, isLast && { marginRight: 0 }]}
      onPress={onPress}
      activeOpacity={0.92}
    >
      <LinearGradient
        colors={["#fafafa", "#f0f0f0", "#e8e8e8"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Image
        source={
          menu.image
            ? { uri: menu.image }
            : V5_BACKGROUNDS[index % V5_BACKGROUNDS.length]
        }
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        cachePolicy="memory-disk"
      />

      {/* TEMPORAIRE — contenu masque pour ne voir que l'image de fond.
          Remettre `V5_SHOW_CONTENT` a true (config.ts) pour le retablir. */}
      {V5_SHOW_CONTENT && (
        <>
          <View
            style={[styles.v5DecorCircle, { backgroundColor: accent, opacity: 0.08 }]}
          />
          <View
            style={[styles.v5DecorCircle2, { borderColor: accent, opacity: 0.12 }]}
          />
          <View style={styles.v5TopRow}>
            <View style={styles.v5DeliveryStrip1}>
              <Text style={[shared.v5DeliveryTime, { color: accent }]}>
                {stock} En Stock
              </Text>
            </View>
            <View style={[styles.v5PriceChip, { backgroundColor: accent }]}>
              <Text style={styles.v5PriceText}>{price}</Text>
            </View>
          </View>
          <View style={styles.v5ImgZone}>
            <View style={[styles.v5ImgShadow, { shadowColor: accent }]}>
              <Image
                source={
                  menu.image
                    ? { uri: menu.image }
                    : require("@/assets/images/burger1-nobackground1.webp")
                }
                style={styles.v5ProductImg}
                contentFit="contain"
                cachePolicy="memory-disk"
              />
            </View>
          </View>
          <Text style={styles.v5Title} numberOfLines={1}>
            {menu.titre}
          </Text>
          <View style={styles.v5DeliveryStrip}>
            <View style={[shared.v5DeliveryIcon, { backgroundColor: "#fff" }]}>
              <Ionicons name="flash" size={10} color={accent} />
            </View>
            <View>
              <Text style={shared.v5DeliveryLabel}>Prochaine</Text>
              <Text style={[shared.v5DeliveryTime, { color: accent }]}>
                Livraison {deliveryTime} · {deliveryFeeLabel}
              </Text>
            </View>
          </View>
          <View style={[styles.v5AddBtn, { backgroundColor: accent }]}>
            <Ionicons name="add" size={18} color="white" />
          </View>
        </>
      )}

      {/* Prix en chip en haut */}
      <View style={[shared.v7TopChips, styles.v5TopChips]}>
        <View style={[shared.v7PricePill, { backgroundColor: "#fff" }]}>
          <Text style={shared.v7PriceText}>{price}</Text>
        </View>
      </View>

      {/* Bas v5 d'origine : uniquement la prochaine livraison */}
      {SHOW_BOTTOM_BAR && (
        <V5BottomBar
          accent={accent}
          deliveryTime={deliveryTime}
          deliveryFeeLabel={deliveryFeeLabel}
        />
      )}
    </TouchableOpacity>
  );
};

/** DESIGN 6 : PANORAMIC SPLIT — infos a gauche, image a droite. */
export const CardV6: React.FC<CardVariantProps> = ({
  menu,
  onPress,
  index,
  isLast,
  stock,
  price,
  deliveryTime,
}) => {
  const bg = USE_VARIABLE_BACKGROUNDS ? V6_BG[index % V6_BG.length] : V6_BG[0];
  const accent = USE_VARIABLE_BACKGROUNDS
    ? V6_ACCENT[index % V6_ACCENT.length]
    : V6_ACCENT[0];
  const stockRadius = 14;
  const stockCircumference = 2 * Math.PI * stockRadius;
  const stockProgress = stockCircumference - (stock / 100) * stockCircumference;

  return (
    <TouchableOpacity
      style={[styles.v6Card, { backgroundColor: bg }, isLast && { marginRight: 0 }]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <Image
        source={menu.image ? { uri: menu.image } : V6_BACKGROUND}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        cachePolicy="memory-disk"
      />

      {/* TEMPORAIRE — contenu masque pour ne voir que l'image de fond.
          Remettre `V6_SHOW_CONTENT` a true (config.ts) pour le retablir. */}
      {V6_SHOW_CONTENT && (
        <>
          <View style={[styles.v6Blob, { backgroundColor: accent }]} />
          <View style={[styles.v6Blob2, { backgroundColor: accent }]} />
          <View style={styles.v6Split}>
            <View style={styles.v6Left}>
              <View style={[styles.v6PricePill, { backgroundColor: accent }]}>
                <Text style={styles.v6PriceText}>{price}</Text>
              </View>
              <Text style={styles.v6Title} numberOfLines={2}>
                {menu.titre}
              </Text>
              <View style={styles.v6StockRow}>
                <Svg width={32} height={32}>
                  <Circle
                    cx={16}
                    cy={16}
                    r={stockRadius}
                    stroke="rgba(0,0,0,0.06)"
                    strokeWidth={2}
                    fill="none"
                  />
                  <Circle
                    cx={16}
                    cy={16}
                    r={stockRadius}
                    stroke="#4ade80"
                    strokeWidth={2}
                    fill="none"
                    strokeDasharray={`${stockCircumference}`}
                    strokeDashoffset={stockProgress}
                    strokeLinecap="round"
                    transform="rotate(-90 16 16)"
                  />
                  <SvgText
                    x={16}
                    y={18}
                    textAnchor="middle"
                    fontSize={9}
                    fontWeight="900"
                    fill="#111"
                  >
                    {stock}
                  </SvgText>
                </Svg>
                <Text style={styles.v6StockText}>en stock</Text>
              </View>
              <View style={styles.v6DeliveryBadge}>
                <View style={[styles.v6DeliveryDot, { backgroundColor: accent }]} />
                <View>
                  <Text style={styles.v6DeliveryMeta}>PROCHAINE</Text>
                  <Text style={[styles.v6DeliveryHour, { color: accent }]}>
                    LIVRAISON · {deliveryTime}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.v6Right}>
              <View style={[styles.v6ImgGlow, { shadowColor: accent }]}>
                <Image
                  source={
                    menu.image
                      ? { uri: menu.image }
                      : require("@/assets/images/burger1-nobackground1.webp")
                  }
                  style={styles.v6Img}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                />
              </View>
            </View>
          </View>
          <View style={[styles.v6AddBtn, { backgroundColor: accent }]}>
            <Ionicons name="arrow-forward" size={16} color="white" />
          </View>
        </>
      )}
      {SHOW_BOTTOM_BAR && (
        <CardBottom
          accent={accent}
          deliveryTime={deliveryTime}
          stock={stock}
          stockLabel="plats disponibles"
        />
      )}
      <View
        style={[
          shared.v7PricePill,
          {
            backgroundColor: "#fff",
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: 50,
            elevation: 5,
          },
        ]}
      >
        <Text style={shared.v7PriceText}>{price}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // --- DESIGN 5 ---
  v5Card: {
    width: 200,
    height: 250,
    borderRadius: 16,
    marginRight: 8,
    overflow: "hidden",
    padding: 14,
    paddingVertical: 8,
  },
  // Chips du variant 5 : ecartes aux deux bords, contrairement au variant 7.
  v5TopChips: { justifyContent: "space-between" },
  v5DecorCircle: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  v5DecorCircle2: {
    position: "absolute",
    bottom: -20,
    left: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
  },
  v5TopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 2,
  },
  v5PriceChip: { paddingHorizontal: 2, paddingVertical: 5, borderRadius: 14 },
  v5PriceText: { color: "white", fontSize: 13, fontWeight: "900" },
  v5ImgZone: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    marginVertical: 0,
  },
  v5ImgShadow: {
    width: 120,
    height: 120,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  v5ProductImg: {
    width: "100%",
    height: "100%",
    transform: [{ scale: 1.1 }, { rotate: "-8deg" }],
  },
  v5Title: {
    fontSize: 14,
    fontWeight: "900",
    color: "#111",
    textAlign: "center",
    marginBottom: 14,
    zIndex: 2,
  },
  v5DeliveryStrip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.04)",
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 10,
    zIndex: 2,
  },
  v5DeliveryStrip1: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.04)",
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 10,
    zIndex: 2,
  },
  v5AddBtn: {
    position: "absolute",
    bottom: 11,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },

  // --- DESIGN 6 ---
  v6Card: {
    width: SCREEN_WIDTH * 0.78,
    height: 200,
    borderRadius: 14,
    marginRight: 8,
    overflow: "hidden",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  v6Blob: {
    position: "absolute",
    top: -50,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    opacity: 0.07,
  },
  v6Blob2: {
    position: "absolute",
    bottom: -40,
    left: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    opacity: 0.05,
  },
  v6Split: { flex: 1, flexDirection: "row", gap: 12 },
  v6Left: { flex: 1, justifyContent: "space-between", zIndex: 2 },
  v6PricePill: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  v6PriceText: { color: "white", fontSize: 13, fontWeight: "900" },
  v6Title: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111",
    lineHeight: 20,
    marginTop: 6,
  },
  v6StockRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  v6StockText: {
    fontSize: 9,
    fontWeight: "600",
    color: "hsla(0, 0%, 30%, 1.00)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  v6DeliveryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.04)",
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  v6DeliveryDot: { width: 6, height: 6, borderRadius: 3 },
  v6DeliveryMeta: {
    fontSize: 9,
    fontWeight: "700",
    color: "#000000ff",
    letterSpacing: 0.8,
  },
  v6DeliveryHour: { fontSize: 11, fontWeight: "800" },
  v6Right: { width: 140, alignItems: "center", justifyContent: "center", zIndex: 2 },
  v6ImgGlow: {
    width: 140,
    height: 140,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  v6Img: {
    width: "100%",
    height: "100%",
    transform: [{ scale: 1.25 }, { rotate: "-10deg" }],
  },
  v6AddBtn: {
    position: "absolute",
    bottom: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 6,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
