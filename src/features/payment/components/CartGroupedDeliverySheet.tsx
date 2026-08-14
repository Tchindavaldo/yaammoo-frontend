import { AppBlurView } from "@/src/components/AppBlurView";
import type { CartZoneGroup } from "@/src/features/orders/utils/groupCartOrders";
import { Livraison } from "@/src/types";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { CartPaymentState } from "../hooks/useCartPayment";
import { useGroupedDeliveryData } from "../hooks/useGroupedDeliveryData";
import {
  CartGroupedDeliveryOverlays,
  type GroupedDeliveryOverlay,
} from "./CartGroupedDeliveryOverlays";
import {
  CAPSULE_BOTTOM_OFFSET,
  styles,
} from "./CartGroupedDeliverySheet.styles";
import { CartGroupedPaymentBody } from "./CartGroupedPaymentBody";
import { CartPaymentOverlay } from "./CartPaymentOverlay";
import { C, styles as sheetStyles } from "./CartPaymentSheet.styles";

/** Hauteur de la capsule flottante (`CartPaymentOverlay.styles.capsule`). */
const CAPSULE_HEIGHT = 70;
/** Respiration entre le haut du voile et la capsule, qui y touchait. */
const VEIL_TOP_GAP = 10;
/**
 * Ecart entre la capsule et le haut du clavier. On n'ajoute PAS `insets.bottom`
 * ici : clavier ouvert, il couvre deja l'indicateur d'accueil, et l'inset
 * repoussait la capsule d'une trentaine de pixels pour rien.
 */
const CAPSULE_KEYBOARD_GAP = 8;

interface CartGroupedDeliverySheetProps {
  visible: boolean;
  /** Groupes du lot : alimentent l'étape de choix du groupage. */
  groups: CartZoneGroup[];
  /** Livraisons séparées : retour au panier, chaque zone garde son bouton. */
  onSplit: () => void;
  /**
   * Boutique de référence pour les zones express et les créneaux : celle des
   * commandes groupées. Les livraisons groupées partent d'un même point.
   */
  fastFoodId?: string;
  /**
   * Livraison commune validée : appliquée à toutes les commandes du lot.
   * Le sheet passe alors à SON TROISIÈME calque (paiement) — il ne se ferme
   * plus, les trois étapes vivant dans un seul `Modal`.
   */
  onValidate: (delivery: Livraison) => void;

  // --- Étape 3 : paiement (mêmes props que `CartPaymentSheet`) ---
  // Pas de `totalAmount` : le montant se DEDUIT du lot (articles + la course
  // unique), le total du panier compterait une course par zone.
  phone: string;
  onPhoneChange: (phone: string) => void;
  network: "orange" | "mtn";
  onNetworkChange: (network: "orange" | "mtn") => void;
  paymentState: CartPaymentState;
  setPaymentState: (s: CartPaymentState) => void;
  ussdMessage?: string | null;
  onConfirm: (phone: string) => Promise<void>;
  /** Hauteur du clavier : la capsule du bas remonte avec lui. */
  keyboardHeight: Animated.Value | Animated.AnimatedInterpolation<number>;
  isKeyboardVisible: boolean;
  onClose: () => void;
  onError?: (message: string) => void;
}

/**
 * Bottom sheet du parcours de commande GROUPÉ — ouvert par « commander » quand
 * le panier porte plusieurs courses.
 *
 * Il tient SES TROIS ÉTAPES en calques superposés dans un seul `Modal` :
 * 1. groupage (`CartGroupingStep`, écran 02 du design) ;
 * 2. livraison commune — la section delivery du sheet de commande réutilisée
 *    telle quelle (`DeliveryTab` + ses cinq overlays) ;
 * 3. paiement (`CartPaymentBody` + la capsule `CartPaymentOverlay`), le même
 *    corps que le sheet de paiement autonome.
 *
 * Les trois calques sont montés d'emblée : le passage de l'un à l'autre n'est
 * qu'un fondu croisé sur du contenu déjà peint. Enchaîner des `Modal` coûtait
 * une animation de fermeture complète, faisait clignoter l'étape suivante, et
 * présenter le second pendant la sortie du premier échouait silencieusement.
 *
 * `deliveryHours` / `orderLeadTime` / `deliveryOffer` viennent de
 * `useGroupedDeliveryData`, comme `CartCheckoutSheet` les charge pour une
 * commande individuelle.
 */
