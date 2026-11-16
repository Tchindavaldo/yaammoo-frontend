"use no memo"; // langue a chaud (cf. architecture/i18n.md)
// Mention « à revoir » d'une carte du panier : le backend (repriceCart) pose
// `needsReview` quand le plat, le prix choisi ou la zone/créneau n'existent
// plus. Visible dès l'ouverture du panier, levée quand le client modifie.
import { Commande } from "@/src/types";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { DS } from "@/src/theme/ds";
import { t } from "@/src/i18n";

export function CartReviewNotice({ orders }: { orders?: Commande[] }) {
  const show = (orders || []).some(o => o?.status === "pendingToBuy" && (o as any)?.needsReview);
  if (!show) return null;
  return (
    <View style={styles.row}>
      <Ionicons name="alert-circle-outline" size={14} color={DS.dangerInk} />
      <Text style={styles.text} numberOfLines={2}>
        {t("Prix ou livraison changés : modifie cette commande")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  text: { flex: 1, fontSize: 12, fontWeight: "600", color: DS.dangerInk },
});
