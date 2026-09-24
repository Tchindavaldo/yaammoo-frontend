import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Keyboard,
  KeyboardEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppBlurView as BlurView } from "@/src/components/AppBlurView";
import { useProfileNameSheet } from "../hooks/useProfileNameSheet";
import { MissingName } from "../utils/missingName";
import { TAB_BAR_INSET_RATIO } from "@/src/hooks/useTabBarHeight";
import { useAuth } from "@/src/features/auth/context/AuthContext";

const ACCENT = "#e8440a";
/** Marge entre la carte et le bas de l'ecran (ou le haut du clavier). */
const CARD_GAP = 24;
const CARD_GAP_KEYBOARD = 12;
/**
 * La carte doit toujours GARDER D'AVANCE sur le clavier, sinon il la
 * chevauche en fin de course (une courbe qui ralentit a la fin se fait
 * rattraper). Depart rapide (`out quad`) et arrivee a 75 % de la duree du
 * clavier : la carte est deja en place quand le clavier finit de monter.
 */
const KEYBOARD_ANIM_MS = 220;
const KEYBOARD_LEAD = 0.75;
const KEYBOARD_EASING = Easing.out(Easing.quad);
const TITLE = "Complétez vos informations";

/**
 * Carte flottante du home qui demande le prenom et/ou le nom manquant.
 *
 * Rendue par `app/(tabs)/_layout.tsx` au-dessus des onglets (tab bar
 * comprise), dans la meme fenetre : le flou voit donc tout l'ecran, ce
 * qu'une `Modal` empecherait sur Android. Le clavier natif fait monter la
 * carte (translation calculee, `edgeToEdgeEnabled` ne redimensionne pas
 * la fenetre).
 */