export const CartGroupedDeliverySheet: React.FC<
  CartGroupedDeliverySheetProps
> = ({
  visible,
  groups,
  fastFoodId,
  onSplit,
  onValidate,
  onClose,
  onError,
  phone,
  onPhoneChange,
  network,
  onNetworkChange,
  paymentState,
  setPaymentState,
  ussdMessage,
  onConfirm,
  keyboardHeight,
  isKeyboardVisible,
}) => {
  const insets = useSafeAreaInsets();
  const anim = React.useRef(new Animated.Value(0)).current;
  // Reste monté le temps de l'animation de sortie.
  const [mounted, setMounted] = React.useState(visible);

  // Livraison commune en cours de composition. Express par défaut, comme le
  // choix « tout livrer ensemble » le suggère (un seul livreur, tout de suite).
  const [delivery, setDelivery] = React.useState<Livraison>(
    () => new Livraison(true, 0, "express"),
  );

  /**
   * Paiement lance : on remonte d'abord la livraison commune au panier (qui la
   * pousse dans les commandes et arme le paiement), puis on declenche la
   * transaction. La page etant unique, les deux se font au meme clic.
   */
  const handleConfirm = React.useCallback(
    (payPhone: string) => {
      onValidate(delivery);
      return onConfirm(payPhone);
    },
    [onValidate, onConfirm, delivery],
  );

  /**
   * Livraison incomplete : le paiement ne part pas. Le message dit CE QUI
   * manque, sinon le clic reste sans effet visible.
   */
  const guardedConfirm = React.useCallback(
    async (payPhone: string) => {
      const manque =
        delivery.type === "aucune"
          ? null
          : !delivery.address
            ? "Indiquez le lieu de livraison"
            : !delivery.phone
              ? "Indiquez un numéro de contact"
              : delivery.type === "standard" && !delivery.hour
                ? "Choisissez un créneau horaire"
                : null;
      if (manque) {
        onError?.(manque);
        return;
      }
      await handleConfirm(payPhone);
    },
    [delivery, handleConfirm, onError],
  );

  // Overlay ouvert par `DeliveryTab` (un seul a la fois).
  const [overlay, setOverlay] = React.useState<GroupedDeliveryOverlay>(null);

  /**
   * Envoi en cours cote capsule du footer. Local, comme l'etait `isProcessing`
   * de `CartPaymentOverlay` : il couvre l'aller-retour AVANT que le hook ne
   * bascule `paymentState` sur « waiting ».
   */
  const [isProcessing, setIsProcessing] = React.useState(false);

  /**
   * Validation du numero — reprend `handlePay` de `CartPaymentOverlay` : champ
   * vide = message et rien d'autre, sinon on ferme le clavier, on `trim()` et
   * on lance la transaction.
   */
  const handlePay = React.useCallback(async () => {
    const p = phone.trim();
    if (!p) {
      onError?.("Veuillez remplir le numéro de paiement");
      return;
    }
    try {
      setIsProcessing(true);
      Keyboard.dismiss();
      await guardedConfirm(p);
    } finally {
      setIsProcessing(false);
    }
  }, [phone, guardedConfirm, onError]);

  /**
   * PAGE courante du parcours de livraison. Le sheet ayant une hauteur reduite,
   * la livraison ne tient plus d'un bloc : 1 = groupage, 2 = type de livraison,
   * 3 = informations, 4 = montants, 5 = recapitulatif et paiement.
   */
  const [step, setStep] = React.useState<1 | 2 | 3 | 4 | 5>(1);

  // Fermeture : la prochaine ouverture repart de la premiere page.
  React.useEffect(() => {
    if (!visible) setStep(1);
  }, [visible]);

  /**
   * Clavier referme alors qu'on saisissait : on repasse au repos. La capsule
   * flottante se demonte aussitot (elle ne redescend pas — le champ du footer
   * garde le numero), et un futur focus pourra la faire remonter.
   *
   * Le garde `keyboardWasVisible` est indispensable : `autoFocus` demande le
   * clavier au montage de la capsule, et sans lui l'effet la refermerait dans
   * l'intervalle ou il n'est pas encore visible.
   */
  const keyboardWasVisible = React.useRef(false);
  React.useEffect(() => {
    if (paymentState !== "input") {
      keyboardWasVisible.current = false;
      return;
    }
    if (isKeyboardVisible) keyboardWasVisible.current = true;
    else if (keyboardWasVisible.current) setPaymentState("total");
  }, [isKeyboardVisible, paymentState, setPaymentState]);

  /**
   * Sortie EN FONDU de la capsule flottante et de son voile. Sans elle, la
   * fermeture du clavier les faisait disparaitre d'un coup, en pleine descente
   * du clavier : le calque reste monte le temps du fondu, puis se retire.
   */
  const showPayOverlay =
    step === 5 &&
    (paymentState === "input" ||
      paymentState === "waiting" ||
      paymentState === "ussd_sent" ||
      paymentState === "success" ||
      paymentState === "success_created");
  const payOverlayAnim = React.useRef(new Animated.Value(0)).current;
  const [payOverlayMounted, setPayOverlayMounted] = React.useState(false);

  /**
   * Glissement d'ENTREE de la capsule, distinct du fondu. Le clavier s'ouvrant
   * d'emblee (`autoFocus`), la capsule etait deja en haut quand le fondu se
   * terminait : on ne la voyait pas monter. Cette valeur reste a 1 a la sortie,
   * qui doit rester un fondu sur place.
   */
  const payEnterAnim = React.useRef(new Animated.Value(0)).current;

  /**
   * Dernier etat REELLEMENT affiche par la capsule. Pendant le fondu de sortie,
   * `paymentState` est deja repasse a « total » : sans ce gel, la capsule
   * basculait sur l'ecran « Total a payer » en pleine disparition, alors qu'il
   * n'a plus lieu d'etre ici (le montant est sur les cards).
   */
  const lastPayState = React.useRef<CartPaymentState>("input");

  /**
   * Hauteur clavier GELEE pour la capsule. Son `bottom` suit `keyboardHeight` :
   * a la fermeture, elle redescendait donc avec le clavier pendant son fondu.
   * On memorise la derniere hauteur vue en saisie et on l'utilise telle quelle
   * pendant la sortie — le fondu se joue sur place, sans translation.
   */
  const veilKb = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    if (!showPayOverlay) return; // Sortie : on cesse de suivre, la valeur reste.
    // Ouverture : la capsule s'ouvre clavier ferme (tap sur le leurre du
    // footer). On repart de 0, sinon le voile s'affiche d'emblee a la hauteur
    // gelee de la fermeture precedente au lieu de grandir avec le clavier.
    veilKb.setValue(0);
    const id = (keyboardHeight as Animated.Value).addListener(({ value }) => {
      veilKb.setValue(value);
    });
    return () => (keyboardHeight as Animated.Value).removeListener(id);
  }, [showPayOverlay, keyboardHeight, veilKb]);

  React.useEffect(() => {
    if (showPayOverlay) lastPayState.current = paymentState;
  }, [showPayOverlay, paymentState]);

  React.useEffect(() => {
    if (showPayOverlay) {
      setPayOverlayMounted(true);
      // Glissement depuis le bas, joue a chaque ouverture.
      payEnterAnim.setValue(0);
      Animated.timing(payEnterAnim, {
        toValue: 1,
        duration: 260,
        useNativeDriver: false,
      }).start();
      Animated.timing(payOverlayAnim, {
        toValue: 1,
        duration: 160,
        // `useNativeDriver: false` OBLIGATOIRE : cette opacite cohabite, dans
        // le meme noeud de style, avec `height` / `bottom` calcules sur
        // `keyboardHeight`. En natif, Animated basculerait tout le noeud —
        // donc `keyboardHeight` — cote natif, et le ressort JS qui la pilote
        // dans `cart.tsx` planterait.
        useNativeDriver: false,
      }).start();
      return;
    }
    // Sortie : simple fondu. La capsule reste accrochee au clavier et redescend
    // avec lui — la figer sur place supprimait ce mouvement.
    Animated.timing(payOverlayAnim, {
      toValue: 0,
      // Sortie DOUCE : le clavier natif descend vite et on ne peut pas le
      // ralentir ; on etale le fondu pour que le retrait ne paraisse pas sec.
      duration: 240,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) setPayOverlayMounted(false);
    });
  }, [showPayOverlay, payOverlayAnim, payEnterAnim]);

  // Sortie ETAGEE : la capsule s'efface en premier (fin de course de l'anim),
  // le voile la suit — on la voit partir, puis le flou se retire.
  const capsuleOpacity = payOverlayAnim.interpolate({
    inputRange: [0.15, 1],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const veilOpacity = payOverlayAnim.interpolate({
    inputRange: [0, 0.9],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  React.useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 11,
      }).start();
    } else {
      // Sortie en fondu court, comme le sheet de groupage : le sheet de
      // paiement enchaîne derrière, un glissement ferait un temps mort.
      Animated.timing(anim, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, anim]);

  // Donnees de livraison de la boutique de reference (creneaux, offre), mises
  // en cache pour ne pas repartir de `null` a chaque ouverture.
  const { rawHours, orderLeadTime, advanceDays, deliveryOffer } =
    useGroupedDeliveryData(fastFoodId);

  // Des zones express existent-elles (nouveau format `deliveryHours`) ? Sans
  // elles, la ligne « Zone express » n'a rien a proposer et reste masquee.
  const hasExpressZones = Array.isArray(rawHours)
    ? rawHours.some(
        (h: any) =>
          h && typeof h === "object" && h.express && h.expressZones?.length > 0,
      )
    : false;

  // Commandes du lot, et frais de la course groupee : une seule course est
  // facturee, la plus chere.
  const cmd = groups.reduce((s, g) => s + g.entries.length, 0);
  const fraisGroupes = groups.reduce((s, g) => Math.max(s, g.livraison), 0);
  /** Total des articles du lot, hors livraison (source de verite du backend). */
  const articlesTotal = groups.reduce((s, g) => s + g.articles, 0);

  // Paiement parti : plus de fermeture au tap ni de changement de reseau.
  const isBusy =
    paymentState === "waiting" ||
    paymentState === "ussd_sent" ||
    paymentState === "success" ||
    paymentState === "success_created";

  if (!mounted) return null;

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [900, 0],
  });

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View style={[sheetStyles.scrim, { opacity: anim }]}>
        {/* Paiement parti : le tap sur le voile ne ferme plus. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={isBusy ? undefined : onClose}
        />
      </Animated.View>

      <Animated.View
        style={[
          sheetStyles.sheet,
          styles.sheet,
          {
            // Footer resserre : la safe area suffit a degager la nav bar, on
            // n'y ajoute qu'un filet de marge (le sheet est deja court).
            paddingBottom: 6 + insets.bottom * 0.5,
            transform: [{ translateY }],
          },
        ]}
      >
        {/* Titre du sheet : seul en-tete, sans sous-titre ni croix — le sheet
            se ferme par le voile. */}
        {/* <Text style={styles.sheetTitle}>Livraison et paiement</Text> */}

        {/* CINQ PAGES : `CartGroupedPaymentBody` peint celle de `step`
            (groupage, type, informations, montants, puis paiement) ; la capsule
            de saisie est ancree hors du sheet, juste dessous — d'ou `payLayer`,
            qui lui reserve sa place en bas. */}
        <View style={[styles.body, styles.payLayer]}>
          <CartGroupedPaymentBody
            delivery={delivery}
            setDelivery={setDelivery}
            hasExpressZones={hasExpressZones}
            cmd={cmd}
            deliveryCount={groups.length}
            articlesTotal={articlesTotal}
            livraison={fraisGroupes}
            onSplit={onSplit}
            onOpenLocation={() => setOverlay("location")}
            onOpenContact={() => setOverlay("contact")}
            onOpenPeriod={() => setOverlay("period")}
            onOpenExpress={() => setOverlay("express")}
            onOpenVoiceNote={() => setOverlay("voiceNote")}
            network={network}
            onNetworkChange={onNetworkChange}
            isBusy={isBusy}
            step={step}
          />

          {/* Navigation entre les pages. Sur la DERNIERE, « Continuer » cede la
              place a la capsule de paiement : seul le retour subsiste, sans
              quoi on ne pourrait plus revenir corriger les montants. */}
          <View style={styles.actionRow}>
            {step > 1 && !isBusy && (
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => setStep((s) => (s - 1) as 1 | 2 | 3 | 4 | 5)}
                activeOpacity={0.85}
              >
                <Ionicons name="arrow-back" size={20} color={C.ink} />
              </TouchableOpacity>
            )}
            {step < 5 ? (
              <TouchableOpacity
                style={[styles.primaryBtn, styles.actionRowPrimary]}
                onPress={() => setStep((s) => (s + 1) as 1 | 2 | 3 | 4 | 5)}
                activeOpacity={0.9}
              >
                <Text style={styles.primaryBtnLabel}>Continuer</Text>
              </TouchableOpacity>
            ) : (
              /* La capsule PREND LA PLACE du bouton « Continuer » : meme
                 hauteur, meme largeur restante, le footer ne bouge pas d'une
                 page a l'autre. Seule la saisie du numero y figure — le montant
                 est deja sur les cards au-dessus.

                 Ce n'est PAS un champ de saisie : c'est un leurre. Deux
                 `TextInput` voulaient le focus, celui d'ici passait derriere le
                 clavier et le curseur y restait invisible. Le tap ouvre la
                 capsule flottante, seul vrai champ, qui prend le focus. */
              <TouchableOpacity
                style={styles.payCapsule}
                onPress={() => setPaymentState("input")}
                disabled={isBusy || isProcessing}
                activeOpacity={0.85}
              >
                <Ionicons name="call-outline" size={16} color="#fff" />
                <Text
                  style={[
                    styles.payCapsuleInput,
                    !phone && styles.payCapsulePlaceholder,
                  ]}
                  numberOfLines={1}
                >
                  {phone || "Numéro de paiement"}
                </Text>
                <TouchableOpacity
                  style={styles.payCapsuleBtn}
                  onPress={handlePay}
                  disabled={isBusy || isProcessing}
                  activeOpacity={0.85}
                >
                  {isProcessing || isBusy ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="arrow-forward" size={17} color="#fff" />
                  )}
                </TouchableOpacity>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Animated.View>

      {/* Capsule flottante, rendue HORS du sheet pour remonter avec le clavier
          sans etre rognee. Elle sert a DEUX moments :
          - clavier ouvert (`input`) : elle monte au-dessus du clavier, son
            champ et celui du footer partageant `phone` — la saisie est donc
            la meme des deux cotes ;
          - transaction (attente, USSD, succes).
          Clavier ferme au repos, elle est DEMONTEE net : le champ du bas porte
          deja le numero saisi, la faire redescendre n'apporterait rien. */}
      {payOverlayMounted && (
        <Animated.View
          pointerEvents="box-none"
          style={[sheetStyles.capsuleSlot, { transform: [{ translateY }] }]}
        >
          {/* Voile FLOUTE de la zone basse : il part du bas de l'ecran et monte
            jusqu'au bord superieur de la capsule (sa position + sa hauteur),
            couvrant la zone occupee par le clavier. Rendu AVANT la capsule, il
            passe donc dessous. */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.keyboardVeil,
              {
                opacity: veilOpacity,
                /* Comme la capsule, la hauteur est GELEE en sortie : sinon le
                   voile se retracte avec le clavier et semble partir avant
                   elle, alors qu'il doit partir apres. */
                height: Animated.add(
                  veilKb,
                  CAPSULE_BOTTOM_OFFSET +
                    CAPSULE_KEYBOARD_GAP +
                    CAPSULE_HEIGHT +
                    VEIL_TOP_GAP,
                ),
              },
            ]}
          >
            <AppBlurView
              intensity={45}
              tint="dark"
              style={StyleSheet.absoluteFill}
              fallbackStyle={styles.keyboardVeilFallback}
            />
          </Animated.View>
          {/* Calque de fondu PROPRE a la capsule : elle s'efface avant le
              voile, on la voit partir puis le flou se retire. */}
          <Animated.View
            pointerEvents="box-none"
            style={[
              StyleSheet.absoluteFill,
              {
                opacity: capsuleOpacity,
                transform: [
                  {
                    translateY: payEnterAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [34, 0],
                    }),
                  },
                ],
              },
            ]}
          >
          <CartPaymentOverlay
            phone={phone}
            onPhoneChange={onPhoneChange}
            onConfirm={guardedConfirm}
            totalAmount={articlesTotal + fraisGroupes}
            /* Pendant le fondu de sortie, on rejoue le DERNIER etat affiche :
               `paymentState` est deja retombe a « total » et la capsule
               montrait « Total a payer » en pleine disparition. */
            paymentState={showPayOverlay ? paymentState : lastPayState.current}
            setPaymentState={setPaymentState}
            network={network}
            onNetworkChange={onNetworkChange}
            ussdMessage={ussdMessage}
            onClose={onClose}
            onError={onError}
            /* TOUJOURS `true` : l'apparence « clavier ouvert » est l'etat par
               defaut de la capsule dans ce parcours. En repassant a `false` a
               la fermeture du clavier, elle faisait surgir la croix de
               fermeture et changeait l'icone du bouton — des elements caches
               pendant la saisie qui reapparaissaient brutalement. */
            isKeyboardVisible
            /* SEUL vrai champ du parcours : il prend le focus des l'ouverture,
               le footer n'etant qu'un leurre. Plus de concurrence entre deux
               `TextInput`, donc plus de clignotement ni de curseur invisible. */
            autoFocus
            /* Android < 12 : pas de flou natif, on opacifie le fond pour que la
             capsule reste lisible. */
            blurFallbackStyle={styles.payCapsuleBlurFallback}
            /* En sortie on fige la hauteur : sinon la capsule redescend avec le
               clavier au lieu de disparaitre sur place. */
            bottom={Animated.add(
              veilKb,
              CAPSULE_BOTTOM_OFFSET + CAPSULE_KEYBOARD_GAP,
            )}
          />
          </Animated.View>
        </Animated.View>
      )}

      <CartGroupedDeliveryOverlays
        open={overlay}
        onCloseOverlay={() => setOverlay(null)}
        delivery={delivery}
        setDelivery={setDelivery}
        availableHours={rawHours}
        orderLeadTime={orderLeadTime}
        advanceDays={advanceDays}
        deliveryOffer={deliveryOffer}
        fastFoodId={fastFoodId}
        onError={onError}
      />
    </Modal>
  );
};
