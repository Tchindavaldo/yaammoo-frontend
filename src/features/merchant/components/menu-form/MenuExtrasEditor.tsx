import { Theme } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { DraftItem } from "../recap-designs/MenuDraft.types";
import { styles } from "./AddMenuSheet.styles";

/**
 * Extras du plat : ligne label + chips scrollables, puis ligne d'édition
 * (nom, prix, supprimer, valider). Les BOISSONS ne sont plus ici : elles
 * appartiennent à la boutique (`ShopDrinksPage`).
 */
export const MenuExtrasEditor: React.FC<{
  extras: DraftItem[];
  setExtras: (next: DraftItem[]) => void;
}> = ({ extras, setExtras }) => {
  // editIdx = null => on crée un nouvel item ; sinon on édite l'item validé à cet index.
  const [draft, setDraft] = useState({ name: "", prix: "" });
  const [editIdx, setEditIdx] = useState<number | null>(null);

  return (
    <>
      {/* Section Extras, même design que les prix :
        ligne label + chips scrollables horizontalement, puis ligne d'édition
        (input nom, input prix, boutons Supprimer / Valider). */}
      {(
        [
          {
            key: "extras",
            label: "Extras",
            list: extras,
            setList: setExtras,
            draft,
            setDraft,
            editIdx,
            setEditIdx,
          },
        ] as const
      ).map((sec) => {
        const items = sec.list.filter((i) => i.name.trim());
        // Annule l'édition / vide le draft.
        const resetDraft = () => {
          sec.setDraft({ name: "", prix: "" });
          sec.setEditIdx(null);
        };
        // Valide le draft : crée un nouvel item ou met à jour celui en édition.
        const validate = () => {
          if (!sec.draft.name.trim()) return;
          const item: DraftItem = {
            name: sec.draft.name.trim(),
            prix: sec.draft.prix.trim() || "0",
            quantite: "1",
            status: true,
          };
          if (sec.editIdx === null) {
            sec.setList([...sec.list, item]);
          } else {
            const next = [...sec.list];
            next[sec.editIdx] = { ...next[sec.editIdx], ...item };
            sec.setList(next);
          }
          resetDraft();
        };
        return (
          <View
            key={sec.key}
          >
            {/* Ligne label + chips scrollables (pas de retour à la ligne) */}
            <View
              style={[
                styles.priceHeaderRow,
                { marginBottom: Theme.spacing.sm },
              ]}
            >
              <Text style={[styles.fieldLabel, { marginBottom: 0 }]}>
                {sec.label}
              </Text>
              {items.length > 0 && (
                <Text style={styles.itemCountText}>
                  ×{items.length}
                </Text>
              )}
              {items.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.chipScroll}
                  contentContainerStyle={styles.chipScrollContent}
                  keyboardShouldPersistTaps="handled"
                >
                  {items.map((it, i) => {
                    const realIdx = sec.list.indexOf(it);
                    return (
                      <React.Fragment key={realIdx}>
                        {i > 0 && (
                          <Text style={styles.chipSeparator}>·</Text>
                        )}
                        <TouchableOpacity
                          style={styles.itemChip}
                          onPress={() => {
                            sec.setDraft({
                              name: it.name,
                              prix: it.prix,
                            });
                            sec.setEditIdx(realIdx);
                          }}
                        >
                          <Text
                            style={[
                              styles.itemChipText,
                              sec.editIdx === realIdx &&
                                styles.itemChipTextActive,
                            ]}
                            numberOfLines={1}
                          >
                            {it.name}
                          </Text>
                        </TouchableOpacity>
                      </React.Fragment>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {/* Ligne d'édition : nom, prix, supprimer, valider */}
            <View style={styles.priceDescRow}>
              <TextInput
                style={[
                  styles.input,
                  styles.itemInputCompact,
                  styles.descCol,
                ]}
                placeholder="Nom de l'extra"
                value={sec.draft.name}
                onChangeText={(t) =>
                  sec.setDraft({ ...sec.draft, name: t })
                }
              />
              <TextInput
                style={[
                  styles.input,
                  styles.itemInputCompact,
                  styles.priceCol,
                ]}
                placeholder="Prix"
                keyboardType="numeric"
                value={sec.draft.prix}
                onChangeText={(t) =>
                  sec.setDraft({ ...sec.draft, prix: t })
                }
              />
              {/* Supprimer : retire l'item en édition (sinon vide juste le draft) */}
              <TouchableOpacity
                style={styles.itemActionBtn}
                onPress={() => {
                  if (sec.editIdx !== null) {
                    sec.setList(
                      sec.list.filter((_, i) => i !== sec.editIdx),
                    );
                  }
                  resetDraft();
                }}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={Theme.colors.danger}
                />
              </TouchableOpacity>
              {/* Valider : ajoute / met à jour */}
              <TouchableOpacity
                style={[styles.itemActionBtn, styles.itemValidateBtn]}
                onPress={validate}
              >
                <Ionicons name="checkmark" size={18} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </>
  );
};
