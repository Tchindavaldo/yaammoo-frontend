"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import { Ionicons } from "@expo/vector-icons";
import { AppBlurView as BlurView } from "@/src/components/AppBlurView";
import React from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useBottomSafeArea } from "@/src/hooks/usePageBottomInset";
import { DS } from "@/src/theme/ds";
import { t, useLanguage } from "@/src/i18n";
import { groupThousands } from "../../services/walletNetwork";

/**
 * Capsule flottante de saisie du MONTANT de retrait — COPIE DEDIEE de
 * `AuthFieldCapsule` (flux email de l'auth, R16 : on duplique).
 *
 * Meme workflow « double input » :
 * - dans le pied de la feuille, le montant n'est qu'un LEURRE non editable ;
 * - le tap ouvre cette capsule, posee sur un voile floute, a position FIXE en
 *   haut du voile (elle ne suit pas le clavier) ;
 * - elle porte le SEUL vrai `TextInput`, focalise APRES l'entree (le clavier
 *   suit la capsule au lieu de la preceder) ;
 * - la perte de focus la referme, avec un sursis ; la valeur saisie retombe
 *   dans le leurre.
 * Memes durees d'animation que l'original.
 */

const { height: SCREEN_H } = Dimensions.get("window");

/**
 * Hauteur du voile, HORS bande safe-area : celle de la sheet d'auth
 * (`AUTH_SHEET_HEIGHT`, recopiee ici). La feuille de retrait est plus basse que
 * le clavier : un voile cale sur elle laisserait la capsule SOUS le clavier.
 * A cette hauteur la capsule est toujours au-dessus, comme dans l'auth.
 */
const VEIL_BASE_HEIGHT = SCREEN_H * (Platform.OS === "android" ? 0.59 : 0.57);
/** Hauteur de la capsule (`styles.capsule`). */
const CAPSULE_HEIGHT = 70;
/** Respiration entre le haut du voile et la capsule. */
const VEIL_TOP_GAP = 10;

// --- Durees d'animation : celles d'`AuthFieldCapsule` ---
const VEIL_FADE_IN_MS = 220;
const CAPSULE_FADE_IN_MS = 220;
const CAPSULE_DELAY_MS = 230;
const CAPSULE_SLIDE_FROM = -28;
const CAPSULE_FADE_OUT_MS = 0;
const VEIL_FADE_OUT_MS = 1000;
const VEIL_OUT_DELAY_MS = 0;
const FOCUS_DELAY_MS = 230;
const BLUR_GRACE_MS = 80;

interface WithdrawAmountCapsuleProps {
  /** Capsule demandee a l'ecran (le fondu de sortie la garde montee un temps). */
  visible: boolean;
  /** Montant, chiffres seuls. */
  value: string;
  onChange: (digits: string) => void;
  /** Pastille « max … » a droite du champ. */
  maxLabel: string;
  /** Fermeture : bouton rond ou perte de focus. */
  onClose: () => void;
}

