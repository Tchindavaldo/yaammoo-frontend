import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  formatSizePrice,
  HeroImages,
  HeroProps,
  SECTION_HEIGHT,
  SIZES,
} from "./heroShared";
import { amount, Banner, PALETTE, Tile } from "./recapTiles";

/**
 * Design « recap photo » : la photo remplit toute la section ; par-dessus,
 * bandeau (nom + Total), pastilles de taille, puis Menu, Boisson, Extras,
 * Livraison en tuiles (tap = ouvre l'onglet correspondant).
 */
export const RecapBody: React.FC<HeroProps> = ({
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
  // Seules les tailles definies (prix > 0) ; un prix unique = « Prix ».
  const prices = [menu.prix1, menu.prix2, menu.prix3];
  const sizes = SIZES.filter(({ index }) => prices[index - 1] > 0);
  const single = sizes.length === 1;

  return (
    <View style={styles.root}>
      <HeroImages
        images={images}
        width={width}
        height={SECTION_HEIGHT}
        onIndexChange={() => {}}
      />
      {/* Photo nette : seule une legere ombre en haut, pour le texte du bandeau. */}
      <LinearGradient
        colors={["rgba(0,0,0,0.9)", "rgba(0,0,0,0)"]}
        style={styles.topShade}
        pointerEvents="none"
      />

      <Banner
        name={menu.titre}
        status={priceDescription || "Disponible"}
        bigNum={amount(total.value)}
        bigLabel="total FCFA"
      />

      <View style={styles.chipsZone}>
        {sizes.map(({ label, index }) => {
          const on = selectedPriceIndex === index;
          const name = single ? "Prix" : `Prix ${index}`;
          return (
            <TouchableOpacity
              key={label}
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
      </View>

      <View style={styles.chipsGap} />
      <View style={styles.tiles}>
        {cells.map((cell) => {
          const free = amount(cell.value) === "Gratuit";
          return (
            <Tile
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
    backgroundColor: "#f1f5f9",
  },
  chipsGap: { height: 6 },
  topShade: { position: "absolute", left: 0, right: 0, top: 0, height: 80 },
  chipsZone: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  chipText: { fontSize: 11, fontWeight: "700" },
  tiles: { flexDirection: "row", gap: 6 },
});
