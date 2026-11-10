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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DS } from "@/src/theme/ds";
import { t, useLanguage } from "@/src/i18n";
import { groupThousands } from "../../services/walletNetwork";

/**
 * Capsule flottante de saisie du MONTANT de retrait — COPIE DEDIEE de
 * `AuthFieldCapsule` (flux email de l'auth, R16 : on duplique).
 *
 * Meme workflow « double input » :
 * - dans le pied de la feuille, le montant n'est qu'un LEURRE non editable ;
 * - le tap ouvre cette capsule, posee sur un voile floute, en haut du voile ;
 * - le voile a la hauteur de la FEUILLE (comme celui de l'auth, cale sur sa
 *   sheet). Si le pave numerique la depasse, il monte juste au-dessus :
 *   clavier, une respiration, la capsule, rien de plus. Cette hauteur est la
 *   FINALE des l'ouverture (mesure du pave gardee sur le telephone ; la toute
 *   premiere fois, l'entree attend le clavier) ;
 * - elle porte le SEUL vrai `TextInput`, focalise APRES l'entree (le clavier
 *   suit la capsule au lieu de la preceder) ;
 * - la perte de focus la referme, avec un sursis ; la valeur saisie retombe
 *   dans le leurre.
 * Memes durees d'animation que l'original.
 */

/**
 * Hauteur du calque du voile : il fait tout l'ecran et descend, par
 * translation (driver natif), pour n'en montrer que le haut voulu.
 */
const { height: SCREEN_H } = Dimensions.get("window");
/** Hauteur de la capsule (`styles.capsule`). */
const CAPSULE_HEIGHT = 70;
/** Respiration entre le haut du voile et la capsule. */
const VEIL_TOP_GAP = 10;
/** Respiration entre le haut du clavier et la capsule. */
const KEYBOARD_GAP = 10;
/** Ajustement du voile sur le clavier, a defaut de la duree fournie par iOS. */
const VEIL_FIT_MS = 250;

/**
 * Premiere ouverture SANS mesure connue : on attend le clavier au plus ce
 * temps, puis on affiche a la hauteur de la feuille.
 */
const MEASURE_TIMEOUT_MS = 700;

/**
 * Haut du pave numerique (px depuis le bas de l'ecran). Le voile doit etre a
 * sa hauteur FINALE des l'ouverture, donc AVANT que le clavier ne monte : la
 * mesure est gardee sur le telephone et relue des le chargement du module
 * (bien avant le premier tap). Le pave numerique ne change pas de hauteur (ni
 * suggestions ni langue).
 */
const KEYBOARD_TOP_KEY = "withdraw.numpadTop";
let lastKeyboardTop: number | null = null;
AsyncStorage.getItem(KEYBOARD_TOP_KEY)
  .then((v) => {
    const n = Number(v);
    if (lastKeyboardTop == null && n > 0) lastKeyboardTop = n;
  })
  .catch(() => {});

function rememberKeyboardTop(top: number) {
  if (top === lastKeyboardTop) return;
  lastKeyboardTop = top;
  AsyncStorage.setItem(KEYBOARD_TOP_KEY, String(top)).catch(() => {});
}

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
  /** Hauteur de la feuille hote, bande safe-area comprise : hauteur minimale du voile. */
  sheetHeight: number;
}

