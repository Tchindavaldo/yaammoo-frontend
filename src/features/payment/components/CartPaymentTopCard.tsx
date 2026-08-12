import { AppBlurView as BlurView } from "@/src/components/AppBlurView";
import { CartZoneFooterBar } from "@/src/features/orders/components/CartZoneFooterBar";
import type { CartZoneGroup } from "@/src/features/orders/utils/groupCartOrders";
import React from "react";
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  PaymentVariantCard,
  PaymentVariantColonnes,
  PaymentVariantTicket,
  type CartPaymentVariant,
} from "./CartPaymentVariants";

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

// Même bloc que le home (CheckoutPaymentTopOverlay) : hauteur du sheet, place
// réservée en bas pour la capsule, et gap entre les deux.
// Le sheet porte le recap, le selecteur de reseau et la capsule : il lui faut
// la hauteur du recap EN PLUS, sinon le choix du reseau se retrouve pousse vers
// le bas, sous la capsule.
const SHEET_HEIGHT = 260;
/**
 * Hauteur du sheet selon la variante affichee : les propositions « ticket » et
 * « card » portent plus de lignes que le design actuel.
 */
const heightFor = (variant: CartPaymentVariant) =>
  variant === "ticket" || variant === "card" ? 300 : SHEET_HEIGHT;
const BOTTOM_CAPSULE_SPACE = 70; // hauteur capsule
const GAP = 12; // espace entre la card et la capsule
/** Marge sous la capsule : la décolle du bas du sheet (nav bar / clavier). */
const CAPSULE_BOTTOM_OFFSET = 18;
interface CartPaymentTopCardProps {
  visible: boolean;
  /** Position du bas du sheet : au-dessus de la nav bar (ou du clavier). */
  bottom: Animated.AnimatedInterpolation<number> | number;
  /**
   * Hauteur du clavier (0 = fermé). Pilote le blur qui voile la card quand la
   * capsule monte, comme au home : le sheet ne bouge pas, il se floute.
   */
  keyboardHeight?: Animated.Value | Animated.AnimatedInterpolation<number>;
  /**
   * Clavier ouvert. Le voile n'est monté QUE dans ce cas : à intensité 0 le
   * BlurView assombrit quand même la card, il ne suffit pas d'interpoler.
   */
  isKeyboardVisible?: boolean;
  network?: "orange" | "mtn";
  onNetworkChange?: (network: "orange" | "mtn") => void;
  /**
   * Groupes de zone payés : alimentent le récap rendu au-dessus du choix du
   * réseau (même composant que le récap fixe du bas du panier).
   */
  groups?: CartZoneGroup[];
  /**
   * Design de la partie haute. `"actuel"` (défaut) = design en place ; les
   * autres valeurs rendent une proposition de `CartPaymentVariants`, pour
   * comparaison à l'écran. La capsule du bas est identique dans tous les cas.
   */
  variant?: CartPaymentVariant;
  /** Saisie du numéro : utilisée par les variantes, qui portent leur propre champ. */
  phone?: string;
  onPhoneChange?: (phone: string) => void;
  onConfirm?: () => void;
  onError?: (message: string) => void;
  /** Capsule de paiement, rendue DANS le sheet (ancrée sur son bas). */
  children?: React.ReactNode;
}

