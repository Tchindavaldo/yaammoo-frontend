import { Ionicons } from "@expo/vector-icons";
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
  CardVariantProps,
  SHOW_BOTTOM_BAR,
  USE_VARIABLE_BACKGROUNDS,
  V5_BACKGROUNDS,
  V5_SHOW_CONTENT,
} from "../config";
import { DarkBottomShade, V5BottomBar } from "../parts/CardBottom";
import { sharedStyles as shared } from "../styles/sharedStyles";

const IS_ANDROID = Platform.OS === "android";

const V5_ACCENTS = ["#e8440a", "#6c5ce7", "#00b894", "#fd79a8", "#0984e3", "#e17055"];

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

      {/* Bas v5 d'origine : uniquement la prochaine livraison.
          ANDROID : ombre interne noire en bas, barre sans fond blanc. */}
      {IS_ANDROID && <DarkBottomShade />}
      {SHOW_BOTTOM_BAR && (
        <V5BottomBar
          accent={accent}
          deliveryTime={deliveryTime}
          deliveryFeeLabel={deliveryFeeLabel}
          dark={IS_ANDROID}
        />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
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
});