export const WithdrawAmountCapsule: React.FC<WithdrawAmountCapsuleProps> = ({
  visible,
  value,
  onChange,
  maxLabel,
  onClose,
  sheetHeight,
}) => {
  useLanguage();
  const [mounted, setMounted] = React.useState(false);
  /**
   * ANDROID : `keyboardDidShow` mesure le clavier SANS la barre de navigation,
   * alors que le `Modal` couvre tout l'ecran (cf. `CartGroupedDetailCapsule`).
   */
  const insets = useSafeAreaInsets();
  const navBarGap = Platform.OS === "android" ? insets.bottom : 0;
  const veilAnim = React.useRef(new Animated.Value(0)).current;
  const capsuleAnim = React.useRef(new Animated.Value(0)).current;

  /** Hauteur du voile : la feuille, ou juste ce qu'il faut au-dessus du clavier. */
  const fitHeight = React.useCallback(
    (keyboardTop: number | null) =>
      Math.max(
        sheetHeight,
        keyboardTop ? keyboardTop + KEYBOARD_GAP + CAPSULE_HEIGHT + VEIL_TOP_GAP : 0,
      ),
    [sheetHeight],
  );
  /** Descente du calque plein ecran : `SCREEN_H - hauteur visible du voile`. */
  const veilShift = React.useRef(new Animated.Value(SCREEN_H - sheetHeight)).current;

  /** Entree : voile puis capsule, a la hauteur deja posee dans `veilShift`. */
  const playEnter = React.useCallback(() => {
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
  }, [veilAnim, capsuleAnim]);

  /**
   * Mesure en attente (aucune hauteur connue) : l'entree est retenue jusqu'au
   * clavier, pour ne jamais afficher une hauteur provisoire puis l'agrandir.
   */
  const measuring = React.useRef(false);
  const measureTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopMeasure = React.useCallback(() => {
    measuring.current = false;
    if (measureTimer.current) clearTimeout(measureTimer.current);
    measureTimer.current = null;
  }, []);

  React.useEffect(() => {
    if (!visible) return;
    const evt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const sub = Keyboard.addListener(evt, (e) => {
      const height = e.endCoordinates?.height ?? 0;
      if (height <= 0) return;
      const top = height + navBarGap;
      rememberKeyboardTop(top);
      if (measuring.current) {
        // Premiere mesure : hauteur finale posee, PUIS l'entree.
        stopMeasure();
        veilShift.setValue(SCREEN_H - fitHeight(top));
        playEnter();
        return;
      }
      // Hauteur deja connue : ne bouge que si le clavier a change.
      Animated.timing(veilShift, {
        toValue: SCREEN_H - fitHeight(top),
        duration: Platform.OS === "ios" && e.duration ? e.duration : VEIL_FIT_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    });
    return () => sub.remove();
  }, [visible, navBarGap, fitHeight, veilShift, playEnter, stopMeasure]);

  React.useEffect(() => {
    if (visible) {
      setMounted(true);
      if (lastKeyboardTop != null) {
        // Hauteur connue : posee avant le fondu, c'est la hauteur finale.
        veilShift.setValue(SCREEN_H - fitHeight(lastKeyboardTop));
        playEnter();
        return;
      }
      // Jamais mesuree (premiere ouverture sur ce telephone) : on attend le
      // clavier ; a defaut, hauteur de la feuille.
      measuring.current = true;
      measureTimer.current = setTimeout(() => {
        if (!measuring.current) return;
        stopMeasure();
        veilShift.setValue(SCREEN_H - fitHeight(null));
        playEnter();
      }, MEASURE_TIMEOUT_MS);
      return;
    }
    stopMeasure();
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
  }, [visible, veilAnim, capsuleAnim, veilShift, fitHeight, playEnter, stopMeasure]);

  React.useEffect(() => stopMeasure, [stopMeasure]);

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

  /**
   * FOCUS RETARDE, a la place d'`autoFocus` : la capsule part avant le clavier.
   * En mesure (premiere ouverture), focus IMMEDIAT : c'est le clavier qui donne
   * la hauteur, l'entree attend sa mesure. Attend le montage du champ.
   */
  const inputRef = React.useRef<TextInput>(null);
  React.useEffect(() => {
    if (!visible || !mounted) return;
    const delay = measuring.current ? 0 : FOCUS_DELAY_MS;
    const id = setTimeout(() => inputRef.current?.focus(), delay);
    return () => clearTimeout(id);
  }, [visible, mounted]);

  /** Le bouton FERME toujours la capsule ; l'etape avance depuis le pied. */
  const handleAction = () => {
    Keyboard.dismiss();
    onClose();
  };

  if (!mounted) return null;

  const capsuleTranslateY = capsuleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [CAPSULE_SLIDE_FROM, 0],
  });

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {/* Voile FLOUTE, rendu AVANT la capsule : il passe dessous. */}
      <Animated.View
        pointerEvents="none"
        style={[styles.veil, { opacity: veilAnim, transform: [{ translateY: veilShift }] }]}
      >
        {/* Android : floute la feuille (`BlurTarget` de `WithdrawSheet`). */}
        <BlurView forceAndroidBlur intensity={65} tint="dark" style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={styles.veilTint} />
      </Animated.View>

      {/* Conteneur BORNE au voile (meme descente), en `overflow: hidden` : la
          capsule glisse dedans sans deborder sur le contenu net au-dessus. */}
      <Animated.View
        pointerEvents="box-none"
        style={[styles.capsuleClip, { transform: [{ translateY: veilShift }] }]}
      >
        <Animated.View
          pointerEvents="box-none"
          style={[
            StyleSheet.absoluteFill,
            { opacity: capsuleAnim, transform: [{ translateY: capsuleTranslateY }] },
          ]}
        >
          {/* En HAUT du voile, il suit sa hauteur. */}
          <View style={[styles.capsule, { top: VEIL_TOP_GAP }]}>
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
                  // Pas de `returnKeyType` : sur iOS il ajoute une barre « Done »
                  // au-dessus du pave numerique. La capsule se ferme par son bouton.
                  keyboardType="number-pad"
                  onFocus={handleFocus}
                  onBlur={handleBlur}
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
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  capsuleClip: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: SCREEN_H,
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
    height: SCREEN_H,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: "hidden",
  },
  veilTint: { ...StyleSheet.absoluteFill, backgroundColor: DS.veilTint },
});