const FilterContent: React.FC<{
  network: "orange" | "mtn";
  onNetworkChange?: (network: "orange" | "mtn") => void;
  groups?: CartZoneGroup[];
  variant?: CartPaymentVariant;
  phone?: string;
  onPhoneChange?: (phone: string) => void;
  onConfirm?: () => void;
  onError?: (message: string) => void;
}> = ({
  network,
  onNetworkChange,
  groups,
  variant = "actuel",
  phone = "",
  onPhoneChange,
  onConfirm,
  onError,
}) => {
  // Variantes de comparaison : autonomes (champ numero inclus), rendues telles
  // quelles. Le design ACTUEL reste le cas par defaut et n'est pas touche.
  if (variant !== "actuel" && groups && groups.length > 0) {
    const props = {
      groups,
      network,
      onNetworkChange,
      phone,
      onPhoneChange: onPhoneChange ?? (() => {}),
      onConfirm: onConfirm ?? (() => {}),
      onError,
    };
    if (variant === "ticket") return <PaymentVariantTicket {...props} />;
    if (variant === "card") return <PaymentVariantCard {...props} />;
    return <PaymentVariantColonnes {...props} />;
  }

  return (
    <>
      {/* Recap du panier, au-dessus du choix du reseau : meme composant que le
          recap fixe du bas de la page panier, sans bouton de paiement (la
          capsule du sheet porte deja l'action). */}
      {groups && groups.length > 0 && (
        <View style={styles.recapWrapper}>
          <CartZoneFooterBar groups={groups} inlineHeader />
        </View>
      )}

      {/* Choix du reseau sur DEUX lignes : titre au-dessus, chips en dessous.
          Design repris du sheet de commande individuelle
          (`CheckoutPaymentTopOverlay`), markup DUPLIQUE — rien n'est importe du
          checkout. */}
      <View style={styles.actionArea}>
        <Text style={styles.actionTitle}>
          Sélectionnez le réseau utilisé pour le paiement
        </Text>
        <View style={styles.networkRow}>
          {(["orange", "mtn"] as const).map((net) => {
            const active = network === net;
            return (
              <TouchableOpacity
                key={net}
                style={[styles.networkChip, active && styles.networkChipActive]}
                onPress={() => onNetworkChange?.(net)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.networkChipText,
                    active && styles.networkChipTextActive,
                  ]}
                >
                  {net === "orange" ? "Orange Money" : "MTN MoMo"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </>
  );
};

/* ------------------------------------------------------------------ */

/**
 * Card de paiement du panier, rendue AU-DESSUS de la capsule
 * « Tout commander » : header menu + récap prix + total + choix du réseau.
 *
 * **Un seul bloc blanc** (sheet de 384px, coins arrondis en haut) posé
 * au-dessus de la nav bar, comme le sheet de commande individuelle du panier :
 * la card de récap occupe le haut, la capsule est rendue DEDANS via `children`
 * et s'ancre sur le bas du bloc. Les deux ne peuvent donc plus se chevaucher
 * ni passer derrière la nav bar, et montent ensemble avec le clavier.
 *
 * Composant **propre au panier** : rien n'est importé du checkout. Le sheet ne
 * porte plus que le **récap** (`CartZoneFooterBar`), le **choix du réseau** et
 * la **capsule** — les cards de maquette statique ont été retirées.
 */
export const CartPaymentTopCard: React.FC<CartPaymentTopCardProps> = ({
  visible,
  bottom,
  keyboardHeight,
  isKeyboardVisible = false,
  network = "orange",
  onNetworkChange,
  groups,
  variant = "actuel",
  phone,
  onPhoneChange,
  onConfirm,
  onError,
  children,
}) => {
  const insets = useSafeAreaInsets();
  const sheetHeight = heightFor(variant);
  // Une variante est autonome : elle porte son champ numero, pas de capsule.
  const isVariant = variant !== "actuel";
  const anim = React.useRef(new Animated.Value(0)).current; // 0 = caché, 1 = visible
  // Reste monté tant que l'animation de sortie n'est pas terminée.
  const [mounted, setMounted] = React.useState(visible);

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
      Animated.timing(anim, {
        toValue: 0,
        duration: 220, // synchro avec la fermeture de la capsule du bas
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, anim]);

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      {/* Voile sombre sur toute la page (comme au home) : il assombrit le panier
          derrière le sheet et apparaît/disparaît en fondu avec lui. */}
      <Animated.View
        pointerEvents="none"
        style={[styles.backdrop, { opacity: anim }]}
      />

      {/* `bottom` est animé en JS (le driver natif ne gère pas cette propriété) :
          il doit rester sur un nœud SÉPARÉ de celui qui porte opacity/transform,
          animés eux en natif — les mélanger fait planter l'animated module. */}
      <Animated.View
        style={[
          styles.wrapper,
          // Safe-area : le sheet est dans sa PROPRE Modal, il n'herite d'aucun
          // inset parent (cf. architecture/blur-safe-area.md § 2, forme
          // « sheet a hauteur fixe »). Sans ca il passe sous la nav bar Android.
          { bottom: bottom as any, height: sheetHeight + insets.bottom },
        ]}
      >
        {/* Entrée/sortie en TRANSLATION (le sheet glisse depuis le bas), pas en
            fondu : même mouvement que le sheet du home. */}
        <Animated.View
          style={[
            styles.panel,
            {
              // Le contenu remonte de l'inset : sinon la capsule, ancree sur le
              // bas du panel, retomberait dans la nav bar. Les variantes n'ont
              // PAS de capsule (elles portent leur propre champ) : le panel va
              // alors jusqu'en bas, avec la seule marge de securite.
              paddingBottom: isVariant
                ? CAPSULE_BOTTOM_OFFSET + insets.bottom
                : BOTTOM_CAPSULE_SPACE +
                  GAP +
                  CAPSULE_BOTTOM_OFFSET +
                  insets.bottom,
              transform: [
                {
                  translateY: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [sheetHeight + insets.bottom, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.content}>
            <FilterContent
              network={network}
              onNetworkChange={onNetworkChange}
              groups={groups}
              variant={variant}
              phone={phone}
              onPhoneChange={onPhoneChange}
              onConfirm={onConfirm}
              onError={onError}
            />
          </View>
        </Animated.View>

        {/* Voile sombre qui monte avec le clavier et floute la card pendant la
            saisie (même effet qu'au home) : intensité et hauteur suivent le
            clavier, la capsule passe au-dessus. */}
        {keyboardHeight && isKeyboardVisible ? (
          <AnimatedBlurView
            pointerEvents="none"
            tint="light"
            intensity={(keyboardHeight as any).interpolate({
              inputRange: [0, 100],
              outputRange: [0, 45],
              extrapolate: "clamp",
            })}
            style={[
              styles.keyboardBlur,
              {
                height: (keyboardHeight as any).interpolate({
                  inputRange: [0, 100],
                  outputRange: [0, sheetHeight],
                  extrapolate: "clamp",
                }),
              },
            ]}
          />
        ) : null}

        {/* Capsule rendue HORS du panel (qui a `overflow: hidden`) : à
            l'ouverture du clavier elle monte seule par-dessus la card, sans
            être rognée — le sheet, lui, ne bouge pas. Elle glisse avec le
            sheet à l'entrée/sortie. */}
        <Animated.View
          style={[
            styles.capsuleSlot,
            {
              // Remontee de l'inset : le wrapper descend desormais SOUS la nav
              // bar, la capsule doit rester au-dessus.
              bottom: CAPSULE_BOTTOM_OFFSET + insets.bottom,
              transform: [
                {
                  translateY: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [sheetHeight + insets.bottom, 0],
                  }),
                },
              ],
            },
          ]}
          pointerEvents="box-none"
        >
          {!isVariant && children}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  wrapper: {
    // Dans un Modal, comme le sheet de commande individuelle : le bloc descend
    // jusqu'au bas de l'écran et RECOUVRE la nav bar (un simple zIndex ne
    // suffirait pas, la nav bar est rendue hors de l'écran par le navigator).
    position: "absolute",
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
  },
  // Voile de flou pendant la saisie : ancré en bas, sa hauteur grandit avec le
  // clavier. Sous la capsule, au-dessus de la card.
  keyboardBlur: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: "hidden",
  },
  // Emplacement de la capsule : posé en bas du sheet, SANS overflow, pour
  // qu'elle puisse remonter par-dessus la card quand le clavier s'ouvre.
  capsuleSlot: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: CAPSULE_BOTTOM_OFFSET,
    height: BOTTOM_CAPSULE_SPACE + GAP,
  },
  panel: {
    flex: 1,
    // Le blanc descend jusqu'au bas du sheet : la capsule se pose DESSUS. Avec
    // une marge, la bande laissée sous le panel laissait voir la page
    // assombrie au travers — ce qu'on prenait pour un flou parasite.
    paddingBottom: BOTTOM_CAPSULE_SPACE + GAP + CAPSULE_BOTTOM_OFFSET,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: "hidden",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  content: {
    flex: 1,
    padding: 14,
  },
  // Recap pose au-dessus du choix du reseau : le composant porte sa propre
  // bordure haute, on la neutralise ici et on le recadre a la largeur du sheet.
  recapWrapper: {
    marginHorizontal: -16,
    marginBottom: 12,
  },
  // --- Choix du reseau (design duplique de CheckoutPaymentTopOverlay) ---
  actionArea: {
    marginTop: "auto",
  },
  actionTitle: {
    color: "rgba(31,41,55,0.85)",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 10,
  },
  networkChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  networkChipActive: {
    backgroundColor: "rgba(236, 73, 19, 0.12)",
    borderColor: "#ec4913",
  },
  networkChipText: {
    color: "rgba(31,41,55,0.7)",
    fontSize: 13,
    fontWeight: "600",
  },
  networkChipTextActive: {
    color: "#ec4913",
  },
  networkRow: {
    flexDirection: "row",
    gap: 10,
  },
  // --- Cards de mode / de lot de dates ---
  modeCardRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "stretch",
    gap: 6,
    marginTop: 12,
  },
  dateRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "stretch",
    gap: 6,
  },
  scopeCard: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#EFEDE6",
    backgroundColor: "#FAF9F6",
    paddingVertical: 9,
    paddingHorizontal: 8,
    gap: 6,
    marginBottom: 8,
  },
  scopeCardActive: {
    borderColor: "transparent",
    backgroundColor: "#ec49131A",
  },
  scopeTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scopeLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1A1916",
    lineHeight: 15,
  },
  countBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#EFEDE6",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  countBadgeActive: {
    backgroundColor: "#ec4913",
  },
  countText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#888780",
  },
  countTextActive: {
    color: "#fff",
  },
  // --- Bloc des cards de dates ---
  pastBar: {
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  // --- Liste détaillée d'une card de mode (zones / créneaux) ---
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
    // Annule le `gap: 6` de la card entre deux lignes de liste.
    marginBottom: -4,
  },
  listItemLabel: {
    flexShrink: 1,
    fontSize: 10,
    fontWeight: "600",
    color: "#1A1916",
  },
  // Indicateur des lignes non affichées.
  listMore: {
    fontSize: 10,
    fontWeight: "800",
    color: "#ec4913",
    marginBottom: -4,
  },
  listItemAmount: {
    fontSize: 10,
    fontWeight: "700",
    color: "#888780",
  },
  // Montant total des commandes de la card (même place que le total).
  deliveryAmount: {
    color: "#ec4913",
    fontSize: 15,
    fontWeight: "800",
    // Le `gap: 6` de la card écarte déjà le montant de la liste : on remonte
    // celle-ci pour la coller dessous.
  },
  // --- Card « Total à payer » (même gabarit que les cards de dates) ---
  // Même largeur qu'une card de mode de la ligne du dessus : la ligne compte
  // 3 colonnes, le bloc réseau en occupe 2 (`flex: 2`), le total la dernière.
  totalCard: {
    flex: 1,
    borderColor: "transparent",
    backgroundColor: "#ec49131A",
  },
  totalCardValue: {
    color: "#ec4913",
    fontSize: 15,
    fontWeight: "800",
  },
  totalCardLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1A1916",
    lineHeight: 15,
  },
});
