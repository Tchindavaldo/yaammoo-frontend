"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { NumericKeypad } from "./NumericKeypad";
import { t, useLanguage } from "@/src/i18n";
import { apiErrorMessage } from "@/src/api/apiError";

/**
 * Inscription e-mail — etape « code recu par e-mail ».
 *
 * Copie dediee (R16) de l'etape code de `WhatsAppAuthStep` : memes cases,
 * meme clavier `NumericKeypad`, collage par appui long, renvoi avec compte a
 * rebours (429). Le parent fournit l'envoi et la verification.
 */

interface EmailCodeStepProps {
  email: string;
  onSubmitCode: (code: string) => Promise<void>;
  /** Renvoi du code ; rejette `{ rateLimited, retryAfter }` sur 429. */
  onResend: () => Promise<void>;
  /** Retour au formulaire e-mail / mot de passe. */
  onBack: () => void;
}

const CODE_LENGTH = 6;
const TOP_SPACE_RATIO = Platform.OS === "android" ? 1 : 0;
const DISPLAY_H = Platform.OS === "android" ? 56 : 64;
const ERROR_SLOT_H = Platform.OS === "android" ? 4 : 18;

export const EmailCodeStep: React.FC<EmailCodeStepProps> = ({
  email,
  onSubmitCode,
  onResend,
  onBack,
}) => {
  useLanguage();
  const [code, setCode] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [cooldown, setCooldown] = React.useState(0);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const valid = code.length === CODE_LENGTH;

  const handleKey = (digit: string) => {
    if (loading || code.length >= CODE_LENGTH) return;
    setError(null);
    setCode(code + digit);
  };

  const handleDelete = () => {
    if (loading) return;
    setError(null);
    setCode(code.slice(0, -1));
  };

  const handleResend = async () => {
    if (loading || cooldown > 0) return;
    setLoading(true);
    setError(null);
    try {
      await onResend();
      setCode("");
    } catch (err: any) {
      if (err?.rateLimited) {
        setCooldown(err.retryAfter);
        setError(t("Trop de tentatives. Réessayez dans {{a}} secondes.", { a: err.retryAfter }));
        return;
      }
      setError(apiErrorMessage(err) || t("Envoi du code impossible."));
    } finally {
      setLoading(false);
    }
  };

  const submitCode = async () => {
    if (!valid || loading) return;
    setLoading(true);
    setError(null);
    try {
      await onSubmitCode(code);
      // Succes : loader maintenu jusqu'au demontage par le guard.
    } catch (err: any) {
      const d = err?.response?.data ?? {};
      if (err?.response?.status === 401) {
        const n = d.attemptsRemaining;
        const left =
          n !== undefined && n !== null
            ? t(" {{a}} tentative{{b}} restante{{c}}.", { a: n, b: n > 1 ? "s" : "", c: n > 1 ? "s" : "" })
            : "";
        setError(`${d.message ?? t("Code invalide.")}${left}`);
        setCode("");
      } else {
        setError(apiErrorMessage(err) || t("Inscription échouée."));
      }
      setLoading(false);
    }
  };

  const pasteCode = async () => {
    const text = await Clipboard.getStringAsync().catch(() => "");
    const digits = (text || "").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!digits) {
      setError(t("Aucun code à coller."));
      return;
    }
    setError(null);
    setCode(digits);
  };

  const codeBoxes = Array.from({ length: CODE_LENGTH }, (_, i) => (
    <View key={i} style={[styles.codeBox, code[i] ? styles.codeBoxFilled : null]}>
      <Text style={styles.codeDigit}>{code[i] ?? ""}</Text>
    </View>
  ));

  return (
    <View style={styles.content}>
      <Text style={styles.headerText}>
        {t("Code à {{a}} chiffres envoyé à {{b}}", { a: CODE_LENGTH, b: email })}
      </Text>

      <View style={styles.display}>
        <Pressable onLongPress={pasteCode} delayLongPress={350}>
          <View style={styles.codeRow}>{codeBoxes}</View>
        </Pressable>
      </View>

      <View style={styles.errorSlot}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <View style={styles.gapSpace} />

      <NumericKeypad onPress={handleKey} onDelete={handleDelete} onBack={onBack} disabled={loading} />

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.btn, !valid && styles.btnDisabled]}
          onPress={submitCode}
          disabled={loading || !valid}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.btnText}>{t("Vérifier")}</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.resendBtn, cooldown > 0 && styles.resendBtnOff]}
          onPress={handleResend}
          disabled={loading || cooldown > 0}
          activeOpacity={0.7}
        >
          <Text style={styles.resendBtnText}>{cooldown > 0 ? `${cooldown} s` : t("Renvoyer")}</Text>
        </TouchableOpacity>
      </View>

      {TOP_SPACE_RATIO > 0 ? <View style={styles.bottomSpace} /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 24, paddingBottom: 8, alignItems: "center" },
  headerText: {
    width: "100%",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 19,
    color: "#7a7a78",
    fontWeight: "500",
  },
  display: { height: DISPLAY_H, justifyContent: "center", alignItems: "center" },
  codeRow: { flexDirection: "row", gap: 8 },
  codeBox: {
    width: 42,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ececec",
    backgroundColor: "#fafafa",
    alignItems: "center",
    justifyContent: "center",
  },
  codeBoxFilled: { borderColor: "#141414", backgroundColor: "#ffffff" },
  codeDigit: { fontSize: 20, fontWeight: "700", color: "#141414" },
  errorSlot: { height: ERROR_SLOT_H, justifyContent: "center" },
  error: { fontSize: 13, color: "#d92d20", fontWeight: "500", textAlign: "center" },
  bottomSpace: { flex: TOP_SPACE_RATIO },
  gapSpace: { flex: 1 - TOP_SPACE_RATIO },
  actionRow: { width: "100%", flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    height: 52,
    backgroundColor: "#141414",
  },
  btnDisabled: { opacity: 0.35 },
  btnText: { fontSize: 15, fontWeight: "600", color: "#ffffff" },
  resendBtnOff: { opacity: 0.4 },
  resendBtn: {
    height: 52,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ececec",
    alignItems: "center",
    justifyContent: "center",
  },
  resendBtnText: { fontSize: 15, fontWeight: "600", color: "#141414" },
});
