"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
// Bottom sheet de verification d'un numero de retrait (OM / MoMo, code par
// SMS seul) ou du WhatsApp de la boutique (code sur WhatsApp seul). Cadre copie
// de la sheet de connexion (`AuthGateContext`, R16) : hauteur FIXE
// `AUTH_SHEET_HEIGHT` + bande safe-area, coins 28, fond blanc, voile sombre.
// Un code valide => `onVerified(numero local)`, puis fermeture.
import { GlobalToastHost } from "@/src/components/GlobalToastHost";
import { useSheetSafeInsets } from "@/src/hooks/usePageBottomInset";
import { useSheetAnimation } from "@/src/hooks/useSheetAnimation";
import { DS } from "@/src/theme/ds";
import React from "react";
import { Animated, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { t, useLanguage } from "@/src/i18n";
import { AUTH_SHEET_HEIGHT } from "@/src/features/auth/constants";
import { getPayoutNumberFee, requestPayoutNumberCode, requestWhatsappNumberCode, verifyPayoutNumberCode, verifyWhatsappNumberCode } from "../../services/payoutNumberService";
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

export function PayoutNumberSheet({ network: open, initialPhone, onClose, onVerified }: Props) {
  // Dernier reseau ouvert : garde le contenu pendant l'animation de fermeture.
  const last = React.useRef<PayoutNetwork | null>(open);
  if (open) last.current = open;
  const network = last.current;
  useLanguage();
  const { bottom } = useSheetSafeInsets();
  const anim = useSheetAnimation(!!open);
  const phoneRef = React.useRef("");
  const [fee, setFee] = React.useState<number | null>(null);
  React.useEffect(() => {
    if (open === "orange" || open === "mtn") getPayoutNumberFee().then(setFee);
  }, [open]);
  return (
    <Modal visible={anim.mounted} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, anim.backdropStyle]}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>
      <Animated.View onLayout={anim.onSheetLayout} style={[styles.sheet, anim.sheetStyle, { height: AUTH_SHEET_HEIGHT + bottom, paddingBottom: bottom }]}>
        <Text style={styles.title}>{network === "orange" ? t("Numéro Orange Money") : network === "mtn" ? t("Numéro MTN Mobile Money") : t("Numéro WhatsApp")}</Text>
        {network ? (
          <PayoutOtpStep
            key={network}
            initialPhone={toLocal(initialPhone)}
            channel={network === "whatsapp" ? "whatsapp" : "sms"}
            feeEstimate={fee}
            onSubmitPhone={async phone => {
              phoneRef.current = phone;
              if (network === "whatsapp") await requestWhatsappNumberCode(phone);
              else await requestPayoutNumberCode(phone, network);
            }}
            onSubmitCode={async code => {
              await (network === "whatsapp" ? verifyWhatsappNumberCode : verifyPayoutNumberCode)(phoneRef.current, code);
              onVerified(network, phoneRef.current);
              onClose();
            }}
            onBack={onClose}
          />
        ) : null}
      </Animated.View>
      <GlobalToastHost modal />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: DS.backdrop },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: DS.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  title: { textAlign: "center", fontSize: 16, fontWeight: "700", color: DS.ink, marginTop: 20 },
});