export function ProfileNameSheet() {
  const { visible, missing, saving, error, dismiss, submit } =
    useProfileNameSheet();
  const { userData } = useAuth();
  const insets = useSafeAreaInsets();
  // iOS : le home indicator n'a pas besoin de tout l'inset (meme ratio que la
  // tab bar) ; Android garde l'inset complet (barre de navigation).
  const cardBottom =
    Platform.OS === "ios"
      ? 8 + insets.bottom * TAB_BAR_INSET_RATIO
      : CARD_GAP + insets.bottom;

  const [mounted, setMounted] = useState(false);
  const [variant, setVariant] = useState<MissingName>("both");
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const nomRef = useRef<TextInput>(null);
  // Clavier ouvert : le bouton referme le clavier (chevron) au lieu de soumettre.
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(80)).current;
  const lift = useRef(new Animated.Value(0)).current;

  // Entree / sortie. La variante est figee a l'ouverture : elle ne doit pas
  // changer pendant la sortie, quand le profil vient d'etre complete.
  useEffect(() => {
    if (visible && missing) {
      setVariant(missing);
      // Toujours les deux champs : celui deja connu est pre-rempli.
      const infos = userData?.infos;
      setPrenom(missing === "nom" ? (infos?.prenom || "").trim() : "");
      setNom(missing === "prenom" ? (infos?.nom || "").trim() : "");
      setMounted(true);
      // Les listeners clavier tournent meme sheet fermee : un clavier ouvert
      // ailleurs (recherche du home) laissait `lift` decale et la carte
      // apparaissait au milieu de l'ecran. On repart toujours du bas.
      Keyboard.dismiss();
      lift.setValue(0);
      liftTarget.current = 0;
      setKeyboardOpen(false);
      Animated.parallel([
        Animated.timing(fade, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(slide, {
          toValue: 0,
          damping: 18,
          stiffness: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (mounted) {
      Keyboard.dismiss();
      Animated.parallel([
        Animated.timing(fade, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(slide, {
          toValue: 80,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(() => setMounted(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, missing]);

  /** Derniere hauteur de clavier connue : sert a anticiper la montee (Android). */
  const lastKbHeight = useRef(0);
  /** Position vers laquelle la carte est en train d'aller. */
  const liftTarget = useRef(0);
  const liftFor = (kb: number) => -(kb + CARD_GAP_KEYBOARD - cardBottom);
  /**
   * Anime la carte avec la courbe du clavier. iOS donne duree + courbe dans
   * `keyboardWillShow` : on les reprend pour bouger en meme temps que lui.
   */
  const moveLift = (
    to: number,
    duration = KEYBOARD_ANIM_MS,
    easing = KEYBOARD_EASING,
  ) => {
    liftTarget.current = to;
    Animated.timing(lift, {
      toValue: to,
      duration,
      easing,
      useNativeDriver: true,
    }).start();
  };

  /**
   * Android n'emet que `keyboardDidShow`, APRES l'animation du clavier : la
   * carte partait en retard. Des le focus, on monte avec la hauteur deja
   * connue ; `keyboardDidShow` ne fait ensuite que corriger.
   */
  const onInputFocus = () => {
    if (Platform.OS === "android" && lastKbHeight.current > 0) {
      moveLift(liftFor(lastKbHeight.current));
    }
  };

  /** Fermeture du clavier : la carte revient en bas d'un coup, sans animation. */
  const dropLift = () => {
    lift.stopAnimation();
    lift.setValue(0);
    liftTarget.current = 0;
  };

  const closeKeyboard = () => {
    dropLift();
    Keyboard.dismiss();
  };

  // Le clavier pousse la carte vers le haut.
  useEffect(() => {
    // N'ecoute le clavier que sheet affichee (sinon la recherche du home le decale).
    if (!mounted) return;
    const onShow = (e: KeyboardEvent) => {
      const kb = e.endCoordinates.height;
      setKeyboardOpen(true);
      const known = lastKbHeight.current === kb;
      lastKbHeight.current = kb;
      // Android : deja monte au focus avec la bonne hauteur, rien a refaire.
      if (Platform.OS === "android" && known) return;
      moveLift(
        liftFor(kb),
        e.duration ? e.duration * KEYBOARD_LEAD : KEYBOARD_ANIM_MS,
      );
    };
    const onHide = () => {
      setKeyboardOpen(false);
      dropLift();
    };

    const showEvt =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const s = Keyboard.addListener(showEvt, onShow);
    const h = Keyboard.addListener(hideEvt, onHide);
    return () => {
      s.remove();
      h.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, insets.bottom, lift]);

  if (!mounted) return null;

  const askPrenom = true;
  const askNom = true;
  const canSubmit = !saving && !!prenom.trim() && !!nom.trim();

  const onSubmit = () => {
    if (!canSubmit) return;
    submit({ prenom, nom });
  };

  const inputStyle = [styles.input, styles.inputHalf];

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.root, { opacity: fade }]}
    >
      <BlurView
        intensity={28}
        tint="dark"
        disableAndroidBlur
        style={StyleSheet.absoluteFill}
        fallbackStyle={styles.backdropFallback}
      />
      <View style={[StyleSheet.absoluteFill, styles.dim]} />
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={closeKeyboard}
        accessibilityLabel="Fermer le clavier"
      />

      <Animated.View
        style={[
          styles.card,
          { bottom: cardBottom },
          { transform: [{ translateY: slide }, { translateY: lift }] },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.iconBox}>
            <Ionicons name="person-outline" size={24} color={ACCENT} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>{TITLE}</Text>
            <Text style={styles.subtitle}>
              Pour que le restaurant et le livreur t&apos;identifient.
            </Text>
          </View>
          <TouchableOpacity
            onPress={dismiss}
            style={styles.close}
            accessibilityLabel="Fermer"
            hitSlop={8}
          >
            <Ionicons name="close" size={22} color="#6b635c" />
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          {askPrenom && (
            <TextInput
              value={prenom}
              onChangeText={setPrenom}
              placeholder="Prénom"
              placeholderTextColor="#a39a92"
              style={inputStyle}
              autoCapitalize="words"
              autoCorrect={false}
              textContentType="givenName"
              autoComplete="name-given"
              returnKeyType={askNom ? "next" : "done"}
              onSubmitEditing={
                askNom ? () => nomRef.current?.focus() : onSubmit
              }
              blurOnSubmit={!askNom}
              editable={!saving}
              onFocus={onInputFocus}
            />
          )}
          {askNom && (
            <TextInput
              ref={nomRef}
              value={nom}
              onChangeText={setNom}
              placeholder="Nom"
              placeholderTextColor="#a39a92"
              style={inputStyle}
              autoCapitalize="words"
              autoCorrect={false}
              textContentType="familyName"
              autoComplete="name-family"
              returnKeyType="done"
              onSubmitEditing={onSubmit}
              editable={!saving}
              onFocus={onInputFocus}
            />
          )}
          <TouchableOpacity
            onPress={keyboardOpen ? closeKeyboard : onSubmit}
            disabled={!keyboardOpen && !canSubmit}
            style={[
              styles.submit,
              !keyboardOpen && !canSubmit && !saving && styles.submitDisabled,
            ]}
            accessibilityLabel={keyboardOpen ? "Fermer le clavier" : "Valider"}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : keyboardOpen ? (
              <Ionicons name="chevron-down" size={22} color="#fff" />
            ) : (
              <Ionicons name="arrow-forward" size={22} color="#fff" />
            )}
          </TouchableOpacity>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 100, elevation: 100 },
  backdropFallback: { backgroundColor: "rgba(20,14,10,0.45)" },
  dim: { backgroundColor: "rgba(20,14,10,0.25)" },
  card: {
    position: "absolute",
    left: 12,
    right: 12,
    backgroundColor: "#fff",
    borderRadius: 26,
    paddingTop: 22,
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
  },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#fde6dc",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1, gap: 4 },
  title: { fontSize: 20, fontWeight: "700", color: "#1c1917" },
  subtitle: { fontSize: 14, lineHeight: 20, color: "#6b635c" },
  close: {
    width: 44,
    height: 44,
    marginTop: -8,
    marginRight: -8,
    alignItems: "center",
    justifyContent: "center",
  },
  row: { flexDirection: "row", gap: 8 },
  input: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#e2dbd3",
    backgroundColor: "#faf8f6",
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#1c1917",
  },
  inputHalf: { minWidth: 0, paddingHorizontal: 14 },
  submit: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  submitDisabled: { opacity: 0.45 },
  error: { fontSize: 13, color: "#b42318" },
});
