"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import { Theme } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { ActivityIndicator } from "@/src/components/CustomActivityIndicator";
import { DS } from "@/src/theme/ds";
import { DraftPrice } from "../recap-designs/MenuDraft.types";
import { styles } from "./AddMenuSheet.styles";
import { DESC_MIN } from "./menuFormConstants";
import { t as tr, useLanguage } from "@/src/i18n";

/**
 * Prix du plat en nombre VARIABLE : un onglet par prix (« Prix 1 * », « Prix 2 »…),
 * « + » pour en ajouter, poubelle pour retirer le prix sélectionné (sauf le 1er).
 * Le prix sélectionné pilote un couple prix + description sur la même ligne.
 * Bouton de fin de ligne : ✓ (vérifie le prix côté serveur) tant que le prix
 * n'est pas validé, puis poubelle (prix 2 et suivants) une fois validé.
 */
interface Props {
  prices: DraftPrice[];
  setPrices: (next: DraftPrice[]) => void;
  selectedIdx: number;
  setSelectedIdx: (idx: number) => void;
  fieldStyle: (field: string) => any[];
  focusProps: (field: string) => { onFocus: () => void; onBlur: () => void };
  clearError: (field: string) => void;
  /** Le prix sélectionné a été vérifié et accepté par le backend. */
  validated: boolean;
  checking: boolean;
  onValidate: () => void;
  /** Prévenu AVANT le retrait d'un prix (décalage des aperçus). */
  onRemove: (idx: number) => void;
}

const placeholders = (): string[][] => [
  ["2000", tr("Ex: 1 Burger + 1 Frites + 1 Boisson")],
  ["3500", tr("Ex: 2 Burgers + 2 Frites + 2 Boissons")],
  ["5000", tr("Ex: Seau de 8 pièces + frites")],
];

export const MenuPricesEditor: React.FC<Props> = ({
  prices,
  setPrices,
  selectedIdx,
  setSelectedIdx,
  fieldStyle,
  focusProps,
  clearError,
  validated,
  checking,
  onValidate,
  onRemove,
}) => {
  useLanguage();
  // Hauteur mesurée de l'input prix → hauteur min de la description (même ligne).
  const [priceColH, setPriceColH] = useState(0);
  const current = prices[selectedIdx] || { price: "", description: "" };
  const [pricePh, descPh] = placeholders()[Math.min(selectedIdx, 2)];

  const update = (patch: Partial<DraftPrice>) => {
    const next = [...prices];
    next[selectedIdx] = { ...current, ...patch };
    setPrices(next);
  };

  const add = () => {
    setPrices([...prices, { price: "", description: "" }]);
    setSelectedIdx(prices.length);
  };

  const remove = () => {
    if (selectedIdx === 0) return;
    onRemove(selectedIdx);
    setPrices(prices.filter((_, i) => i !== selectedIdx));
    setSelectedIdx(selectedIdx - 1);
  };

  return (
    <>
      <View style={[styles.priceHeaderRow, { marginTop: Theme.spacing.lg }]}>
        <Text style={[styles.fieldLabel, { marginBottom: 0 }]}>
          {selectedIdx === 0
            ? tr("Prix 1 (obligatoire)")
            : tr("Prix {{a}} (optionnel)", { a: selectedIdx + 1 })}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={[styles.priceTabs, { marginLeft: "auto" }]}
          keyboardShouldPersistTaps="handled"
        >
          {prices.map((_, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.priceTab, selectedIdx === idx && styles.priceTabActive]}
              onPress={() => setSelectedIdx(idx)}
            >
              <Text
                style={[
                  styles.priceTabText,
                  selectedIdx === idx && styles.priceTabTextActive,
                ]}
              >
                {idx === 0 ? tr("Prix 1 *") : tr("Prix {{a}}", { a: idx + 1 })}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.priceTab} onPress={add}>
            <Ionicons name="add" size={14} color={Theme.colors.gray[600]} />
          </TouchableOpacity>
        </ScrollView>
      </View>

      <View style={styles.priceDescRow}>
        <TextInput
          style={[styles.input, styles.priceCol, ...fieldStyle(`prix${selectedIdx}`)]}
          placeholder={pricePh}
          placeholderTextColor={Theme.colors.gray[300]}
          keyboardType="numeric"
          value={current.price}
          onChangeText={(t) => {
            update({ price: t });
            clearError(`prix${selectedIdx}`);
          }}
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (h && h !== priceColH) setPriceColH(h);
          }}
          {...focusProps(`prix${selectedIdx}`)}
        />
        <TextInput
          style={[
            styles.input,
            styles.descCol,
            // Hauteur FIXE = celle de l'input prix ; le texte long défile dedans.
            { height: priceColH || DESC_MIN },
            ...fieldStyle(`desc${selectedIdx}`),
          ]}
          placeholder={descPh}
          placeholderTextColor={Theme.colors.gray[300]}
          value={current.description}
          onChangeText={(t) => {
            update({ description: t });
            clearError(`desc${selectedIdx}`);
          }}
          multiline
          scrollEnabled
          {...focusProps(`desc${selectedIdx}`)}
        />
        {!validated ? (
          <TouchableOpacity
            style={[styles.itemActionBtn, styles.itemValidateBtn, { height: priceColH || DESC_MIN }]}
            onPress={onValidate}
            disabled={checking || !current.price}
          >
            {checking ? (
              <ActivityIndicator size="small" color={DS.onInk} />
            ) : (
              <Ionicons name="checkmark" size={20} color={DS.onInk} />
            )}
          </TouchableOpacity>
        ) : (
          selectedIdx > 0 && (
            <TouchableOpacity
              style={[styles.itemActionBtn, { height: priceColH || DESC_MIN }]}
              onPress={remove}
            >
              <Ionicons name="trash-outline" size={18} color={Theme.colors.danger} />
            </TouchableOpacity>
          )
        )}
      </View>
    </>
  );
};
