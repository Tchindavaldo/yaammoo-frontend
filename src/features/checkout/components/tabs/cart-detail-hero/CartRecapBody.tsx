import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  formatSizePrice,
  HeroProps,
  SECTION_HEIGHT,
} from "../detail-hero/heroShared";
import { amount, PALETTE } from "../detail-hero/recapTiles";
import { CartBanner, CartHeroImages, CartTile } from "./cartRecapTiles";
import { DS } from "@/src/theme/ds";
import { menuPriceOptions } from "../../../utils/menuPrices";

/**
 * Recap photo du checkout PANIER — copie dediee (R16) de
 * `detail-hero/RecapBody` (home). Photo plein fond ; par-dessus, bandeau
 * (nom + Total), pastilles de taille, puis Menu, Boisson, Extras, Livraison
 * en tuiles (tap = ouvre l'onglet correspondant).
 */
export const CartRecapBody: React.FC<HeroProps> = ({
  menu,
  images,
  priceDescription,
  selectedPriceIndex,
  setSelectedPriceIndex,
  recap,
  width,
}) => {
  const p = PALETTE;
  const totalIndex = recap.length - 1;
  const total = recap[totalIndex];
  const cells = recap.slice(0, totalIndex);
  // Prix en nombre VARIABLE (prices[]) ; un prix unique = « Prix ».
  const sizes = menuPriceOptions(menu);
  const single = sizes.length === 1;

  return (
    <View style={styles.root}>
      <CartHeroImages images={images} width={width} height={SECTION_HEIGHT} />
      <LinearGradient
        colors={["rgba(0,0,0,0.9)", "rgba(0,0,0,0)"]}
        style={styles.topShade}
        pointerEvents="none"
      />

      <CartBanner
        name={menu.titre}
        status={priceDescription || "Disponible"}
        bigNum={amount(total.value)}
        bigLabel="total FCFA"
      />

      <View style={styles.chipsZone}>
        <ScrollView
          horizontal
          style={styles.chipsScroll}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
        {sizes.map(({ index }) => {
          const on = selectedPriceIndex === index;
          const name = single ? "Prix" : `Prix ${index}`;
          return (
            <TouchableOpacity
              key={index}
              activeOpacity={0.85}
              onPress={() => setSelectedPriceIndex(index)}
              style={[styles.chip, { backgroundColor: on ? p.chipOn : p.chip }]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: on ? p.chipTextOn : p.chipText },
                ]}
              >
                {on ? `${name} · ${formatSizePrice(menu, index)}` : name}
              </Text>
            </TouchableOpacity>
          );
        })}
        </ScrollView>
      </View>

      <View style={styles.chipsGap} />
      <View style={styles.tiles}>
        {cells.map((cell) => {
          const free = amount(cell.value) === "Gratuit";
          return (
            <CartTile
              key={cell.title}
              icon={cell.icon}
              count={free ? "0" : amount(cell.value)}
              title={cell.title}
              sub={free ? "Gratuit" : "FCFA"}
              onPress={cell.onPress}
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    height: SECTION_HEIGHT,
    padding: 6,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: DS.slate100,
  },
  chipsGap: { height: 6 },
  topShade: { position: "absolute", left: 0, right: 0, top: 0, height: 80 },
  chipsZone: { flex: 1, justifyContent: "flex-end" },
  chipsScroll: { flexGrow: 0 },
  // alignItems : sinon le ScrollView horizontal étire la pastille sur toute
  // la hauteur de `chipsZone` (flex: 1).
  chipsRow: { flexDirection: "row", gap: 6, alignItems: "flex-end" },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  chipText: { fontSize: 11, fontWeight: "700" },
  tiles: { flexDirection: "row", gap: 6 },
});
