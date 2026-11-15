"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
// Bottom sheet de verification d'un numero de retrait (OM / MoMo, code par
// SMS seul) ou du WhatsApp de la boutique (code sur WhatsApp seul). Cadre copie
// de la sheet de connexion (`AuthGateContext`, R16) : hauteur FIXE
// `AUTH_SHEET_HEIGHT` + bande safe-area, coins 28, fond blanc, voile sombre.
// Un code valide => `onVerified(numero local)`, puis fermeture.
import { GlobalToastHost } from "@/src/components/GlobalToastHost";
import { useSheetSafeInsets } from "@/src/hooks/usePageBottomInset";
import { DS } from "@/src/theme/ds";
import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { t, useLanguage } from "@/src/i18n";
import { AUTH_SHEET_HEIGHT } from "@/src/features/auth/constants";
import { requestPayoutNumberCode, requestWhatsappNumberCode, verifyPayoutNumberCode, verifyWhatsappNumberCode } from "../../services/payoutNumberService";
import { PayoutOtpStep } from "./PayoutOtpStep";

/** Numero touche : retrait Orange / MTN (code par SMS) ou WhatsApp (code sur WhatsApp). */
export type PayoutNetwork = "orange" | "mtn" | "whatsapp";

interface Props {
  network: PayoutNetwork | null;
  initialPhone: string;
  onClose: () => void;
  onVerified: (network: PayoutNetwork, phone: string) => void;
}

/** Numero local : sans indicatif 237 ni espaces (ce qu'attend l'etape OTP). */
const toLocal = (p: string) => p.replace(/\D/g, "").replace(/^237(?=\d{9}$)/, "");

export function PayoutNumberSheet({ network, initialPhone, onClose, onVerified }: Props) {
  useLanguage();
  const { bottom } = useSheetSafeInsets();
  const phoneRef = React.useRef("");
  return (
    <Modal visible={!!network} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { height: AUTH_SHEET_HEIGHT + bottom, paddingBottom: bottom }]}>
        <Text style={styles.title}>{network === "orange" ? t("Numéro Orange Money") : network === "mtn" ? t("Numéro MTN Mobile Money") : t("Numéro WhatsApp")}</Text>
        {network ? (
          <PayoutOtpStep
            key={network}
            initialPhone={toLocal(initialPhone)}
            channel={network === "whatsapp" ? "whatsapp" : "sms"}
            onSubmitPhone={async phone => {
              phoneRef.current = phone;
              await (network === "whatsapp" ? requestWhatsappNumberCode : requestPayoutNumberCode)(phone);
            }}
            onSubmitCode={async code => {
              await (network === "whatsapp" ? verifyWhatsappNumberCode : verifyPayoutNumberCode)(phoneRef.current, code);
              onVerified(network, phoneRef.current);
              onClose();
            }}
            onBack={onClose}
          />
        ) : null}
      </View>
      <GlobalToastHost modal />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: DS.backdrop },
  sheet: { backgroundColor: DS.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  title: { textAlign: "center", fontSize: 16, fontWeight: "700", color: DS.ink, marginTop: 20 },
});
