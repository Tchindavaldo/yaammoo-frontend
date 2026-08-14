import { AppBlurView as BlurView } from "@/src/components/AppBlurView";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ActivityIndicator } from "../../../components/CustomActivityIndicator";
import { AnimatedBorderGlow } from "../../checkout/components/AnimatedBorderGlow";
import type { CartPaymentState } from "../hooks/useCartPayment";
import { SHEET_HEIGHT } from "./CartPaymentSheet.styles";

/**
 * COPIE DEDIEE et AUTONOME de la capsule flottante du parcours groupe
 * (`CartPaymentOverlay` + son voile floute + ses animations d'entree/sortie,
 * jusqu'ici portes par `CartGroupedDeliverySheet`).
 *
 * R16 : on duplique, on ne partage pas. Ce fichier ne depend d'aucun style ni
 * d'aucune animation de l'original — il porte les siens, et peut donc evoluer
 * pour l'etape « Le detail de votre commande » sans toucher a l'etape 5.
 */

/** Hauteur de la capsule (`styles.capsule`). */
const CAPSULE_HEIGHT = 70;
/** Respiration entre le haut du voile et la capsule, qui y touchait. */
const VEIL_TOP_GAP = 10;
/**
 * Ecart entre la capsule et le haut du clavier. On n'ajoute PAS `insets.bottom`
 * ici : clavier ouvert, il couvre deja l'indicateur d'accueil.
 */
const CAPSULE_KEYBOARD_GAP = 8;
/** Marge sous la capsule quand le clavier est ferme. */
const CAPSULE_BOTTOM_OFFSET = 0;

interface CartGroupedDetailCapsuleProps {
  /** Capsule demandee a l'ecran (le fondu de sortie la garde montee un temps). */
  visible: boolean;
  phone: string;
  onPhoneChange: (phone: string) => void;
  onConfirm: (phone: string) => Promise<void>;
  paymentState: CartPaymentState;
  ussdMessage?: string | null;
  onError?: (error: string) => void;
  /** Hauteur du clavier : la capsule et son voile remontent avec lui. */
  keyboardHeight: Animated.Value | Animated.AnimatedInterpolation<number>;
  /** Translation du sheet hote, pour que la capsule le suive a l'ouverture. */
  translateY?: Animated.AnimatedInterpolation<number>;
}

export const CartGroupedDetailCapsule: React.FC<
  CartGroupedDetailCapsuleProps
