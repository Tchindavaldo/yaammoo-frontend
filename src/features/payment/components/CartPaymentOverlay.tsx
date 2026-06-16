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
import { CartPaymentState } from "../hooks/useCartPayment";

interface CartPaymentOverlayProps {
  phone: string;
  onPhoneChange: (phone: string) => void;
  onConfirm: (phone: string) => Promise<void>;
  totalAmount: number;
  paymentState: CartPaymentState;
  setPaymentState: (s: CartPaymentState) => void;
  network: "orange" | "mtn";
  onNetworkChange: (n: "orange" | "mtn") => void;
  ussdMessage?: string | null;
  onClose: () => void;
  onError?: (error: string) => void;
  /** Position depuis le bas (au-dessus de la tab bar / clavier). */
  bottom: Animated.AnimatedInterpolation<number> | number;
  isKeyboardVisible: boolean;
}

/**
 * Capsule de paiement GLOBAL du panier — propre au panier (ne réutilise pas
 * l'overlay du home). Flux : total → network_select → input → waiting →
 * ussd_sent → success → success_created / failed. Choix réseau intégré dans
 * la capsule (pas d'overlay séparé). Bordure lumineuse pendant l'attente.
 */
export const CartPaymentOverlay: React.FC<CartPaymentOverlayProps> = ({
  phone,
  onPhoneChange,
  onConfirm,
  totalAmount,
  paymentState,
  setPaymentState,
  network,
  onNetworkChange,
  ussdMessage,
  onClose,
  onError,
  bottom,
  isKeyboardVisible,
}) => {
  const [isProcessing, setIsProcessing] = React.useState(false);
  // Fondu du contenu lors d'un changement d'étape.
  const contentOpacity = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    contentOpacity.setValue(0);
    Animated.timing(contentOpacity, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [paymentState, contentOpacity]);

  const handlePay = async () => {
    if (isKeyboardVisible) {
      Keyboard.dismiss();
      return;
    }
    const p = phone.trim();
    if (!p) {
      onError?.("Veuillez remplir le numéro de paiement");
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
          paymentState === "waiting" ||
          paymentState === "ussd_sent" ||
          paymentState === "success" ||
          paymentState === "success_created"
        }
        borderRadius={40}
        strokeWidth={3}
      />

      <Animated.View style={[styles.contentRow, { opacity: contentOpacity }]}>
        {/* TOTAL (repos) : total à payer + bouton → */}
        {paymentState === "total" && (
          <>
            <View style={styles.iconCircle}>
              <Ionicons name="card-outline" size={16} color="white" />
            </View>
            <View style={styles.totalInfo}>
              <Text style={styles.totalTitle}>Total à payer</Text>
              <Text style={styles.totalAmount}>{totalAmount} FCFA</Text>
            </View>
            <TouchableOpacity
              style={styles.payerBtn}
              onPress={() => setPaymentState("network_select")}
            >
              <Ionicons name="arrow-forward-outline" size={16} color="white" />
            </TouchableOpacity>
          </>
        )}

        {/* NETWORK_SELECT : cancel + "Choix réseau" + chips Orange/MTN */}
        {paymentState === "network_select" && (
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
                        setPaymentState("input");
                      }}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {net === "orange" ? "Orange" : "MTN"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </>
        )}

        {/* INPUT : saisie du numéro */}
        {paymentState === "input" && (
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
                placeholder="saisir le numéro de paiement"
                placeholderTextColor="rgba(255,255,255,0.5)"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={onPhoneChange}
                autoFocus
              />
            </View>
            <TouchableOpacity
              style={[styles.payerBtn, isProcessing && { opacity: 0.7 }]}
              onPress={handlePay}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons
                  name={isKeyboardVisible ? "chevron-down" : "arrow-forward-outline"}
                  size={16}
                  color="white"
                />
              )}
            </TouchableOpacity>
          </>
        )}

        {/* WAITING */}
        {paymentState === "waiting" && (
          <Text style={styles.centerText}>Veuillez patienter...</Text>
        )}

        {/* USSD_SENT : message backend uniquement */}
        {paymentState === "ussd_sent" && (
          <Text style={styles.centerText} numberOfLines={2}>
            {ussdMessage}
          </Text>
        )}

        {/* SUCCESS */}
        {paymentState === "success" && (
          <Text style={styles.centerText}>
            Paiement réussi ! Création de la commande en cours...
          </Text>
        )}

        {/* SUCCESS_CREATED : icône + texte centrés ensemble */}
        {paymentState === "success_created" && (
          <View style={styles.iconTextRow}>
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <Text style={[styles.iconTextLabel, { color: "#10b981" }]}>
              Commande créée avec succès !
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
  // Icône + texte centrés ensemble (succès créé).
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
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
  },
  totalInfo: {
    flex: 1,
    marginLeft: 12,
  },
  totalTitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  totalAmount: {
    color: "white",
    fontSize: 16,
    fontWeight: "900",
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
