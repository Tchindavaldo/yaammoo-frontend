import { Menu } from "@/src/types";
import { Image } from "expo-image";
import React from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";

/**
 * Briques communes du bloc image + tailles + recap du checkout HOME
 * (`HeroV1`). La section a une hauteur FIXE (SECTION_HEIGHT) : le footer ne
 * bouge pas.
 */
export const HERO_HEIGHT = 159;
export const HERO_MARGIN_BOTTOM = 8;
/** Hauteur de l'ancienne rangee recap (gridBtn : 10 + 18 + 4 + 16 + 15 + 10). */
export const RECAP_HEIGHT = 73;
/**
 * Hauteur TOTALE de la section (bloc image + tailles + recap). Chaque variante
 * dispose librement de ce cadre ; le footer ne bouge jamais.
 */
export const SECTION_HEIGHT = HERO_HEIGHT + HERO_MARGIN_BOTTOM + RECAP_HEIGHT;
export const ACCENT = "#ec4913";
/** Orange attenue : l'accent plein est trop criard sur cette section. */
export const SOFT_ACCENT = "#d9774f";
export const INK = "#0f172a";
export const MUTED = "#94a3b8";

export const SIZES = [
  { label: "Small", index: 1 },
  { label: "Med", index: 2 },
  { label: "Large", index: 3 },
] as const;

/** Une case du recap (Menu, Boisson, Extras, Livraison, Total). */
export interface RecapCell {
  icon: string;
  iconColor?: string;
  title: string;
  value: string;
  /** Valeur mise en avant (Total, Livraison gratuite). */
  strong?: boolean;
  /** Tap sur la case : ouvre l'onglet correspondant (Boisson, Extras, Livraison). */
  onPress?: () => void;
}

export interface HeroProps {
  menu: Menu;
  /** Les 5 cases du recap, dans l'ordre ; la derniere est le Total. */
  recap: RecapCell[];
  images: string[];
  priceDescription: string;
  selectedPriceIndex: number;
  setSelectedPriceIndex: (index: number) => void;
  /** Largeur mesuree du bloc (toujours > 0 quand la variante est rendue). */
  width: number;
}

/** Prix d'une taille (1, 2, 3), formate comme l'ancien `PriceChip`. */
export const formatSizePrice = (menu: Menu, index: number) => {
  const price = [menu.prix1, menu.prix2, menu.prix3][index - 1];
  return price > 0 ? `${price} F` : "no ref";
};

/**
 * Slider d'images pagine, plein cadre sur `width` x `height`. Remonte l'index
 * de l'image visible pour les points de pagination.
 */
export const HeroImages: React.FC<{
  images: string[];
  width: number;
  height: number;
  onIndexChange: (index: number) => void;
  style?: ViewStyle;
}> = ({ images, width, height, onIndexChange, style }) => {
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    onIndexChange(Math.round(e.nativeEvent.contentOffset.x / width));

  return (
    <FlatList
      data={images}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
      keyExtractor={(_, i) => String(i)}
      renderItem={({ item }) => (
        <Image
          source={item ? { uri: item } : require("@/assets/blur3.jpg")}
          style={{ width, height }}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      )}
      style={style ?? StyleSheet.absoluteFill}
    />
  );
};

/** Points de pagination (masques s'il n'y a qu'une image). */
export const HeroDots: React.FC<{
  count: number;
  active: number;
  style?: ViewStyle;
}> = ({ count, active, style }) => {
  if (count <= 1) return null;
  return (
    <View style={[dotStyles.row, style]} pointerEvents="none">
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[dotStyles.dot, active === i && dotStyles.active]} />
      ))}
    </View>
  );
};

const dotStyles = StyleSheet.create({
  row: { position: "absolute", flexDirection: "row", gap: 4 },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  active: { width: 12, backgroundColor: ACCENT },
});
