"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import { Theme } from "@/src/theme";
import React from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { styles } from "./AddMenuSheet.styles";
import { t as tr, useLanguage } from "@/src/i18n";

/** Suggestions de catégorie : un tap remplit le champ, sinon saisie libre. */
const SUGGESTIONS = ["Poulet", "Burger", "Pizza"];

interface Props {
  nom: string;
  onNomChange: (v: string) => void;
  category: string;
  onCategoryChange: (v: string) => void;
  fieldStyle: (field: string) => any[];
  focusProps: (field: string) => { onFocus: () => void; onBlur: () => void };
}

/**
 * Étape 1 (maquette D1, canvas « Catégorie ») : nom du menu et catégorie,
 * chacun sur toute la ligne, puis les suggestions de catégorie. Les photos
 * suivent dans la même étape (rendues par le parent).
 */
export const MenuNameCategoryStep: React.FC<Props> = ({
  nom,
  onNomChange,
  category,
  onCategoryChange,
  fieldStyle,
  focusProps,
}) => {
  useLanguage();
  return (
    <View>
      <Text style={styles.fieldLabel}>{tr("Nom du menu")}</Text>
      <TextInput
        style={[styles.input, styles.inputCompact, ...fieldStyle("nom")]}
        placeholder={tr("Ex: Burger Spécial Maison")}
        placeholderTextColor={Theme.colors.gray[300]}
        value={nom}
        onChangeText={onNomChange}
        {...focusProps("nom")}
      />

      <Text style={[styles.fieldLabel, { marginTop: Theme.spacing.lg }]}>{tr("Catégorie")}</Text>
      <TextInput
        style={[styles.input, styles.inputCompact, ...fieldStyle("category")]}
        placeholder={tr("Ex: Poulet")}
        placeholderTextColor={Theme.colors.gray[300]}
        value={category}
        onChangeText={onCategoryChange}
        {...focusProps("category")}
      />
      <View style={styles.catChips}>
        {SUGGESTIONS.map((s) => {
          const active = category.trim().toLowerCase() === s.toLowerCase();
          return (
            <TouchableOpacity
              key={s}
              style={[styles.catChip, active && styles.catChipActive]}
              onPress={() => onCategoryChange(s)}
            >
              <Text style={[styles.catChipText, active && styles.catChipTextActive]}>{tr(s)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};
