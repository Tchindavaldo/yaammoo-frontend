"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import { Theme } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Availability } from "../recap-designs/MenuDraft.types";
import { styles } from "./AddMenuSheet.styles";
import { t, useLanguage } from "@/src/i18n";

/** Disponibilité du plat (Disponible / Indisponible) + stock (chiffres + stepper). */
export const MenuStockAvailability: React.FC<{
  availability: Availability;
  setAvailability: (v: Availability) => void;
  stock: string;
  setStock: (v: string) => void;
}> = ({ availability, setAvailability, stock, setStock }) => {
  useLanguage();
  return (
  <>
      {/* Ligne 1 : disponibilité (Disponible / Indisponible côte à côte) */}
      <Text
        style={[styles.fieldLabel, { marginTop: Theme.spacing.lg }]}
      >
        {t("Disponibilité")}
      </Text>
      <View style={styles.availRow}>
        {(
          [
            {
              key: "available",
              label: t("Disponible"),
              color: Theme.colors.success,
            },
            {
              key: "unavailable",
              label: t("Indisponible"),
              color: Theme.colors.danger,
            },
          ] as const
        ).map((s) => {
          const active = availability === s.key;
          return (
            <TouchableOpacity
              key={s.key}
              style={[
                styles.availBtn,
                active && {
                  backgroundColor: s.color,
                  borderColor: s.color,
                },
              ]}
              onPress={() => setAvailability(s.key)}
            >
              <Text
                style={[
                  styles.availBtnText,
                  { color: active ? "white" : s.color },
                ]}
              >
                {s.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Ligne 2 : stock — chiffres horizontaux scrollables + gros chiffre + -/+ */}
      <View style={styles.stockSection}>
        <Text style={styles.fieldLabel}>{t("Stock disponible")}</Text>
        <View style={styles.stockSectionHead}>
          {/* Chiffres horizontaux scrollables, puis le stepper */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tensScroll}
            contentContainerStyle={styles.tensRowContent}
            keyboardShouldPersistTaps="handled"
          >
            {Array.from({ length: 21 }, (_, i) => i * 10).map((n) => {
              const active = (Number(stock) || 0) === n;
              return (
                <TouchableOpacity
                  key={n}
                  style={[
                    styles.tensChip,
                    active && styles.tensChipActive,
                  ]}
                  onPress={() => {
                    setStock(String(n));
                  }}
                >
                  <Text
                    style={[
                      styles.tensChipText,
                      active && styles.tensChipTextActive,
                    ]}
                  >
                    {n}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <View style={styles.stockStepperRow}>
            <TouchableOpacity
              style={styles.stockStepBtn}
              onPress={() => {
                setStock(String(Math.max(0, (Number(stock) || 0) - 1)));
              }}
            >
              <Ionicons
                name="remove"
                size={20}
                color={Theme.colors.dark}
              />
            </TouchableOpacity>
            <Text style={styles.stockBigValue}>
              {Number(stock) || 0}
            </Text>
            <TouchableOpacity
              style={[styles.stockStepBtn, styles.stockStepBtnPlus]}
              onPress={() => {
                setStock(String((Number(stock) || 0) + 1));
              }}
            >
              <Ionicons name="add" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
  </>
);
};
