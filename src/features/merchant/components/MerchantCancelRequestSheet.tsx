"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import React, { useState } from "react";
import { ActivityIndicator, Animated, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlobalToastHost } from "@/src/components/GlobalToastHost";
import { useSheetAnimation } from "@/src/hooks/useSheetAnimation";
import { useSheetSafeInsets } from "@/src/hooks/usePageBottomInset";
import { showToast } from "@/src/services/globalToast";
import { merchantService } from "../services/merchantService";
import { t, useLanguage } from "@/src/i18n";
import { DS } from "@/src/theme/ds";

interface Props {
  visible: boolean;
  /** Commande qui porte la demande (`cancelRequest.status === "pending"`). */
  orderId: string | null;
  onClose: () => void;
}

type Decision = "accept" | "refuse";

/**
 * Demande d'annulation du client (boutique gérée dans l'app) : le marchand accepte
 * (commande annulée, client remboursé par le backend) ou refuse (commande maintenue).
 * La commande à jour revient par socket `fastFoodOrderUpdated` (MerchantContext).
 * Contrat : architecture/orders-merchant.md, « Demande d'annulation ».
 */
export function MerchantCancelRequestSheet({ visible, orderId, onClose }: Props) {
  useLanguage();
  const { mounted, backdropStyle, sheetStyle, onSheetLayout } = useSheetAnimation(visible);
  const { bottom } = useSheetSafeInsets();
  const [busy, setBusy] = useState<Decision | null>(null);

  if (!mounted) return null;

  const decide = async (decision: Decision) => {
    if (!orderId || busy) return;
    setBusy(decision);
    try {
      await merchantService.answerCancelRequest(orderId, decision);
      showToast(decision === "accept" ? t("Annulation acceptée : le client est remboursé.") : t("Annulation refusée : la commande est maintenue."), "success");
      onClose();
    } catch (e: any) {
      showToast(e?.response?.data?.message || t("Échec, réessayez."), "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal transparent animationType="none" visible onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t("Fermer")} />
      </Animated.View>
      <Animated.View onLayout={onSheetLayout} style={[styles.sheet, { paddingBottom: bottom }, sheetStyle]}>
        <Text style={styles.title}>{t("Demande d'annulation")}</Text>
        <Text style={styles.body}>
          {t("Le client demande l'annulation de cette commande. Accepter : elle est annulée et le client remboursé. Refuser : elle est maintenue. Si vous la validez, l'annulation n'est plus possible.")}
        </Text>
        <Pressable style={[styles.row, styles.accept]} disabled={!!busy} onPress={() => decide("accept")}>
          {busy === "accept" ? <ActivityIndicator color={DS.bg} /> : <Ionicons name="close-circle-outline" size={18} color={DS.bg} />}
          <Text style={[styles.rowText, { color: DS.bg }]}>{t("Accepter l'annulation")}</Text>
        </Pressable>
        <Pressable style={[styles.row, styles.refuse]} disabled={!!busy} onPress={() => decide("refuse")}>
          {busy === "refuse" ? <ActivityIndicator color={DS.ink} /> : <Ionicons name="checkmark-circle-outline" size={18} color={DS.ink} />}
          <Text style={styles.rowText}>{t("Refuser, déjà commencée")}</Text>
        </Pressable>
      </Animated.View>
      <GlobalToastHost modal />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: DS.scrimMid },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: DS.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 18,
    paddingHorizontal: 16,
    gap: 10,
  },
  title: { fontSize: 16, fontWeight: "700", color: DS.ink },
  body: { fontSize: 13.5, color: DS.muted, lineHeight: 19, marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 14, borderRadius: 16 },
  accept: { backgroundColor: DS.accent },
  refuse: { backgroundColor: DS.surface },
  rowText: { fontSize: 14.5, fontWeight: "700", color: DS.ink },
});
