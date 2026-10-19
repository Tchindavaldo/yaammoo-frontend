import { HeaderPill } from "@/src/components/molecules/HeaderPill";
import { TabHeader } from "@/src/components/molecules/TabHeader";
import { useMerchant } from "@/src/features/merchant/hooks/useMerchant";
import { useFooterBottomInset } from "@/src/hooks/usePageBottomInset";
import { DS } from "@/src/theme/ds";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ShopDrinkRow } from "./ShopDrinkRow";
import { useShopDrinks } from "./useShopDrinks";

/**
 * Settings → Boutique → « Boissons » (route `app/shop/drinks.tsx`).
 * Les boissons appartiennent à la BOUTIQUE : une même boisson est proposée
 * avec tous les plats par défaut, ou restreinte à certains plats.
 */
export const ShopDrinksPage: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { menus, ensureLoaded } = useMerchant();
  const { drinks, loading, saving, dirty, update, save } = useShopDrinks();
  const footerInset = useFooterBottomInset();
  const [headerHeight, setHeaderHeight] = useState(70);
  const [draft, setDraft] = useState({ name: "", prix: "" });
  // null = ajout ; sinon index de la boisson en cours de modification.
  const [editIdx, setEditIdx] = useState<number | null>(null);

  useEffect(() => {
    ensureLoaded();
  }, [ensureLoaded]);

  const menuOptions = menus.map((m: any) => ({
    id: m.id || m._id,
    name: m.name || m.titre || "Plat",
  }));

  const resetDraft = () => {
    setDraft({ name: "", prix: "" });
    setEditIdx(null);
  };

  const validate = () => {
    const name = draft.name.trim();
    if (!name) return;
    const prix = Number(draft.prix) || 0;
    if (editIdx === null) {
      update([...drinks, { name, prix, status: true, menuIds: null }]);
    } else {
      update(drinks.map((d, i) => (i === editIdx ? { ...d, name, prix } : d)));
    }
    resetDraft();
  };

  return (
    <View style={styles.root}>
      <TabHeader
        title="Boissons"
        subtitle={`${drinks.length} boisson${drinks.length > 1 ? "s" : ""} en boutique`}
        right={<HeaderPill label="Retour" icon="arrow-back-outline" onPress={onClose} />}
        onHeightChange={setHeaderHeight}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingTop: headerHeight + 12 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>
          {editIdx === null ? "Ajouter une boisson" : "Modifier la boisson"}
        </Text>
        <View style={styles.editRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            placeholder="Nom de la boisson"
            placeholderTextColor={DS.faint}
            value={draft.name}
            onChangeText={(t) => setDraft({ ...draft, name: t })}
          />
          <TextInput
            style={[styles.input, styles.priceInput]}
            placeholder="Prix"
            placeholderTextColor={DS.faint}
            keyboardType="numeric"
            value={draft.prix}
            onChangeText={(t) => setDraft({ ...draft, prix: t })}
          />
          {editIdx !== null && (
            <TouchableOpacity style={styles.actionBtn} onPress={resetDraft}>
              <Ionicons name="close" size={18} color={DS.muted} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.actionBtn, styles.validateBtn]} onPress={validate}>
            <Ionicons name="checkmark" size={18} color={DS.onInk} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={DS.accent} style={{ marginTop: 24 }} />
        ) : drinks.length === 0 ? (
          <Text style={styles.empty}>
            Aucune boisson. Une boisson ajoutée est proposée avec tous vos plats.
          </Text>
        ) : (
          <View style={styles.list}>
            {drinks.map((d, i) => (
              <ShopDrinkRow
                key={d.id || `new-${i}`}
                drink={d}
                menus={menuOptions}
                onChange={(next) => update(drinks.map((x, j) => (j === i ? next : x)))}
                onEdit={() => {
                  setDraft({ name: d.name, prix: String(d.prix) });
                  setEditIdx(i);
                }}
                onDelete={() => {
                  update(drinks.filter((_, j) => j !== i));
                  if (editIdx === i) resetDraft();
                }}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: footerInset }]}>
        <TouchableOpacity
          style={[styles.saveBtn, (!dirty || saving) && styles.saveBtnOff]}
          onPress={save}
          disabled={!dirty || saving}
        >
          {saving ? (
            <ActivityIndicator color={DS.onInk} />
          ) : (
            <Text style={styles.saveText}>Enregistrer</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DS.bg },
  content: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  label: { fontSize: 14, fontWeight: "600", color: DS.text2 },
  editRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: {
    backgroundColor: DS.gray50,
    borderWidth: 1,
    borderColor: DS.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: DS.ink,
  },
  priceInput: { width: 90 },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DS.slate100,
  },
  validateBtn: { backgroundColor: DS.accent },
  empty: { fontSize: 14, color: DS.muted, textAlign: "center", marginTop: 24 },
  list: { gap: 10 },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: DS.line,
    backgroundColor: DS.bg,
  },
  saveBtn: {
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DS.accent,
  },
  saveBtnOff: { opacity: 0.5 },
  saveText: { fontSize: 16, fontWeight: "700", color: DS.onInk },
});
