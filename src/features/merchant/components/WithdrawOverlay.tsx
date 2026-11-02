"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import { Ionicons } from "@expo/vector-icons";
import { AppBlurView as BlurView } from "@/src/components/AppBlurView";
import React from "react";
import {
  Animated,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ActivityIndicator } from "../../../components/CustomActivityIndicator";
import { AnimatedBorderGlow } from "../../checkout/components/AnimatedBorderGlow";
import { WithdrawState } from "../hooks/useWithdraw";
import { WithdrawQuote } from "../services/withdrawService";
import {
  WALLET_NETWORKS,
  WalletBalances,
  WalletNetwork,
  balanceKey,
  formatFcfa,
  networkLabel,
} from "../services/walletNetwork";
import { DS } from "@/src/theme/ds";
import { t, useLanguage } from "@/src/i18n";

interface WithdrawOverlayProps {
  phone: string;
  onPhoneChange: (phone: string) => void;
  amount: string;
  onAmountChange: (amount: string) => void;
  onConfirm: (phone: string) => Promise<void>;
  withdrawState: WithdrawState;
  setWithdrawState: (s: WithdrawState) => void;
  /** Solde débité, choisi par l'utilisateur (aucun repli automatique). */
  sourceNetwork: WalletNetwork | null;
  onSourceChange: (n: WalletNetwork) => void;
  balances: WalletBalances;
  /** Réseau du numéro de réception, détecté à la saisie. */
  detectedNetwork: WalletNetwork | null;
  detecting: boolean;
  detectError: string | null;
  /** Devis interréseau (null en même réseau : aucun frais, rien d'affiché). */
  quote: WithdrawQuote | null;
  quoteLoading: boolean;
  onClose: () => void;
  onError?: (error: string) => void;
  /** Position depuis le bas (au-dessus de la tab bar / clavier). */
  bottom: Animated.AnimatedInterpolation<number> | number;
  isKeyboardVisible: boolean;
}

/** Hauteur de la capsule + espace : la note des frais se pose juste au-dessus. */
const NOTE_OFFSET = 78;

/**
 * Capsule de RETRAIT — copie adaptée de CartPaymentOverlay.
 * Flux : idle → source_select (solde MTN / Orange) → amount_input → input
 * (numéro, réseau détecté, frais interréseau) → waiting → processing
 * ("retrait en cours") → completed ("retrait effectué") / failed.
 */
