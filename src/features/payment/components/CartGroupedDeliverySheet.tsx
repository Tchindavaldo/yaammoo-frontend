import { DeliveryTab } from "@/src/features/checkout/components/tabs/DeliveryTab";
import type { CartZoneGroup } from "@/src/features/orders/utils/groupCartOrders";
import { Livraison } from "@/src/types";
import React from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGroupedDeliveryData } from "../hooks/useGroupedDeliveryData";
import type { CartPaymentState } from "../hooks/useCartPayment";
import {
  CartGroupedDeliveryOverlays,
  type GroupedDeliveryOverlay,
} from "./CartGroupedDeliveryOverlays";
import {
  CAPSULE_BOTTOM_OFFSET,
  styles,
} from "./CartGroupedDeliverySheet.styles";
import { CartGroupingStep } from "./CartGroupingStep";
import { CartPaymentBody } from "./CartPaymentBody";
import { CartPaymentOverlay } from "./CartPaymentOverlay";
import { styles as sheetStyles } from "./CartPaymentSheet.styles";

const fmt = (n: number) => `${Math.round(n).toLocaleString("fr-FR")}`;

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
  // Étape affichée DANS le même sheet : choix du groupage, puis composition de
  // la livraison commune. Un seul `Modal` monté du début à la fin — enchaîner
  // deux Modals introduisait une latence et des ouvertures manquées.
  const [step, setStep] = React.useState<"grouping" | "delivery" | "payment">(
    "grouping",
  );
  // Progression du fondu croisé entre les deux premières étapes (0 = groupage,
  // 1 = livraison) : le sheet garde sa hauteur, seul le contenu se substitue.
  const fade = React.useRef(new Animated.Value(0)).current;
  // Idem pour le passage livraison -> paiement (troisième calque).
  const fadePay = React.useRef(new Animated.Value(0)).current;

  /**
   * Les deux etapes sont montees en meme temps (voir `body` / `bodyLayer`), le
   * passage n'est donc QU'un fondu croise : l'etape 2 est deja peinte quand elle
   * apparait. La monter dans le callback du fondu la faisait rendre pendant
   * l'animation — un flash de contenu pas encore pret.
   */
  const goToDelivery = React.useCallback(() => {
    setStep("delivery");
    Animated.timing(fade, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [fade]);

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
   * Livraison validée : on remonte la livraison commune au panier (qui la
   * pousse dans les commandes et arme le paiement) et on fond vers le 3e
   * calque. Le sheet ne se ferme plus entre les deux — c'est ce qui produisait
   * un temps mort et une ouverture de Modal manquée.
   */
  const goToPayment = React.useCallback(() => {
    onValidate(delivery);
    setStep("payment");
    Animated.timing(fadePay, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [fadePay, onValidate, delivery]);

  // Overlay ouvert par `DeliveryTab` (un seul a la fois).
  const [overlay, setOverlay] = React.useState<GroupedDeliveryOverlay>(null);

  React.useEffect(() => {
    if (visible) {
      setMounted(true);
      setStep("grouping");
      fade.setValue(0);
      fadePay.setValue(0);
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
  }, [visible, anim, fade, fadePay]);

  // Donnees de livraison de la boutique de reference (creneaux, offre), mises
  // en cache pour ne pas repartir de `null` a chaque ouverture.
  const { rawHours, orderLeadTime, advanceDays, deliveryOffer } =
    useGroupedDeliveryData(fastFoodId);

  // Étape 1 : commandes du lot, et frais de course groupés (une seule course
  // facturée, la plus chère) face aux frais séparés (une par groupe).
  const cmd = groups.reduce((s, g) => s + g.entries.length, 0);
  const fraisSepares = groups.reduce((s, g) => s + g.livraison, 0);
  const fraisGroupes = groups.reduce((s, g) => Math.max(s, g.livraison), 0);
  /** Total des articles du lot, hors livraison (source de verite du backend). */
  const articlesTotal = groups.reduce((s, g) => s + g.articles, 0);

  /**
   * La livraison commune n'est complète que si le lieu et le contact sont
   * renseignés, plus le créneau en mode « Heure » et la zone en express. En
   * retrait boutique, rien n'est requis.
   */
  const isComplete =
    delivery.type === "aucune"
      ? true
      : !!delivery.address &&
        !!delivery.phone &&
        (delivery.type === "standard" ? !!delivery.hour : true);

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
            paddingBottom: 16 + insets.bottom,
            transform: [{ translateY }],
          },
        ]}
      >
        {/* Pas d'en-tete : ni titre, ni sous-titre, ni croix. Chaque calque
            porte lui-meme son propos, et le sheet se ferme par le voile (ou par
            son bouton d'action). La hauteur reduite d'autant, voir `sheet`. */}
        <View style={styles.body}>
          {/* Calque 1 — choix du groupage (écran 02 du design). */}
          <Animated.View
            style={[
              styles.bodyLayer,
              {
                opacity: fade.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0],
                }),
              },
            ]}
            pointerEvents={step === "grouping" ? "auto" : "none"}
          >
            <CartGroupingStep
              cmd={cmd}
              fraisSepares={fraisSepares}
              fraisGroupes={fraisGroupes}
              onGroup={goToDelivery}
              onSplit={onSplit}
            />
          </Animated.View>

          {/* Calque 2 — composition de la livraison commune. Monté d'emblée,
              donc déjà peint quand le fondu l'amène : c'est ce qui supprime le
              flash de contenu pas encore prêt à l'arrivée sur l'étape. */}
          <Animated.View
            style={[
              styles.bodyLayer,
              // Presente entre le groupage et le paiement : `fade` l'amene,
              // `fadePay` la retire.
              {
                opacity: Animated.multiply(
                  fade,
                  fadePay.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0],
                  }),
                ),
              },
            ]}
            pointerEvents={step === "delivery" ? "auto" : "none"}
          >
            {/* Meme accroche que l'etape 1 (`styles.question`) : le recap du lot
                a ete retire d'ici, les montants sont deja portes par le bouton
                de validation et par l'etape de paiement. Le sous-texte remplit
                la place laissee libre et rappelle ce que le groupage implique. */}
            <Text style={styles.question}>
              Où et quand livrer vos {cmd} commandes ?
            </Text>
            <View style={styles.questionNote}>
              <Text style={styles.questionNoteText}>
                Une seule adresse et un seul horaire pour vos{" "}
                <Text style={styles.questionNoteStrong}>{cmd} commandes</Text>
                {fraisSepares > fraisGroupes ? (
                  <Text>
                    {", livrées pour "}
                    <Text style={styles.questionNoteStrong}>
                      {fmt(fraisGroupes)} F
                    </Text>
                    {` au lieu de ${fmt(fraisSepares)} F.`}
                  </Text>
                ) : (
                  "."
                )}
              </Text>
            </View>

            {/* Section delivery du sheet de commande. `DeliveryTab` est
                  calibré pour CE sheet-là : conteneur `height: 230` découpé en
                  deux zones `flex: 1`, et `marginBottom: 80` sous la grille de
                  types (la place de sa barre d'action absolue). Ici le sheet a
                  sa propre hauteur et son bouton en flux — sans neutraliser ces
                  contraintes, les cartes du haut se compriment et chevauchent
                  « SELECT TYPE ». */}
            <View style={styles.deliveryHost}>
              <DeliveryTab
                delivery={delivery}
                setDelivery={setDelivery}
                onOpenLocation={() => setOverlay("location")}
                onOpenContact={() => setOverlay("contact")}
                onOpenPeriod={() => setOverlay("period")}
                onOpenExpress={() => setOverlay("express")}
                onOpenVoiceNote={() => setOverlay("voiceNote")}
                availableHours={rawHours}
                deliveryOffer={deliveryOffer}
                fillHeight
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, !isComplete && styles.primaryBtnOff]}
              onPress={goToPayment}
              disabled={!isComplete}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnLabel}>
                Valider et payer · {fmt(articlesTotal + fraisGroupes)} F
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Calque 3 — paiement. Même corps que le sheet de paiement autonome
              (`CartPaymentBody`), monté d'emblée lui aussi : « Valider et
              payer » ne fait qu'un fondu, plus de fermeture/réouverture de
              Modal entre la livraison et le paiement. */}
          <Animated.View
            style={[styles.bodyLayer, styles.payLayer, { opacity: fadePay }]}
            pointerEvents={step === "payment" ? "auto" : "none"}
          >
            <CartPaymentBody
              groups={groups}
              /* Livraison mutualisee : le total du panier compterait une course
                 par zone, alors qu'une seule est facturee ici. */
              totalAmount={articlesTotal + fraisGroupes}
              network={network}
              onNetworkChange={onNetworkChange}
              isBusy={isBusy}
              grouped
              groupedLivraison={fraisGroupes}
            />
          </Animated.View>
        </View>
      </Animated.View>

      {/* Capsule de saisie / étapes du paiement, rendue HORS du sheet (qui a
          `overflow: hidden`) pour remonter avec le clavier sans être rognée.
          Elle n'existe qu'à l'étape 3. */}
      {step === "payment" && (
        <Animated.View
          pointerEvents="box-none"
          style={[sheetStyles.capsuleSlot, { transform: [{ translateY }] }]}
        >
          <CartPaymentOverlay
            phone={phone}
            onPhoneChange={onPhoneChange}
            onConfirm={onConfirm}
            totalAmount={articlesTotal + fraisGroupes}
            paymentState={paymentState}
            setPaymentState={setPaymentState}
            network={network}
            onNetworkChange={onNetworkChange}
            ussdMessage={ussdMessage}
            onClose={onClose}
            onError={onError}
            isKeyboardVisible={isKeyboardVisible}
            bottom={Animated.add(
              keyboardHeight as any,
              CAPSULE_BOTTOM_OFFSET + insets.bottom,
            )}
          />
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
