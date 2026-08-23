import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React from "react";
import {
  Animated,
  Easing,
  Keyboard,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { AUTH_SHEET_HEIGHT, AUTH_SHEET_PADDING_BOTTOM } from "../constants";

/**
 * Capsule flottante de saisie du flux email — COPIE DEDIEE de
 * `CartGroupedDetailCapsule` (R16 : on duplique, on ne partage pas).
 *
 * Meme workflow que l'etape paiement du panier groupe :
 * - dans la sheet, le champ visible n'est qu'un LEURRE, non editable ;
 * - le tap ouvre cette capsule, rendue HORS de la sheet, posee sur un voile
 *   floute et ancree au clavier ;
 * - elle porte le SEUL vrai `TextInput`, en `autoFocus` — c'est lui qui ouvre
 *   le clavier natif ;
 * - fermer le clavier referme la capsule (garde `kbWasVisible` oblige, sinon
 *   elle se refermerait avant meme que le clavier soit monte).
 *
 * Un SEUL champ a la fois : l'appelant ouvre la capsule sur « email » ou sur
 * « password ».
 */

/** Hauteur de la capsule (`styles.capsule`). */
const CAPSULE_HEIGHT = 70;
/** Respiration entre le haut du voile et la capsule. */
const VEIL_TOP_GAP = 10;
/**
 * Marge entre le haut du voile et la capsule : celle-ci ne colle pas au bord
 * superieur.
 */
const CAPSULE_TOP_INSET = 0;

// --- Durees d'animation, a REGLER a la main ---
// Volontairement des constantes, PAS une synchro sur la duree du clavier :
// on ajuste ces valeurs jusqu'a ce que le rendu convienne.

/** Fondu d'apparition du VOILE. */
const VEIL_FADE_IN_MS = 220;
/** Fondu d'apparition de la CAPSULE, jouee apres le voile. */
const CAPSULE_FADE_IN_MS = 220;
/**
 * Retard de la capsule sur le voile. A 0 les deux fondent ensemble ; augmente,
 * le voile s'installe d'abord et la capsule apparait dessus.
 */
const CAPSULE_DELAY_MS = 230;
/**
 * Distance dont la capsule DESCEND en apparaissant (px). Elle part au-dessus
 * de sa position et vient s'y poser. A 0, fondu seul.
 *
 * ⚠️ Sans risque de decalage : la capsule ne suit plus le clavier, cette
 * translation est purement decorative et jouee sur le driver natif.
 */
const CAPSULE_SLIDE_FROM = -28;
/** Fondu de sortie, volontairement LENT : la disparition doit se voir. */
const FADE_OUT_MS = 1000;
/**
 * Delai avant de donner le focus, donc avant que le clavier ne monte. C'est ce
 * qui laisse la capsule partir en PREMIER — a augmenter si le clavier devance
 * encore.
 */
const FOCUS_DELAY_MS = 230;
/**
 * Sursis entre la perte de focus et la fermeture. Laisse le temps a un
 * `focus()` interne (bascule email -> mot de passe) de reprendre la main sans
 * que la capsule se ferme au passage.
 */
const BLUR_GRACE_MS = 80;

interface AuthFieldCapsuleProps {
  /** Capsule demandee a l'ecran (le fondu de sortie la garde montee un temps). */
  visible: boolean;
  /** Champ en cours de saisie. */
  field: "email" | "password";
  value: string;
  onChange: (v: string) => void;
  /** Validation depuis la capsule (touche du clavier ou bouton rond). */
  onSubmit: () => void;
  /** Demande de fermeture (champ vide, ou perte de focus). */
  onClose: () => void;
}

export const AuthFieldCapsule: React.FC<AuthFieldCapsuleProps> = ({
  visible,
  field,
  value,
  onChange,
  onSubmit,
  onClose,
}) => {
  const [mounted, setMounted] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  const isPwd = field === "password";

  /**
   * DEUX valeurs distinctes, une par element : le voile fond d'abord, la
   * capsule apparait ensuite (`CAPSULE_DELAY_MS`). Chacune joue sur toute sa
   * duree — un seul `Animated.Value` decoupe en tranches donnait a chaque
   * element une fraction du temps, d'ou une apparition brusque.
   *
   * Aucune translation, aucun suivi du clavier : que des fondus.
   */
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
          // Opacite pure : le driver natif convient.
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
    // SORTIE : la capsule s'efface la premiere, le voile la suit.
    Animated.parallel([
      Animated.timing(capsuleAnim, {
        toValue: 0,
        duration: FADE_OUT_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(veilAnim, {
        toValue: 0,
        duration: FADE_OUT_MS,
        delay: CAPSULE_DELAY_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [visible, veilAnim, capsuleAnim]);

  /**
   * FERMETURE PILOTEE PAR LE FOCUS, et non par le clavier.
   *
   * ⚠️ Se fier a la disparition du clavier ne marche PAS sur iOS : le bouton
   * « Mots de passe » de la barre du clavier ouvre une feuille systeme qui le
   * fait descendre alors que le champ GARDE le focus. La capsule se fermait
   * donc en pleine selection, et l'AutoFill n'avait plus ou ecrire. Aucun
   * delai ne reglait ca — la feuille reste ouverte le temps que l'utilisateur
   * choisisse.
   *
   * `onBlur` ne se declenche pas pendant l'AutoFill : c'est le signal fiable.
   * Il est quand meme differe d'une frame, le temps qu'un `focus()` interne
   * (bascule email -> mot de passe) reprenne la main sans fermer la capsule.
   */
  const handleBlur = React.useCallback(() => {
    if (!visible) return;
    blurTimer.current = setTimeout(onClose, BLUR_GRACE_MS);
  }, [visible, onClose]);

  const blurTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleFocus = React.useCallback(() => {
    // Le champ reprend le focus : toute fermeture en attente est annulee.
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

  // Le mot de passe repart toujours masque d'une ouverture a l'autre.
  React.useEffect(() => {
    if (!visible) setShowPassword(false);
  }, [visible]);

  /**
   * FOCUS RETARDE, a la place d'`autoFocus`.
   *
   * ⚠️ `autoFocus` demande le clavier des le premier rendu du `TextInput`,
   * donc AVANT que l'animation d'entree ne demarre : le clavier montait
   * toujours en premier et la capsule le rattrapait. Ici on laisse la capsule
   * partir, puis on donne le focus — le clavier suit au lieu de precede.
   */
  const inputRef = React.useRef<TextInput>(null);
  React.useEffect(() => {
    if (!visible) return;
    const id = setTimeout(() => inputRef.current?.focus(), FOCUS_DELAY_MS);
    return () => clearTimeout(id);
  }, [visible]);

  /**
   * Capsule et voile fondent sur TOUTE la course de `anim`.
   *
   * ⚠️ Ils etaient etages (voile sur [0, 0.35], capsule sur [0.5, 1]) : chacun
   * ne disposait alors que d'une fraction de la duree, d'ou une apparition
   * brusque. L'etagement servait la sortie de l'original, ou la capsule devait
   * partir avant son voile ; ici l'ensemble est un simple fondu.
   */
  const capsuleOpacity = capsuleAnim;
  const veilOpacity = veilAnim;
  /**
   * Glissement d'accompagnement de la capsule : elle DESCEND depuis le haut en
   * se posant. Portee par la meme valeur que son fondu, donc parfaitement
   * synchrone.
   */
  const capsuleTranslateY = capsuleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [CAPSULE_SLIDE_FROM, 0],
  });

  /**
   * Hauteur du voile : FIXE, celle de la sheet moins une respiration en haut.
   *
   * ⚠️ Elle ne suit PLUS le clavier. Sa hauteur varie d'une ouverture a l'autre
   * (clavier installe, langue, barre de suggestions, emoji) et le voile
   * changeait donc de taille a chaque fois. Ici il fait toujours la meme,
   * exactement calee sur la sheet.
   */
  const VEIL_HEIGHT = AUTH_SHEET_HEIGHT;

  /**
   * Position de la capsule : FIXE, en HAUT du voile.
   *
   * ⚠️ Elle ne suit plus le clavier et ne se translate plus. C'est le clavier
   * qui commande sa propre montee — s'y caler laissait toujours un decalage,
   * quelles que soient les durees (teste a 0 ms : le decalage restait). Ici
   * capsule et voile ne font qu'APPARAITRE EN FONDU, deja en place : il n'y a
   * plus rien a synchroniser.
   */
  const capsuleBottom =
    VEIL_HEIGHT - CAPSULE_HEIGHT - VEIL_TOP_GAP - CAPSULE_TOP_INSET;

  /** Champ vide : le bouton ne valide pas, il FERME la capsule. */
  const isEmpty = !value.trim();

  const handleAction = () => {
    if (isEmpty) {
      // Fermeture par le clavier : le garde ci-dessus appelle `onClose`.
      Keyboard.dismiss();
      return;
    }
    onSubmit();
  };

  if (!mounted) return null;

  return (
    <Animated.View pointerEvents="box-none" style={styles.slot}>
      {/* Voile FLOUTE de la zone basse : du bas de l'ecran jusqu'au bord
          superieur de la capsule. Rendu AVANT elle, il passe donc dessous. */}
      <Animated.View
        pointerEvents="none"
        style={[styles.veil, { opacity: veilOpacity, height: VEIL_HEIGHT }]}
      >
        {/* ⚠️ `expo-blur` DIRECT, et non `AppBlurView` : celui-ci coupe le flou
            natif sous Android 12 (le chemin RenderScript crashe quand une
            LISTE defile derriere). Ici rien ne defile — la capsule est
            statique — on garde donc un vrai flou sur toutes les versions
            d'Android au lieu d'un aplat noir. */}
        <BlurView
          intensity={65}
          tint="dark"
          style={StyleSheet.absoluteFill}
          experimentalBlurMethod="dimezisBlurView"
        />
        {/* Teinte posee SUR le flou : l'intensite seule ne noircit pas assez. */}
        <View pointerEvents="none" style={styles.veilTint} />
      </Animated.View>

      {/* ⚠️ Conteneur BORNE a la hauteur du voile, en `overflow: hidden` : la
          capsule glisse a l'interieur et se trouve ROGNEE a son bord superieur.
          Sans lui (calque plein ecran), on la voyait deborder du voile pendant
          l'entree et la sortie — d'ou un chevauchement sur le contenu net. */}
      <View
        pointerEvents="box-none"
        style={[styles.capsuleClip, { height: VEIL_HEIGHT }]}
      >
        {/* Fondu + glissement depuis le haut, tous deux portes par
            `capsuleAnim`. La position finale est fixe (`capsuleBottom`), le
            glissement n'est qu'un accompagnement. */}
        <Animated.View
          pointerEvents="box-none"
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: capsuleOpacity,
              transform: [{ translateY: capsuleTranslateY }],
            },
          ]}
        >
          <View style={[styles.capsule, { bottom: capsuleBottom }]}>
            <BlurView
              intensity={80}
              tint="dark"
              style={StyleSheet.absoluteFill}
              experimentalBlurMethod="dimezisBlurView"
            />

            <View style={styles.inputRow}>
              <View style={styles.inputWrapper}>
                <Ionicons
                  name={isPwd ? "lock-closed-outline" : "mail-outline"}
                  size={16}
                  color="white"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  placeholder={isPwd ? "Mot de passe" : "Adresse email"}
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={value}
                  onChangeText={onChange}
                  secureTextEntry={isPwd && !showPassword}
                  keyboardType={isPwd ? "default" : "email-address"}
                  autoCapitalize="none"
                  autoComplete={isPwd ? "current-password" : "email"}
                  /* ⚠️ `autoComplete` seul ne suffit PAS sur iOS : c'est
                   `textContentType` qui branche l'AutoFill du trousseau. Sans
                   lui, la suggestion apparaissait mais ne remplissait rien. */
                  textContentType={isPwd ? "password" : "emailAddress"}
                  ref={inputRef}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  returnKeyType={isPwd ? "go" : "next"}
                  onSubmitEditing={handleAction}
                  keyboardAppearance="dark"
                  /* Curseur explicite : la teinte systeme se voit a peine sur le
                   fond sombre de la capsule. */
                  selectionColor="#ec4913"
                  cursorColor="#ec4913"
                />
                {isPwd && value ? (
                  <TouchableOpacity
                    onPress={() => setShowPassword((v) => !v)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={16}
                      color="rgba(255,255,255,0.7)"
                    />
                  </TouchableOpacity>
                ) : null}
              </View>

              <TouchableOpacity style={styles.actionBtn} onPress={handleAction}>
                <Ionicons
                  name={isEmpty ? "chevron-down" : "arrow-forward-outline"}
                  size={16}
                  color="white"
                />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  /**
   * Conteneur de la capsule, cale sur le voile et ROGNANT ce qui en sort : la
   * capsule glisse dedans sans jamais deborder sur le contenu net au-dessus.
   * Sa hauteur est posee en ligne (`VEIL_HEIGHT`).
   */
  capsuleClip: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
    // Memes coins que le voile : la capsule ne doit pas depasser des arrondis.
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  /**
   * Calque qui porte le voile et la capsule.
   *
   * ⚠️ `bottom` NEGATIF : la capsule est rendue dans le corps de la sheet, qui
   * porte une gouttiere basse (`AUTH_SHEET_PADDING_BOTTOM`). Sans ce
   * debordement, le voile s'arretait au-dessus d'elle — une bande blanche non
   * floutee restait en bas de la sheet.
   */
  slot: {
    ...StyleSheet.absoluteFillObject,
    bottom: -AUTH_SHEET_PADDING_BOTTOM,
  },
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
  inputRow: { flex: 1, flexDirection: "row", alignItems: "center" },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    height: 45,
    borderRadius: 22.5,
    paddingHorizontal: 12,
    marginRight: 10,
  },
  inputIcon: { marginRight: 0 },
  textInput: {
    flex: 1,
    color: "white",
    fontSize: 14,
    fontWeight: "500",
    padding: 0,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ec4913",
    height: 40,
    minWidth: 40,
    borderRadius: 20,
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
    // MEME rayon que la sheet (`AuthGateContext.styles.sheet`) : le voile la
    // couvre entierement, un rayon different se verrait aussitot.
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    // `overflow` : sans lui le flou deborde des coins arrondis sur Android.
    overflow: "hidden",
  },
  /** Teinte sombre posee sur le flou, qui seul ne noircit pas assez. */
  veilTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
});
