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
/**
 * Hauteur d'un champ. Sert aussi de course de decalage : le champ inactif est
 * pousse d'exactement cette valeur, donc entierement hors du cadre.
 */
const FIELD_H = 45;
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
/** Fondu de sortie de la CAPSULE : plus rapide, elle part la premiere. */
const CAPSULE_FADE_OUT_MS = 0;
/** Fondu de sortie du VOILE : plus lent, il se retire apres la capsule. */
const VEIL_FADE_OUT_MS = 1000;
/** Retard du voile sur la capsule a la SORTIE. */
const VEIL_OUT_DELAY_MS = 0;
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
  /** Champ en cours de saisie : c'est lui qui prend le focus. */
  field: "email" | "password";
  email: string;
  password: string;
  onChangeEmail: (v: string) => void;
  onChangePassword: (v: string) => void;
  /** Fermeture : bouton rond, touche du clavier, ou perte de focus. */
  onClose: () => void;
}

export const AuthFieldCapsule: React.FC<AuthFieldCapsuleProps> = ({
  visible,
  field,
  email,
  password,
  onChangeEmail,
  onChangePassword,
  onClose,
}) => {
  const [mounted, setMounted] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  const isPwd = field === "password";

  // TRACE TEMPORAIRE — a retirer. Etat + ce que CHAQUE champ declare a iOS.
  console.log("[capsule] rendu", {
    field,
    email,
    password,
    haut: "username",
    bas: "password",
  });


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
    // SORTIE : la capsule part VITE, le voile se retire ensuite, plus
    // lentement. Deux durees distinctes — partager la meme les faisait
    // disparaitre d'un bloc.
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
   * FERMETURE PILOTEE PAR LE FOCUS, et DIFFEREE.
   *
   * ⚠️ Le sursis est essentiel : a la fin de l'AutoFill, iOS retire brievement
   * le focus au champ avant de le lui rendre. Fermer sur le champ un `onBlur`
   * refermait donc la capsule juste apres l'autoremplissage. Tout retour de
   * focus dans le delai annule la fermeture — celui du systeme comme celui de
   * la bascule email -> mot de passe.
   */
  const blurTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleBlur = React.useCallback(() => {
    console.log("[VISIBLE] blur"); // TRACE TEMPORAIRE
    if (!visible) return;
    blurTimer.current = setTimeout(onClose, BLUR_GRACE_MS);
  }, [visible, onClose]);

  const handleFocus = React.useCallback(() => {
    console.log("[VISIBLE] focus"); // TRACE TEMPORAIRE
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

  // ⚠️ La capsule NE se ferme PAS sur la descente du clavier : iOS le fait
  // descendre pour sa feuille « Mots de passe » alors que le champ garde le
  // focus. Elle reste donc simplement affichee pendant l'AutoFill — les
  // tentatives de la masquer (opacite, deplacement) rendaient son champ
  // inelligible a l'autoremplissage. Seul `onBlur` la ferme.

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
  const emailRef = React.useRef<TextInput>(null);
  const pwdRef = React.useRef<TextInput>(null);
  /** Le champ demande par l'appelant prend le focus ; l'autre reste saisissable. */
  const inputRef = isPwd ? pwdRef : emailRef;

  /**
   * Champ a focaliser, lu a CHAQUE rendu.
   *
   * ⚠️ Il etait auparavant memorise pendant que la capsule etait FERMEE. Or a
   * ce moment-la `field` vaut encore le champ PRECEDENT (l'appelant le garde
   * le temps du fondu de sortie) : on focalisait donc systematiquement le
   * mauvais des deux — le curseur allait au mot de passe alors qu'on ouvrait
   * l'email, et inversement. Une `ref` mise a jour a chaque rendu porte
   * toujours le champ courant, sans pour autant relancer l'effet.
   */
  const fieldRef = React.useRef(field);
  fieldRef.current = field;

  /**
   * Focus pris par le champ EMAIL.
   *
   * ⚠️ Detecte l'instant exact du flash : la capsule est ouverte sur le MOT DE
   * PASSE et iOS bascule sur l'email pour y ecrire l'identifiant. Ce transfert
   * de focus lui fait changer de clavier, puis revenir — c'est ce qu'on voyait
   * clignoter. On rend donc le focus au mot de passe sans attendre, ce qui
   * ecourte la bascule au maximum.
   *
   * Quand l'utilisateur a lui-meme ouvert la capsule sur l'email, `fieldRef`
   * vaut « email » et on ne touche a rien : c'est une saisie normale.
   */
  /**
   * `true` entre le clic sur « Passwords » et la fin de l'autoremplissage :
   * l'email a recu le focus VOLONTAIREMENT, on ne le lui reprend pas.
   */
  const prepping = React.useRef(false);

  const handleEmailFocus = React.useCallback(() => {
    handleFocus();
    // Focus prepare par nos soins (cf. « Passwords ») : on laisse l'email le
    // garder, c'est tout l'interet de la manoeuvre.
    if (prepping.current) return;
    if (fieldRef.current !== "password") return;
    console.log("[EMAIL] focus pris par iOS -> rendu au mdp"); // TRACE
    pwdRef.current?.focus();
  }, [handleFocus]);

  React.useEffect(() => {
    if (!visible) return;
    const id = setTimeout(() => {
      const wantsPwd = fieldRef.current === "password";

      // Le champ demande prend le focus, et lui seul. Plus de pre-focus de
      // l'email : c'est `handleEmailFocus` qui rattrape la bascule au moment
      // ou elle se produit reellement.
      (wantsPwd ? pwdRef : emailRef).current?.focus();
    }, FOCUS_DELAY_MS);
    return () => clearTimeout(id);
  }, [visible]);

  /**
   * DESCENTE DU CLAVIER = l'utilisateur vient de toucher « Passwords ».
   *
   * ⚠️ C'est le seul signal disponible AVANT que la liste des identifiants ne
   * s'ouvre. Le champ garde son focus, mais iOS fait descendre le clavier pour
   * afficher sa feuille : on tient la le bon moment pour preparer l'email.
   *
   * On lui donne le focus PENDANT que le clavier est en bas. Le changement de
   * clavier a donc lieu hors de vue, et quand iOS remonte pour ecrire
   * l'identifiant il n'a plus rien a reconstruire — c'est ce qu'on voyait
   * clignoter. `handleEmailFocus` ne rend PAS la main au mot de passe ici,
   * sans quoi on annulerait la preparation ; c'est a la fermeture de la
   * feuille que le focus revient naturellement.
   */
  React.useEffect(() => {
    // Annulation de la feuille sans choisir : le drapeau ne doit pas rester
    // leve d'une ouverture a l'autre.
    if (!visible) prepping.current = false;
  }, [visible]);

  React.useEffect(() => {
    if (!visible) return;
    const sub = Keyboard.addListener("keyboardDidHide", () => {
      if (fieldRef.current !== "password") return;
      console.log("[PASSWORDS] clavier descendu -> prepare l'email"); // TRACE
      prepping.current = true;
      emailRef.current?.focus();
    });
    return () => sub.remove();
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

  /**
   * Saisie recue — elle va simplement au champ ouvert.
   *
   * ⚠️ Plus de routage par la FORME de la valeur (« ca contient un @, donc
   * c'est l'email »). Il ne servait qu'a rattraper un couple arrivant sur un
   * seul champ monte ; le champ compagnon rendant le formulaire complet, iOS
   * remplit chaque champ directement et deviner n'a plus lieu d'etre.
   */
  const handleChange = React.useCallback(
    (v: string) => {
      // TRACE TEMPORAIRE — a retirer.
      console.log("[VISIBLE] recu", {
        champ: isPwd ? "password" : "email",
        v,
        len: v.length,
      });
      (isPwd ? onChangePassword : onChangeEmail)(v);
    },
    [isPwd, onChangeEmail, onChangePassword],
  );

  /**
   * Le bouton FERME toujours la capsule, sur l'un comme sur l'autre champ.
   *
   * ⚠️ Il ne fait plus AVANCER de l'email vers le mot de passe : la capsule se
   * referme, et c'est l'utilisateur qui rouvre celle qu'il veut depuis la
   * sheet. La requete, elle, part uniquement du bouton principal de la sheet.
   */
  const handleAction = () => {
    Keyboard.dismiss();
    onClose();
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

                {/* ⚠️ UN SEUL champ tombe dans le cadre a la fois : celui que
                    l'appelant a demande. L'autre est DECALE hors-cadre —
                    l'email vers le haut, le mot de passe vers le bas — et se
                    trouve rogne par l'`overflow` du conteneur.

                    On ne le masque SURTOUT PAS par `opacity` et on ne le
                    demonte pas : iOS ecarte de l'autoremplissage tout champ
                    qu'il ne « voit » pas, et celui-la cesserait d'etre rempli.
                    Il garde donc une taille et une opacite reelles ; c'est le
                    cadre qui le cache, pas lui.

                    Leurs roles restent FIXES (l'un toujours l'email, l'autre
                    toujours le mot de passe) : les permuter selon le champ
                    ouvert empechait iOS de reconnaitre le formulaire. */}
                <View style={styles.fieldStack}>
                  <TextInput
                    ref={emailRef}
                    style={[
                      styles.stackedInput,
                      // Inactif, l'email remonte au-dessus du cadre.
                      isPwd ? styles.fieldOffTop : styles.fieldActive,
                    ]}
                    placeholder={isPwd ? "" : "Adresse email"}
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    value={email}
                    onChangeText={(v) => {
                      console.log("[EMAIL] recu", { v, len: v.length }); // TRACE
                      onChangeEmail(v);
                      // Identifiant ecrit : la preparation a rempli son role,
                      // le mot de passe reprend le focus.
                      if (prepping.current) {
                        prepping.current = false;
                        pwdRef.current?.focus();
                      }
                    }}
                    /* ⚠️ MEME type de clavier que le champ mot de passe. Quand
                       l'autoremplissage sert les DEUX champs, iOS passe de
                       l'un a l'autre : avec `email-address` d'un cote et
                       `default` de l'autre, il reconstruit le clavier au
                       passage — c'est le flash, et il n'apparait justement
                       QUE lorsque les deux champs sont remplis d'un coup. Un
                       type commun supprime la bascule ; l'arobase reste
                       accessible au clavier par defaut. */
                    keyboardType="default"
                    autoCapitalize="none"
                    /* Aucune cible ici : l'identifiant est servi au leurre de
                       la sheet (verifie a la trace). Le viser aussi ferait une
                       seconde cible pour la meme donnee. */
                    autoComplete="off"
                    textContentType="none"
                    onFocus={handleEmailFocus}
                    onBlur={handleBlur}
                    returnKeyType="next"
                    onSubmitEditing={handleAction}
                    keyboardAppearance="dark"
                    selectionColor="#ec4913"
                    cursorColor="#ec4913"
                  />

                  <TextInput
                    ref={pwdRef}
                    style={[
                      styles.stackedInput,
                      // Inactif, le mot de passe descend sous le cadre.
                      isPwd ? styles.fieldActive : styles.fieldOffBottom,
                    ]}
                    placeholder={isPwd ? "Mot de passe" : ""}
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    value={password}
                    onChangeText={(v) => {
                      console.log("[MDP] recu", { v, len: v.length }); // TRACE
                      onChangePassword(v);
                    }}
                    secureTextEntry={!showPassword}
                    keyboardType="default"
                    autoCapitalize="none"
                    autoComplete="current-password"
                    textContentType="password"
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    returnKeyType="done"
                    onSubmitEditing={handleAction}
                    keyboardAppearance="dark"
                    /* Curseur explicite : la teinte systeme se voit a peine sur
                       le fond sombre de la capsule. */
                    selectionColor="#ec4913"
                    cursorColor="#ec4913"
                  />
                </View>

                {isPwd && password ? (
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
                  // L'icone suit ce que fait le bouton : fermer ou avancer.
                  // Le bouton ne fait que refermer : chevron bas dans les deux
                  // cas, y compris sur le champ email.
                  name="chevron-down"
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
  /**
   * Emplacement des deux champs. Seul celui qui est actif tombe dans le cadre ;
   * l'autre est pousse au-dessus ou en dessous et se trouve rogne.
   */
  fieldStack: { flex: 1, height: FIELD_H, overflow: "hidden" },
  stackedInput: {
    position: "absolute",
    left: 0,
    right: 0,
    height: FIELD_H,
    color: "white",
    fontSize: 14,
    fontWeight: "500",
    padding: 0,
  },
  /** Champ en cours de saisie : dans le cadre, au-dessus de l'autre. */
  fieldActive: { top: 0, zIndex: 2 },
  /**
   * Champ inactif : DECALE hors du cadre visible, au lieu d'etre superpose.
   *
   * ⚠️ Il garde une taille et une opacite REELLES — ni `opacity: 0` ni
   * demontage : iOS ecarte de l'autoremplissage tout champ qu'il ne « voit »
   * pas, et il cesserait alors d'etre rempli. C'est la capsule qui le masque,
   * par son `overflow: hidden`, et non le champ qui se cache lui-meme.
   */
  /**
   * Champ inactif : DECALE hors du cadre visible — l'email vers le haut, le
   * mot de passe vers le bas.
   *
   * ⚠️ Il garde une taille et une opacite REELLES : iOS ecarte de
   * l'autoremplissage tout champ qu'il ne « voit » pas. C'est le cadre qui le
   * masque (`overflow`), pas le champ qui se cache.
   */
  fieldOffTop: { top: -FIELD_H, zIndex: 1 },
  fieldOffBottom: { top: FIELD_H, zIndex: 1 },
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
