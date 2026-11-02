import { DS } from "@/src/theme/ds";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ShopDrink } from "./useShopDrinks";
import { t, useLanguage } from "@/src/i18n";

interface Props {
  drink: ShopDrink;
  menus: { id: string; name: string }[];
  onChange: (next: ShopDrink) => void;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Une boisson de la boutique : nom + prix, dispo/rupture, et les plats avec
 * lesquels elle est proposée (« Tous les plats » par défaut, ou une sélection).
 */
export const ShopDrinkRow: React.FC<Props> = ({ drink, menus, onChange, onEdit, onDelete }) => {
  useLanguage();
  const [open, setOpen] = useState(false);
  const allMenus = drink.menuIds === null;
  const scopeLabel = allMenus
    ? t("Tous les plats")
    : t("{{a}} plat{{b}}", { a: drink.menuIds!.length, b: drink.menuIds!.length > 1 ? "s" : "" });

  const toggleMenu = (id: string) => {
    const current = drink.menuIds || [];
    const next = current.includes(id) ? current.filter((m) => m !== id) : [...current, id];
    onChange({ ...drink, menuIds: next });
  };

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <TouchableOpacity style={styles.info} onPress={onEdit}>
          <Text style={styles.name} numberOfLines={1}>
            {drink.name}
          </Text>
          <Text style={styles.price}>{drink.prix} FCFA</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.pill, drink.status ? styles.pillOk : styles.pillOff]}
          onPress={() => onChange({ ...drink, status: !drink.status })}
        >
          <Text style={[styles.pillText, { color: drink.status ? DS.success : DS.danger }]}>
            {drink.status ? t("Disponible") : t("Rupture")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={onDelete}>
          <Ionicons name="trash-outline" size={18} color={DS.danger} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.scopeRow} onPress={() => setOpen((o) => !o)}>
        <Ionicons name="restaurant-outline" size={14} color={DS.muted} />
        <Text style={styles.scopeText}>{scopeLabel}</Text>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={14} color={DS.muted} />
      </TouchableOpacity>

      {open && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <TouchableOpacity
            style={[styles.chip, allMenus && styles.chipOn]}
            onPress={() => onChange({ ...drink, menuIds: allMenus ? [] : null })}
          >
            <Text style={[styles.chipText, allMenus && styles.chipTextOn]}>{t("Tous les plats")}</Text>
          </TouchableOpacity>
          {menus.map((m) => {
            const on = !allMenus && drink.menuIds!.includes(m.id);
            return (
              <TouchableOpacity
                key={m.id}
                style={[styles.chip, on && styles.chipOn]}
                onPress={() => toggleMenu(m.id)}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]} numberOfLines={1}>
                  {m.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: DS.line,
    borderRadius: 14,
    padding: 12,
    gap: 8,
    backgroundColor: DS.bg,
  },
  head: { flexDirection: "row", alignItems: "center", gap: 8 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: "700", color: DS.ink },
  price: { fontSize: 13, fontWeight: "600", color: DS.accent, marginTop: 2 },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  pillOk: { backgroundColor: DS.slate100 },
  pillOff: { backgroundColor: DS.accentWash },
  pillText: { fontSize: 12, fontWeight: "700" },
  iconBtn: { padding: 6 },
  scopeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  scopeText: { fontSize: 13, color: DS.muted, fontWeight: "600" },
  chips: { gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: DS.slate100,
    maxWidth: 180,
  },
  chipOn: { backgroundColor: DS.accent },
  chipText: { fontSize: 12, fontWeight: "600", color: DS.text2 },
  chipTextOn: { color: DS.onInk },
});