export const WithdrawOverlay: React.FC<WithdrawOverlayProps> = ({
  phone,
  onPhoneChange,
  amount,
  onAmountChange,
  onConfirm,
  withdrawState,
  setWithdrawState,
  sourceNetwork,
  onSourceChange,
  balances,
  detectedNetwork,
  detecting,
  detectError,
  quote,
  quoteLoading,
  onClose,
  onError,
  bottom,
  isKeyboardVisible,
}) => {
  useLanguage();
  const [isProcessing, setIsProcessing] = React.useState(false);
  const contentOpacity = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    contentOpacity.setValue(0);
    Animated.timing(contentOpacity, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [withdrawState, contentOpacity]);

  const sourceBalance = sourceNetwork ? balances[balanceKey(sourceNetwork)] : 0;

  const handleAmountNext = () => {
    if (isKeyboardVisible) {
      Keyboard.dismiss();
      return;
    }
    const a = Number(amount);
    if (!a || a <= 0 || !Number.isInteger(a)) {
      onError?.(t("Veuillez saisir un montant valide"));
      return;
    }
    if (a > sourceBalance) {
      onError?.(t("Solde {{a}} insuffisant : {{b}} disponibles.", { a: networkLabel(sourceNetwork), b: formatFcfa(sourceBalance) }));
      return;
    }
    setWithdrawState("input");
  };

  const crossNetwork = !!detectedNetwork && !!sourceNetwork && detectedNetwork !== sourceNetwork;
  const blocked = detecting || !detectedNetwork || quoteLoading || !quote;

  const handleConfirm = async () => {
    if (isKeyboardVisible) {
      Keyboard.dismiss();
      return;
    }
    const raw = phone.trim().replace(/\s/g, "");
    if (!raw) {
      onError?.(t("Veuillez remplir le numéro de retrait"));
      return;
    }
    if (blocked) {
      onError?.(detectError || t("Réseau du numéro en cours de détection"));
      return;
    }
    if (quote && !quote.sufficient) {
      onError?.(t("Solde {{a}} insuffisant avec les frais : {{b}} nécessaires, {{c}} disponibles.", { a: networkLabel(sourceNetwork), b: formatFcfa(quote.totalDebited), c: formatFcfa(quote.sourceBalance) }));
      return;
    }
    const p = raw.startsWith("237") ? raw : `237${raw}`;
    try {
      setIsProcessing(true);
      Keyboard.dismiss();
      await onConfirm(p);
    } finally {
      setIsProcessing(false);
    }
  };

  // Note au-dessus de la capsule, à la saisie du numéro : erreur de détection,
  // ou montant envoyé (espèces + frais de retrait) et, en interréseau, frais en plus.
  const note =
    withdrawState !== "input" || !detectedNetwork
      ? null
      : detectError
        ? detectError
        : quoteLoading || !quote
          ? t("Calcul des frais…")
          : t("Envoyé {{a}} (dont {{b}} de frais de retrait)", { a: formatFcfa(quote.sentAmount ?? quote.amount), b: formatFcfa(quote.kioskFee ?? 0) }) +
            (crossNetwork ? t(" · frais {{a}} → {{b}} {{c}}", { a: networkLabel(sourceNetwork), b: networkLabel(detectedNetwork), c: formatFcfa(quote.fee) }) : "") +
            t(" · débité {{a}}", { a: formatFcfa(quote.totalDebited) });

  return (
    <>
      {note && (
        <Animated.View style={[styles.note, { bottom: Animated.add(bottom, NOTE_OFFSET) }]}>
          <Text style={[styles.noteText, detectError ? styles.noteError : null]} numberOfLines={2}>
            {note}
          </Text>
        </Animated.View>
      )}

      <Animated.View style={[styles.capsule, { bottom }]}>
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        <AnimatedBorderGlow
          active={withdrawState === "waiting" || withdrawState === "processing" || withdrawState === "completed"}
          borderRadius={40}
          strokeWidth={3}
        />

        <Animated.View style={[styles.contentRow, { opacity: contentOpacity }]}>
          {/* SOURCE_SELECT : quel solde débiter */}
          {withdrawState === "source_select" && (
            <>
              <TouchableOpacity style={styles.closeCircle} onPress={onClose}>
                <Ionicons name="close" size={16} color={DS.onInk} />
              </TouchableOpacity>
              <View style={styles.networkBlock}>
                <Text style={styles.networkLabel}>{t("Débiter")}</Text>
                <View style={styles.chips}>
                  {WALLET_NETWORKS.map((net) => {
                    const active = sourceNetwork === net;
                    return (
                      <TouchableOpacity
                        key={net}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => {
                          onSourceChange(net);
                          setWithdrawState("amount_input");
                        }}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{networkLabel(net)}</Text>
                        <Text style={[styles.chipAmount, active && styles.chipTextActive]}>
                          {balances[balanceKey(net)].toLocaleString("fr-FR")} F
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </>
          )}

          {/* AMOUNT_INPUT : saisie du montant à recevoir */}
          {withdrawState === "amount_input" && (
            <>
              {!isKeyboardVisible && (
                <TouchableOpacity style={styles.closeCircle} onPress={onClose}>
                  <Ionicons name="close" size={16} color={DS.onInk} />
                </TouchableOpacity>
              )}
              <View style={styles.inputWrapper}>
                <Ionicons name="cash-outline" size={16} color={DS.onInk} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder={t("montant (max {{a}} F)", { a: sourceBalance.toLocaleString("fr-FR") })}
                  placeholderTextColor={DS.onInkMuted}
                  keyboardType="number-pad"
                  value={amount}
                  onChangeText={onAmountChange}
                  autoFocus
                />
              </View>
              <TouchableOpacity style={styles.payerBtn} onPress={handleAmountNext}>
                <Ionicons name={isKeyboardVisible ? "chevron-down" : "arrow-forward-outline"} size={16} color={DS.onInk} />
              </TouchableOpacity>
            </>
          )}

          {/* INPUT : numéro de réception + réseau détecté */}
          {withdrawState === "input" && (
            <>
              {!isKeyboardVisible && (
                <TouchableOpacity style={styles.closeCircle} onPress={onClose}>
                  <Ionicons name="close" size={16} color={DS.onInk} />
                </TouchableOpacity>
              )}
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={16} color={DS.onInk} style={styles.inputIcon} />
                <Text style={styles.phonePrefix}>+237</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="6XXXXXXXX"
                  placeholderTextColor={DS.onInkMuted}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={onPhoneChange}
                  autoFocus
                />
                {detecting ? (
                  <ActivityIndicator size="small" color={DS.onInk} />
                ) : detectedNetwork ? (
                  <Text style={styles.detected}>{networkLabel(detectedNetwork)}</Text>
                ) : null}
              </View>
              <TouchableOpacity
                style={[styles.payerBtn, (isProcessing || blocked) && styles.payerBtnDisabled]}
                onPress={handleConfirm}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color={DS.onInk} />
                ) : (
                  <Ionicons name={isKeyboardVisible ? "chevron-down" : "arrow-forward-outline"} size={16} color={DS.onInk} />
                )}
              </TouchableOpacity>
            </>
          )}

          {/* WAITING : requête en vol */}
          {withdrawState === "waiting" && <Text style={styles.centerText}>{t("Veuillez patienter...")}</Text>}

          {/* PROCESSING : réponse reçue, retrait pris en compte */}
          {withdrawState === "processing" && (
            <Text style={styles.centerText} numberOfLines={2}>
              {t("Retrait en cours...")}
            </Text>
          )}

          {/* COMPLETED */}
          {withdrawState === "completed" && (
            <View style={styles.completedBlock}>
              <Text style={styles.completedText} numberOfLines={2}>
                {t("Retrait réussi ! Le montant peut mettre jusqu'à 24h pour arriver sur votre numéro.")}
              </Text>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  capsule: {
    position: "absolute",
    width: "96%",
    height: 70,
    backgroundColor: DS.scrimTop,
    borderRadius: 80,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    overflow: "hidden",
    shadowColor: DS.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    alignSelf: "center",
    zIndex: 1000,
    left: "2%",
  },
  note: {
    position: "absolute",
    left: "6%",
    right: "6%",
    zIndex: 1001,
    alignItems: "center",
  },
  noteText: {
    backgroundColor: DS.ink,
    color: DS.onInk,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    overflow: "hidden",
  },
  noteError: {
    backgroundColor: DS.dangerInk,
  },
  contentRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  centerText: {
    flex: 1,
    color: DS.onInk,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  completedBlock: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  completedText: {
    color: DS.success,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  closeCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DS.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  networkBlock: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 12,
  },
  networkLabel: {
    color: DS.onInkMuted,
    fontSize: 13,
    fontWeight: "600",
  },
  chips: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: DS.onInkFill,
    borderWidth: 1,
    borderColor: "transparent",
    alignItems: "center",
  },
  chipActive: {
    backgroundColor: DS.accent,
    borderColor: DS.accent,
  },
  chipText: {
    color: DS.onInkMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  chipAmount: {
    color: DS.onInkMuted,
    fontSize: 11,
    fontWeight: "500",
  },
  chipTextActive: {
    color: DS.onInk,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DS.onInkFill,
    height: 45,
    borderRadius: 22.5,
    paddingHorizontal: 12,
    marginHorizontal: 10,
  },
  inputIcon: {
    marginRight: 8,
  },
  phonePrefix: {
    color: DS.onInk,
    fontSize: 14,
    fontWeight: "600",
    marginRight: 4,
  },
  textInput: {
    flex: 1,
    color: DS.onInk,
    fontSize: 14,
    fontWeight: "500",
    padding: 0,
  },
  detected: {
    color: DS.accentOnInk,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },
  payerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DS.accent,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    minWidth: 40,
  },
  payerBtnDisabled: {
    opacity: 0.5,
  },
});
