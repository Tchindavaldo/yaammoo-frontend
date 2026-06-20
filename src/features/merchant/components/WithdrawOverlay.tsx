import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
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

interface WithdrawOverlayProps {
  phone: string;
  onPhoneChange: (phone: string) => void;
  amount: string;
  onAmountChange: (amount: string) => void;
  onConfirm: (phone: string) => Promise<void>;
  withdrawState: WithdrawState;
  setWithdrawState: (s: WithdrawState) => void;
  network: "orange" | "mtn";
  onNetworkChange: (n: "orange" | "mtn") => void;
  onClose: () => void;
  onError?: (error: string) => void;
  /** Position depuis le bas (au-dessus de la tab bar / clavier). */
  bottom: Animated.AnimatedInterpolation<number> | number;
  isKeyboardVisible: boolean;
}

/**
 * Capsule de RETRAIT marchand — copie adaptée de CartPaymentOverlay.
 * Flux : idle → amount_input → network_select → input → waiting →
 * processing ("retrait en cours") → completed ("retrait effectué") / failed.
 */
export const WithdrawOverlay: React.FC<WithdrawOverlayProps> = ({
  phone,
  onPhoneChange,
  amount,
  onAmountChange,
  onConfirm,
  withdrawState,
  setWithdrawState,
  network,
  onNetworkChange,
  onClose,
  onError,
  bottom,
  isKeyboardVisible,
}) => {
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

  const handleAmountNext = () => {
    if (isKeyboardVisible) {
      Keyboard.dismiss();
      return;
    }
    const a = Number(amount);
    if (!a || a <= 0) {
      onError?.("Veuillez saisir un montant valide");
      return;
    }
    setWithdrawState("network_select");
  };

  const handleConfirm = async () => {
    if (isKeyboardVisible) {
      Keyboard.dismiss();
      return;
    }
    const p = phone.trim();
    if (!p) {
      onError?.("Veuillez remplir le numéro de retrait");
      return;
    }
    try {
      setIsProcessing(true);
      Keyboard.dismiss();
      await onConfirm(p);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Animated.View style={[styles.capsule, { bottom }]}>
      <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
      <AnimatedBorderGlow
        active={
          withdrawState === "waiting" ||
          withdrawState === "processing" ||
          withdrawState === "completed"
        }
        borderRadius={40}
        strokeWidth={3}
      />

      <Animated.View style={[styles.contentRow, { opacity: contentOpacity }]}>
        {/* AMOUNT_INPUT : saisie du montant à retirer */}
        {withdrawState === "amount_input" && (
          <>
            {!isKeyboardVisible && (
              <TouchableOpacity style={styles.closeCircle} onPress={onClose}>
                <Ionicons name="close" size={16} color="white" />
              </TouchableOpacity>
            )}
            <View style={styles.inputWrapper}>
              <Ionicons
                name="cash-outline"
                size={16}
                color="white"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.textInput}
                placeholder="montant à retirer (FCFA)"
                placeholderTextColor="rgba(255,255,255,0.5)"
                keyboardType="number-pad"
                value={amount}
                onChangeText={onAmountChange}
                autoFocus
              />
            </View>
            <TouchableOpacity
              style={styles.payerBtn}
              onPress={handleAmountNext}
            >
              <Ionicons
                name={
                  isKeyboardVisible ? "chevron-down" : "arrow-forward-outline"
                }
                size={16}
                color="white"
              />
            </TouchableOpacity>
          </>
        )}

        {/* NETWORK_SELECT : cancel + "Choix réseau" + chips Orange/MTN */}
        {withdrawState === "network_select" && (
          <>
            <TouchableOpacity style={styles.closeCircle} onPress={onClose}>
              <Ionicons name="close" size={16} color="white" />
            </TouchableOpacity>
            <View style={styles.networkBlock}>
              <Text style={styles.networkLabel}>Choix réseau</Text>
              <View style={styles.chips}>
                {(["orange", "mtn"] as const).map((net) => {
                  const active = network === net;
                  return (
                    <TouchableOpacity
                      key={net}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => {
                        onNetworkChange(net);
                        setWithdrawState("input");
                      }}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          active && styles.chipTextActive,
                        ]}
                      >
                        {net === "orange" ? "Orange" : "MTN"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </>
        )}

        {/* INPUT : saisie du numéro de retrait */}
        {withdrawState === "input" && (
          <>
            {!isKeyboardVisible && (
              <TouchableOpacity style={styles.closeCircle} onPress={onClose}>
                <Ionicons name="close" size={16} color="white" />
              </TouchableOpacity>
            )}
            <View style={styles.inputWrapper}>
              <Ionicons
                name="call-outline"
                size={16}
                color="white"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.textInput}
                placeholder="saisir le numéro de retrait"
                placeholderTextColor="rgba(255,255,255,0.5)"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={onPhoneChange}
                autoFocus
              />
            </View>
            <TouchableOpacity
              style={[styles.payerBtn, isProcessing && { opacity: 0.7 }]}
              onPress={handleConfirm}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons
                  name={
                    isKeyboardVisible ? "chevron-down" : "arrow-forward-outline"
                  }
                  size={16}
                  color="white"
                />
              )}
            </TouchableOpacity>
          </>
        )}

        {/* WAITING : requête en vol */}
        {withdrawState === "waiting" && (
          <Text style={styles.centerText}>Veuillez patienter...</Text>
        )}

        {/* PROCESSING : réponse reçue, retrait pris en compte */}
        {withdrawState === "processing" && (
          <Text style={styles.centerText} numberOfLines={2}>
            Retrait en cours...
          </Text>
        )}

        {/* COMPLETED : icône + texte sur une seule ligne */}
        {withdrawState === "completed" && (
          <View style={styles.completedBlock}>
            {/* <Ionicons name="checkmark-circle" size={20} color="#10b981" /> */}
            <Text
              style={[
                styles.iconTextLabel,
                { color: "#10b981", textAlign: "center" },
              ]}
              numberOfLines={2}
            >
              Retrait réussi ! Le montant peut mettre jusqu&apos;à 24h pour
              arriver sur votre numéro.
            </Text>
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  capsule: {
    position: "absolute",
    width: "96%",
    height: 70,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 80,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    alignSelf: "center",
    zIndex: 1000,
    left: "2%",
  },
  contentRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  centerText: {
    flex: 1,
    color: "white",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  iconTextRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  iconTextLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  completedBlock: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 24,
  },
  completedTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  completedHint: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 10,
    textAlign: "center",
  },
  closeCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ef4444",
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
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: "600",
  },
  chips: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "transparent",
  },
  chipActive: {
    backgroundColor: "#ec4913",
    borderColor: "#ec4913",
  },
  chipText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: "600",
  },
  chipTextActive: {
    color: "white",
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    height: 45,
    borderRadius: 22.5,
    paddingHorizontal: 12,
    marginHorizontal: 10,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    color: "white",
    fontSize: 14,
    fontWeight: "500",
    padding: 0,
  },
  payerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ec4913",
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    minWidth: 40,
  },
});