export const WithdrawAmountCapsule: React.FC<WithdrawAmountCapsuleProps> = ({
  visible,
  value,
  onChange,
  maxLabel,
  onClose,
}) => {
  useLanguage();
  const [mounted, setMounted] = React.useState(false);
  // Le voile descend jusqu'au bord de l'ecran : bande safe-area incluse (R19).
  const band = useBottomSafeArea();
  const veilAnim = React.useRef(new Animated.Value(0)).current;
  const capsuleAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(veilAnim, {
          toValue: 1,
          duration: VEIL_FADE_IN_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(capsuleAnim, {
          toValue: 1,
          duration: CAPSULE_FADE_IN_MS,
          delay: CAPSULE_DELAY_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }
    // SORTIE : la capsule part vite, le voile se retire ensuite, plus lentement.
    Animated.parallel([
      Animated.timing(capsuleAnim, {
        toValue: 0,
        duration: CAPSULE_FADE_OUT_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(veilAnim, {
        toValue: 0,
        duration: VEIL_FADE_OUT_MS,
        delay: VEIL_OUT_DELAY_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [visible, veilAnim, capsuleAnim]);

  /**
   * FERMETURE PILOTEE PAR LE FOCUS, et DIFFEREE : tout retour de focus dans le
   * sursis annule la fermeture (meme regle que l'auth).
   */
  const blurTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleBlur = React.useCallback(() => {
    if (!visible) return;
    blurTimer.current = setTimeout(onClose, BLUR_GRACE_MS);
  }, [visible, onClose]);

  const handleFocus = React.useCallback(() => {
    if (blurTimer.current) {
      clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
  }, []);

  React.useEffect(
    () => () => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
    },
    [],
  );

  /** FOCUS RETARDE, a la place d'`autoFocus` : la capsule part avant le clavier. */
  const inputRef = React.useRef<TextInput>(null);
  React.useEffect(() => {
    if (!visible) return;
    const id = setTimeout(() => inputRef.current?.focus(), FOCUS_DELAY_MS);
    return () => clearTimeout(id);
  }, [visible]);

  /** Le bouton FERME toujours la capsule ; l'etape avance depuis le pied. */
  const handleAction = () => {
    Keyboard.dismiss();
    onClose();
  };

  if (!mounted) return null;

  const VEIL_HEIGHT = VEIL_BASE_HEIGHT + band;
  // Position FIXE, en haut du voile : rien a synchroniser avec le clavier.
  const capsuleBottom = VEIL_HEIGHT - CAPSULE_HEIGHT - VEIL_TOP_GAP;
  const capsuleTranslateY = capsuleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [CAPSULE_SLIDE_FROM, 0],
  });

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {/* Voile FLOUTE, rendu AVANT la capsule : il passe dessous. */}
      <Animated.View
        pointerEvents="none"
        style={[styles.veil, { opacity: veilAnim, height: VEIL_HEIGHT }]}
      >
        {/* Android : floute la feuille (`BlurTarget` de `WithdrawSheet`). */}
        <BlurView forceAndroidBlur intensity={65} tint="dark" style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={styles.veilTint} />
      </Animated.View>

      {/* Conteneur BORNE au voile, en `overflow: hidden` : la capsule glisse
          dedans sans deborder sur le contenu net au-dessus. */}
      <View pointerEvents="box-none" style={[styles.capsuleClip, { height: VEIL_HEIGHT }]}>
        <Animated.View
          pointerEvents="box-none"
          style={[
            StyleSheet.absoluteFill,
            { opacity: capsuleAnim, transform: [{ translateY: capsuleTranslateY }] },
          ]}
        >
          <View style={[styles.capsule, { bottom: capsuleBottom }]}>
            <BlurView forceAndroidBlur intensity={80} tint="dark" style={StyleSheet.absoluteFill} />

            <View style={styles.inputRow}>
              <View style={styles.inputWrapper}>
                <Ionicons name="wallet-outline" size={16} color={DS.onInk} />
                <TextInput
                  ref={inputRef}
                  style={styles.input}
                  placeholder={t("Montant à retirer")}
                  placeholderTextColor={DS.onInkFaint}
                  // Affiche groupe par milliers, stocke en chiffres seuls.
                  value={value ? groupThousands(value) : ""}
                  onChangeText={(v) => onChange(v.replace(/\D/g, "").replace(/^0+/, ""))}
                  keyboardType="number-pad"
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  returnKeyType="done"
                  onSubmitEditing={handleAction}
                  keyboardAppearance="dark"
                  selectionColor={DS.accent}
                  cursorColor={DS.accent}
                />
                <Text style={styles.maxChip}>{maxLabel}</Text>
              </View>

              <TouchableOpacity style={styles.actionBtn} onPress={handleAction}>
                <Ionicons name="chevron-down" size={16} color={DS.onInk} />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  capsuleClip: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  capsule: {
    position: "absolute",
    left: "2%",
    width: "96%",
    height: CAPSULE_HEIGHT,
    backgroundColor: DS.inkGlass,
    borderRadius: 80,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    overflow: "hidden",
    shadowColor: DS.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 1000,
  },
  inputRow: { flex: 1, flexDirection: "row", alignItems: "center" },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: DS.onInkFill,
    height: 45,
    borderRadius: 22.5,
    paddingLeft: 12,
    paddingRight: 6,
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 45,
    padding: 0,
    color: DS.onInk,
    fontSize: 15,
    fontWeight: "bold",
  },
  maxChip: {
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    backgroundColor: DS.onInkFill,
    fontSize: 10.5,
    fontWeight: "bold",
    color: DS.onInk,
  },
  actionBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DS.accent,
    height: 40,
    minWidth: 40,
    borderRadius: 20,
  },
  veil: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: "hidden",
  },
  veilTint: { ...StyleSheet.absoluteFill, backgroundColor: DS.veilTint },
});
