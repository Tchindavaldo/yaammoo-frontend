"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Commande } from "@/src/types";
import { DS } from "@/src/theme/ds";
import { t, useLanguage } from "@/src/i18n";
import { OrderCancel } from "../hooks/useOrderCancel";

/**
 * « Annuler la commande » (onglet Livraison du détail client). Seulement tant
 * que le restaurant n'a pas accepté (`pending`). Le backend rend le montant
 * payé moins les frais réels de paiement (devis `GET /order/cancel-quote`,
 * affiché avant confirmation), cf. backend architecture/order-cancel.md.
 *
 * Boutique WhatsApp : le backend n'annule pas, il transmet une DEMANDE au
 * marchand (`order.cancelRequest`, réponse `cancelRequested`). Le bouton devient
 * « En attente de la réponse du marchand » ; refusée, la commande est maintenue.
 * Sans réponse passé `cancelRequest.resendAt` (réglage backend), « Renvoyer la
 * demande » apparaît à droite : même appel, le marchand reçoit une relance.
 * La décision arrive par le socket `userOrderUpdated` (commande à jour).
 */
export function OrderCancelButton({ order, cancelState }: { order: Commande; cancelState: OrderCancel }) {
  useLanguage();
  const { busy, ask, cancel } = cancelState;
  const request = order.cancelRequest?.status;
  const resendAt = request === "pending" ? order.cancelRequest?.resendAt : undefined;
  // Re-rendu à l'échéance de `resendAt` : le bouton « Renvoyer » apparaît sans action du client.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!resendAt) return;
    const ms = new Date(resendAt).getTime() - Date.now();
    if (!(ms > 0)) return;
    const id = setTimeout(() => setTick((x) => x + 1), Math.min(ms + 500, 2147483647));
    return () => clearTimeout(id);
  }, [resendAt]);
  if ((order as any)?.status !== "pending") return null;

  if (request === "refused") {
    return (
      <View style={[styles.btn, styles.state]}>
        <Text style={styles.stateText}>{t("Le restaurant a refusé l'annulation : la commande est maintenue.")}</Text>
      </View>
    );
  }

  if (request === "pending") {
    const resendDue = !resendAt || Date.now() >= new Date(resendAt).getTime();
    return (
      <View style={[styles.btn, styles.state, styles.row]}>
        <Text style={[styles.stateText, styles.stateGrow]}>{t("En attente de la réponse du marchand")}</Text>
        {resendDue ? (
          <TouchableOpacity style={styles.resend} onPress={() => cancel(true)} disabled={busy} activeOpacity={0.8}>
            {busy ? <ActivityIndicator size="small" color={DS.dangerInk} /> : <Text style={styles.resendText}>{t("Renvoyer la demande")}</Text>}
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  return (
    <TouchableOpacity style={styles.btn} onPress={ask} disabled={busy} activeOpacity={0.8}>
      {busy ? <ActivityIndicator size="small" color={DS.dangerInk} /> : <Text style={styles.text}>{t("Annuler la commande")}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DS.dangerInk,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  text: { fontSize: 14, fontWeight: "700", color: DS.dangerInk },
  state: { borderColor: DS.slate300, backgroundColor: DS.slate50, paddingHorizontal: 16 },
  stateText: { fontSize: 13, fontWeight: "600", color: DS.slate600, textAlign: "center" },
  row: { flexDirection: "row", gap: 8, paddingRight: 6 },
  stateGrow: { flex: 1, textAlign: "left" },
  resend: { height: 36, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: DS.dangerInk, alignItems: "center", justifyContent: "center" },
  resendText: { fontSize: 13, fontWeight: "700", color: DS.dangerInk },
});
