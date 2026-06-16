import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React from "react";
import {
  Animated,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Loader } from "../../../components/Loader";
import { AnimatedBorderGlow } from "./AnimatedBorderGlow";

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);
const SHEET_HEIGHT = 384;

interface CheckoutPaymentOverlayProps {
  visible: boolean;
  /** Demande au parent de passer visible à false (déclenche la sortie). */
  onRequestClose: () => void;
  /** Appelé une fois l'animation de sortie terminée (démontage/reset). */
  onClose: () => void;
  phone: string;
  onPhoneChange: (phone: string) => void;
  onConfirm: (phone: string) => Promise<void>;
  paymentState?:
    | "network_select"
    | "input"
    | "ussd_sent"
    | "success"
    | "success_created"
    | "failed";
  ussdMessage?: string;
  onError?: (error: string) => void;
}

export const CheckoutPaymentOverlay: React.FC<CheckoutPaymentOverlayProps> = ({
  visible,
  onRequestClose,
  onClose,
  phone,
  onPhoneChange,
  onConfirm,
  paymentState = "network_select",
  ussdMessage,
  onError,
}) => {
  const [localPhone, setLocalPhone] = React.useState(phone);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = React.useState(false);
  // La capsule du bas n'a plus d'étape "network_select" (gérée par le top
  // overlay) → on démarre directement sur "input".
  const [localPaymentState, setLocalPaymentState] = React.useState<string>(
    paymentState === "network_select" ? "input" : paymentState,
  );

  const keyboardHeight = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(300)).current; // Entry/Exit animation
  // Fondu du contenu lors d'un changement d'étape (input → waiting → ussd_sent…).
  const contentOpacity = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    contentOpacity.setValue(0);
    Animated.timing(contentOpacity, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [localPaymentState, contentOpacity]);
  // Reste monté tant que l'animation de sortie n'est pas terminée.
  const [mounted, setMounted] = React.useState(visible);

  React.useEffect(() => {
    setLocalPaymentState(
      paymentState === "network_select" ? "input" : paymentState,
    );
  }, [paymentState]);

  // Entrée / sortie pilotées par `visible` → synchro avec le top overlay.
  React.useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: false,
        tension: 65, // Faster entry
        friction: 10,
      }).start();
    } else {
      Keyboard.dismiss();
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 220,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) {
          setMounted(false);
          onClose();
        }
      });
    }
  }, [visible]);

  React.useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (event) => {
        setIsKeyboardVisible(true);
        Animated.spring(keyboardHeight, {
          toValue: event.endCoordinates.height,
          useNativeDriver: false, // MUST be false because height is animated
          tension: 40,
          friction: 8,
        }).start();
      },
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setIsKeyboardVisible(false);
        Animated.spring(keyboardHeight, {
          toValue: 0,
          useNativeDriver: false,
          tension: 40,
          friction: 8,
        }).start();
      },
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const handleClose = () => {
    // On demande juste au parent de fermer ; l'animation de sortie est
    // déclenchée par le passage de `visible` à false (synchro avec le top overlay).
    onRequestClose();
  };

  const handleAction = () => {
    if (isKeyboardVisible) {
      Keyboard.dismiss();
    } else {
      handleClose();
    }
  };

  const handlePay = async () => {
    if (isKeyboardVisible) {
      Keyboard.dismiss();
    } else {
      // Validation : ne rien lancer (ni animation, ni masquage) si le numéro
      // n'est pas rempli → on affiche juste le toast d'erreur.
      const phone = localPhone.trim();
      if (!phone) {
        onError?.("Veuillez remplir le numéro de paiement");
        return;
      }
      try {
        setIsProcessing(true);
        // Masque input/cancel/payer et affiche "Veuillez patienter" + bordure
        // animée, le temps que le backend réponde (puis passe à ussd_sent).
        Keyboard.dismiss();
        setLocalPaymentState("waiting");
        await onConfirm(phone);
        // NE PAS fermer l'overlay — rester ouvert en état waiting/success/failed
        // Le parent gère la fermeture selon paymentState via le verdict socket
      } catch (error) {
        console.error("Payment confirmation error:", error);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  if (!mounted) return null;

  return (
    <Animated.View
      style={[
        styles.keyboardWrapper,
        {
          top: keyboardHeight.interpolate({
            inputRange: [0, 50],
            outputRange: ["99%", "0%"],
            extrapolate: "clamp",
          }),
        },
      ]}
    >
      <AnimatedBlurView
        intensity={keyboardHeight.interpolate({
          inputRange: [0, 100],
          outputRange: [0, 90],
          extrapolate: "clamp",
        })}
        tint="dark"
        style={[
          styles.blurOverlay,
          {
            height: keyboardHeight.interpolate({
              inputRange: [0, 100],
              outputRange: [0, SHEET_HEIGHT],
              extrapolate: "clamp",
            }),
          },
        ]}
      />

      <Animated.View
        style={[
          styles.container,
          {
            transform: [
              { translateY: slideAnim },
              {
                translateY: keyboardHeight.interpolate({
                  inputRange: [0, 100],
                  outputRange: [0, -100],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.payFooterCapsule}>
          <BlurView
            intensity={80}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />

          <AnimatedBorderGlow
            active={localPaymentState !== "input"}
            borderRadius={35}
            strokeWidth={3}
          />

          <Animated.View style={[styles.contentRow, { opacity: contentOpacity }]}>
          {/* État INPUT : saisie du numéro de téléphone */}
          {localPaymentState === "input" && (
            <>
              <View style={styles.actionRow}>
                {!isKeyboardVisible && (
                  <TouchableOpacity
                    style={styles.closeCircle}
                    onPress={handleAction}
                  >
                    <Ionicons name="close" size={16} color="white" />
                  </TouchableOpacity>
                )}
              </View>

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
                  value={localPhone}
                  onChangeText={setLocalPhone}
                  onFocus={() => setIsKeyboardVisible(true)}
                />
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[
                    styles.payerBtn,
                    isProcessing && styles.payerBtnDisabled,
                  ]}
                  onPress={handlePay}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader size={20} color="white" />
                  ) : (
                    <Ionicons
                      name={
                        isKeyboardVisible
                          ? "chevron-down"
                          : "arrow-forward-outline"
                      }
                      size={14}
                      color="white"
                    />
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* État WAITING : requête envoyée, en attente de la réponse backend */}
          {localPaymentState === "waiting" && (
            <View style={styles.waitingContent}>
              <Text style={styles.waitingText}>Veuillez patienter...</Text>
            </View>
          )}

          {/* État USSD_SENT : message renvoyé par le backend uniquement.
              L'attente est matérialisée par la bordure animée (pas de spinner). */}
          {localPaymentState === "ussd_sent" && (
            <View style={styles.ussdSentContent}>
              <Text style={styles.ussdSentText}>{ussdMessage}</Text>
            </View>
          )}

          {/* État SUCCESS : paiement réussi + création de commande en cours (5s) */}
          {localPaymentState === "success" && (
            <View style={styles.successContent}>
              <Text style={styles.successText}>
                Paiement réussi ! Création de la commande en cours...
              </Text>
            </View>
          )}

          {/* État SUCCESS_CREATED : commande créée avec succès (5s avant fermeture auto) */}
          {localPaymentState === "success_created" && (
            <View style={styles.successCreatedContent}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={styles.successCreatedText}>
                Commande créée avec succès !
              </Text>
            </View>
          )}
          </Animated.View>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  keyboardWrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  // Conteneur du contenu (reproduit le flex-row de la capsule) — animé en fondu.
  contentRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  blurOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: "hidden",
  },
  container: {
    flex: 1,
    paddingHorizontal: 8,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 2,
  },
  payFooterCapsule: {
    width: "100%",
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
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  payerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ec4913",
    // paddingHorizontal: 20,
    height: 40,
    borderRadius: 145,
    justifyContent: "center",
    minWidth: 40,
  },
  payerBtnDisabled: {
    backgroundColor: "#94a3b8",
  },
  payerBtnText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  closeCircle: {
    width: 40,
    height: 40,
    borderRadius: 40,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  networkSelector: {
    flexDirection: "row",
    gap: 8,
    marginRight: 8,
  },
  networkChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  networkChipActive: {
    backgroundColor: "#ec4913",
    borderColor: "#ec4913",
  },
  networkChipText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontWeight: "600",
  },
  networkChipTextActive: {
    color: "white",
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ec4913",
    height: 40,
    borderRadius: 145,
    justifyContent: "center",
    minWidth: 40,
  },
  ussdSentContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  ussdSentText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  ussdSentSubtext: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 16,
  },
  ussdWaitingLoader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  ussdWaitingText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
  },
  waitingContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  waitingText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 8,
  },
  boldText: {
    fontWeight: "bold",
  },
  waitingSubtext: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    textAlign: "center",
  },
  successContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
  },
  successText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  successSubtext: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    textAlign: "center",
  },
  successCreatedContent: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
  },
  successCreatedText: {
    color: "#10b981",
    fontSize: 14,
    fontWeight: "600",
  },
});
