"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { ActivityIndicator } from "@/src/components/CustomActivityIndicator";
import { DS } from "@/src/theme/ds";
import { t as tr, useLanguage } from "@/src/i18n";
import { useMenuPricePreview } from "./useMenuPricePreview";

/**
 * Aperçu du prix en cours de saisie (maquette B4, canvas « Menu — prix ») :
 * bandeau « Prix affiché au client », puis trois cases « Prix du plat »,
 * « Frais de retrait », « Vous recevez ». Valeurs renvoyées par le backend.
 */
const fmt = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} F`;

export const MenuPricePreviewCard: React.FC<{ price: string }> = ({ price }) => {
  useLanguage();
  const { preview, loading } = useMenuPricePreview(price);
  if (!preview && !loading) return null;

  const value = (n?: number) => (preview && n != null ? fmt(n) : "…");

  return (
    <View style={styles.wrap}>
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>{tr("Prix affiché au client")}</Text>
        {loading && !preview ? (
          <ActivityIndicator size="small" color={DS.accent} />
        ) : (
          <Text style={styles.heroValue}>{value(preview?.displayedPrice)}</Text>
        )}
      </View>
      <View style={styles.row}>
        <View style={styles.tile}>
          <Text style={styles.tileLabel}>{tr("Prix du plat")}</Text>
          <Text style={styles.tileValue}>{value(preview?.price)}</Text>
        </View>
        <View style={styles.tile}>
          <Text style={styles.tileLabel}>{tr("Frais de retrait")}</Text>
          <Text style={styles.tileValue}>{value(preview?.withdrawalFee)}</Text>
        </View>
        <View style={[styles.tile, styles.tileWide]}>
          <Text style={styles.tileLabel}>{tr("Vous recevez")}</Text>
          <Text style={[styles.tileValue, styles.accent]}>
            {value(preview?.merchantReceives)}
          </Text>
        </View>
      </View>
      {preview && !preview.accepted && !!preview.message && (
        <Text style={styles.refused}>{preview.message}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginTop: 18, gap: 10 },
  hero: {
    minHeight: 64,
    borderRadius: 18,
    backgroundColor: DS.slate100,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroLabel: { fontSize: 13, color: DS.slate500 },
  heroValue: { fontSize: 24, fontWeight: "800", color: DS.ink },
  row: { flexDirection: "row", gap: 8 },
  tile: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: DS.slate100,
    padding: 12,
  },
  tileWide: { flex: 1.2 },
  tileLabel: { fontSize: 11, color: DS.slate500 },
  tileValue: { fontSize: 16, fontWeight: "800", color: DS.ink, marginTop: 3 },
  accent: { color: DS.accent },
  refused: { fontSize: 12, color: DS.dangerInk, lineHeight: 17 },
});
