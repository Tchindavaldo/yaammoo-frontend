import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";
import { DS } from "@/src/theme/ds";

/**
 * Barre d'onglets du détail client (`OrderBottomSheet`). Sortie du sheet (R4),
 * même rendu. Défile horizontalement si les onglets visibles dépassent la
 * largeur (jusqu'à 5 avec « Suivi » sur une ligne multi-commandes).
 */

export type OrderSheetTab =
  | "livraison"
  | "commandes"
  | "montant"
  | "suivi"
  | "livreur"
  | "noter";

type Props = {
  tabs: { key: OrderSheetTab; label: string }[];
  active: OrderSheetTab;
  onChange: (tab: OrderSheetTab) => void;
};

export function OrderSheetTabBar({ tabs, active, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tabBar}
      contentContainerStyle={styles.tabBarContent}
    >
      {tabs.map(({ key, label }) => (
        <TouchableOpacity
          key={key}
          style={[styles.tab, active === key && styles.tabActive]}
          onPress={() => onChange(key)}
        >
          <Text style={[styles.tabText, active === key && styles.tabTextActive]}>
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexGrow: 0,
    borderBottomWidth: 1,
    borderColor: DS.gray100,
  },
  tabBarContent: {
    flexDirection: "row",
    paddingHorizontal: 20,
  },
  tab: {
    marginRight: 24,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: "#111827",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  tabTextActive: {
    color: "#111827",
  },
});