> = ({
  visible,
  phone,
  onPhoneChange,
  onConfirm,
  paymentState,
  ussdMessage,
  onError,
  keyboardHeight,
  translateY,
}) => {
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  /** Fondu du contenu a chaque changement d'etape. */
  const contentOpacity = React.useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    contentOpacity.setValue(0);
    Animated.timing(contentOpacity, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [paymentState, contentOpacity]);

  /** Fondu d'ensemble (capsule + voile), etage a la sortie. */
  const anim = React.useRef(new Animated.Value(0)).current;
  /** Glissement d'ENTREE seul : la sortie reste un fondu sur place. */
  const enterAnim = React.useRef(new Animated.Value(0)).current;

  /**
   * Dernier etat REELLEMENT affiche : pendant le fondu de sortie,
   * `paymentState` est deja retombe et la capsule changeait de contenu en
   * pleine disparition.
   */
  const lastState = React.useRef<CartPaymentState>("input");
  React.useEffect(() => {
    if (visible) lastState.current = paymentState;
  }, [visible, paymentState]);

  /**
   * Hauteur clavier GELEE : le `bottom` suit `keyboardHeight`, la capsule
   * redescendait donc avec le clavier pendant son fondu. On cesse de suivre a
   * la sortie, la derniere valeur reste.
   */
  const veilKb = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    if (!visible) return;
    veilKb.setValue(0);
    const id = (keyboardHeight as Animated.Value).addListener(({ value }) => {
      veilKb.setValue(value);
    });
    return () => (keyboardHeight as Animated.Value).removeListener(id);
  }, [visible, keyboardHeight, veilKb]);

  React.useEffect(() => {
    if (visible) {
      setMounted(true);
      enterAnim.setValue(0);
      Animated.timing(enterAnim, {
        toValue: 1,
        duration: 260,
        useNativeDriver: false,
      }).start();
      Animated.timing(anim, {
        toValue: 1,
        duration: 160,
        // `useNativeDriver: false` OBLIGATOIRE : cette opacite cohabite avec
        // `height` / `bottom` calcules sur `keyboardHeight`, pilote en JS.
        useNativeDriver: false,
      }).start();
      return;
    }
    Animated.timing(anim, {
      toValue: 0,
      // Sortie DOUCE : le clavier natif descend vite, on etale le fondu.
      duration: 450,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [visible, anim, enterAnim]);

  // Sortie ETAGEE : la capsule s'efface en premier, le voile la suit.
  const capsuleOpacity = anim.interpolate({
    inputRange: [0.5, 1],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const veilOpacity = anim.interpolate({
    inputRange: [0, 0.5],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  /**
   * Hauteur brute du voile : celle d'avant, calee sur le clavier.
   */
  const veilRaw = Animated.add(
    veilKb,
    CAPSULE_BOTTOM_OFFSET + CAPSULE_KEYBOARD_GAP + CAPSULE_HEIGHT + VEIL_TOP_GAP,
  );
  /**
   * PLANCHER a la hauteur du sheet groupe : sous cette valeur, le voile se cale
   * sur le sheet au lieu de retomber au bas de l'ecran (clavier ferme). Au-dela,
   * il suit le clavier comme avant.
   */
  const veilFloored = veilRaw.interpolate({
    inputRange: [0, SHEET_HEIGHT, SHEET_HEIGHT + 1],
    outputRange: [SHEET_HEIGHT, SHEET_HEIGHT, SHEET_HEIGHT + 1],
    // Au-dela du seuil, la hauteur continue de suivre le clavier a l'identique.
    extrapolateRight: "extend",
    extrapolateLeft: "clamp",
  });
  /**
   * A l'ENTREE, le voile part du BAS comme la capsule : le plancher ne
   * s'installe qu'au fil de `enterAnim`. Sans cela il s'affichait d'emblee a
   * pleine hauteur pendant que la capsule montait encore.
   */
  const veilHeight = Animated.multiply(veilFloored, enterAnim);

  /** `bottom` d'ORIGINE de la capsule : posee juste au-dessus du clavier. */
  const capsuleBottom = Animated.add(
    veilKb,
    CAPSULE_BOTTOM_OFFSET + CAPSULE_KEYBOARD_GAP,
  );

  const shownState = visible ? paymentState : lastState.current;
  /** Saisie active : hors de ces etats, la ligne d'input est masquee sur place. */
  const isInput = shownState === "input" || shownState === "total";

  const handlePay = async () => {
    const p = phone.trim();
    if (!p) {
      onError?.("Veuillez remplir le numéro de paiement");
      return;
    }
    try {
      setIsProcessing(true);
      // Pas de `Keyboard.dismiss()` : le clavier reste ouvert pendant l'envoi,
      // la capsule ne redescend donc pas sous le doigt.
      await onConfirm(p);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!mounted) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.slot,
        translateY ? { transform: [{ translateY }] } : null,
      ]}
    >
      {/* Voile FLOUTE de la zone basse : du bas de l'ecran jusqu'au bord
          superieur de la capsule. Rendu AVANT elle, il passe donc dessous. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.veil,
          {
            opacity: veilOpacity,
            /**
             * Le voile SUIT le clavier comme avant, mais ne descend pas sous la
             * hauteur du sheet groupe : clavier ferme, il retombait tout en bas
             * de l'ecran. Le plancher le cale sur le sheet.
             */
            height: veilHeight,
          },
        ]}
      >
        <BlurView
          intensity={65}
          tint="dark"
          style={StyleSheet.absoluteFill}
          fallbackStyle={styles.veilFallback}
        />
        {/* Teinte posee SUR le flou : l'intensite seule ne noircit pas assez. */}
        <View pointerEvents="none" style={styles.veilTint} />
      </Animated.View>

      {/* Calque de fondu PROPRE a la capsule. */}
      <Animated.View
        pointerEvents="box-none"
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: capsuleOpacity,
            transform: [
              {
                translateY: enterAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [34, 0],
                }),
              },
            ],
          },
        ]}
      >
        {/* Capsule CENTREE verticalement dans le voile, qui suit toujours le
            clavier — elle se pose au milieu de la zone floutee. */}
        <Animated.View style={[styles.capsule, { bottom: capsuleBottom }]}>
          <BlurView
            intensity={80}
            tint="dark"
            style={StyleSheet.absoluteFill}
            fallbackStyle={styles.capsuleBlurFallback}
          />
          <AnimatedBorderGlow
            active={
              shownState === "waiting" ||
              shownState === "ussd_sent" ||
              shownState === "success" ||
              shownState === "success_created"
            }
            borderRadius={40}
            strokeWidth={3}
          />

          <Animated.View
            style={[styles.contentRow, { opacity: contentOpacity }]}
          >
            {/* INPUT : saisie du numero. Pas de croix : l'apparence
                « clavier ouvert » est l'etat par defaut ici.

                La ligne de saisie reste TOUJOURS MONTEE, meme pendant la
                transaction : la demonter defocalisait le champ, donc fermait le
                clavier et faisait redescendre la capsule au moment precis ou
                l'on veut voir l'animation et les messages. Elle est seulement
                masquee (opacite 0, hors des taps) et les messages se posent
                par-dessus. */}
            <View
              style={[
                styles.inputRow,
                !isInput && styles.inputRowHidden,
              ]}
              pointerEvents={isInput ? "auto" : "none"}
            >
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
                    /* Curseur explicite : la teinte systeme se voyait a peine
                       sur le fond sombre de la capsule. */
                    selectionColor="#ec4913"
                    cursorColor="#ec4913"
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
                      name="arrow-forward-outline"
                      size={16}
                      color="white"
                    />
                  )}
                </TouchableOpacity>
            </View>

            {shownState === "waiting" && (
              <View pointerEvents="none" style={styles.overlayText}>
                <Text style={styles.centerText}>Veuillez patienter...</Text>
              </View>
            )}

            {/* USSD_SENT : message backend uniquement. */}
            {shownState === "ussd_sent" && (
              <View pointerEvents="none" style={styles.overlayText}>
                <Text style={styles.centerText} numberOfLines={2}>
                  {ussdMessage}
                </Text>
              </View>
            )}

            {shownState === "success" && (
              <View pointerEvents="none" style={styles.overlayText}>
                <Text style={styles.centerText}>
                  Paiement réussi ! Création de la commande en cours...
                </Text>
              </View>
            )}

            {shownState === "success_created" && (
              <View style={[styles.iconTextRow, styles.overlayText]}>
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                <Text style={[styles.iconTextLabel, { color: "#10b981" }]}>
                  Commande créée avec succès !
                </Text>
              </View>
            )}
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  /** Calque plein ecran qui porte le voile et la capsule. */
  slot: { ...StyleSheet.absoluteFillObject },
  capsule: {
    position: "absolute",
    left: "2%",
    width: "96%",
    height: CAPSULE_HEIGHT,
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
  },
  /** Android < 12 : pas de flou natif, on opacifie pour rester lisible. */
  capsuleBlurFallback: { backgroundColor: "rgba(17,17,17,0.96)" },
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
  iconTextLabel: { fontSize: 13, fontWeight: "600" },
  /** Ligne de saisie : toujours montee, elle occupe toute la capsule. */
  inputRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  /**
   * Transaction en cours : la ligne s'efface SANS se demonter — le champ garde
   * le focus, donc le clavier reste ouvert et la capsule ne redescend pas.
   */
  inputRowHidden: { opacity: 0 },
  /** Message pose PAR-DESSUS la ligne de saisie masquee, centre dans la pilule. */
  overlayText: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
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
  inputIcon: { marginRight: 8 },
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
  /**
   * Voile pose SOUS la capsule : il part du bas de l'ecran et monte jusqu'a son
   * bord superieur, couvrant la zone du clavier.
   */
  veil: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    // MEME radius que le sheet groupe (`CartPaymentSheet.styles.sheet`) : le
    // voile s'arretant a sa hauteur, un rayon different se voyait aussitot.
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    // `overflow` : sans lui le flou deborde des coins arrondis sur Android.
    overflow: "hidden",
  },
  /** Android < 12 : sans flou natif, le voile se rabat sur un fond sombre. */
  veilFallback: { backgroundColor: "rgba(0,0,0,0.72)" },
  /** Teinte sombre posee sur le flou, qui seul ne noircit pas assez. */
  veilTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
});
