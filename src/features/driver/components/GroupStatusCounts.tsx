import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Commande } from "@/src/types";

/**
 * Décompte par statut de livraison d'un groupe, affiché dans l'en-tête de groupe
 * (Express / créneau) — remplace le simple « X livraisons ».
 *   finished = En attente · delivering = En cours · delivered = Terminé
 * Chaque pastille n'apparaît que si son compteur > 0.
 */
export const GroupStatusCounts: React.FC<{ orders: Commande[] }> = ({
  orders,
}) => {
  let attente = 0;
  let cours = 0;
  let termine = 0;
  orders.forEach((o) => {
    if (o.status === "finished") attente++;
    else if (o.status === "delivering") cours++;
    else if (o.status === "delivered") termine++;
  });

  return (
    <View style={styles.row}>
      {attente > 0 && (
        <View style={[styles.pill, styles.pillAttente]}>
          <Text style={[styles.pillText, styles.textAttente]}>{attente} attente</Text>
        </View>
      )}
      {cours > 0 && (
        <View style={[styles.pill, styles.pillCours]}>
          <Text style={[styles.pillText, styles.textCours]}>{cours} en cours</Text>
        </View>
      )}
      {termine > 0 && (
        <View style={[styles.pill, styles.pillTermine]}>
          <Text style={[styles.pillText, styles.textTermine]}>{termine} terminé</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap" },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  pillText: { fontSize: 10, fontWeight: "600" },
  pillAttente: { backgroundColor: "#FEF3C7", borderColor: "#D9770633" },
  textAttente: { color: "#92400E" },
  pillCours: { backgroundColor: "#DBEAFE", borderColor: "#2563eb33" },
  textCours: { color: "#1E40AF" },
  pillTermine: { backgroundColor: "#DCFCE7", borderColor: "#16a34a33" },
  textTermine: { color: "#166534" },
});
