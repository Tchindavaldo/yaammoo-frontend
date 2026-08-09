import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React from "react";
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

// Même bloc que le home (CheckoutPaymentTopOverlay) : hauteur du sheet, place
// réservée en bas pour la capsule, et gap entre les deux.
const SHEET_HEIGHT = 380;
const BOTTOM_CAPSULE_SPACE = 70; // hauteur capsule
const GAP = 12; // espace entre la card et la capsule
/** Marge sous la capsule : la décolle du bas du sheet (nav bar / clavier). */
const CAPSULE_BOTTOM_OFFSET = 18;
/** Montant affiché : « 00.00 F » quand il est nul (livraison offerte). */
const formatAmount = (amount: number) =>
  amount === 0 ? "00.00 F" : `${amount} F`;

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
  /** Capsule de paiement, rendue DANS le sheet (ancrée sur son bas). */
  children?: React.ReactNode;
}

/* ------------------------------------------------------------------ */
/* DONNÉES DE DÉMO — rendu uniquement.                                 */
/* Rien n'est branché sur le panier réel : ces valeurs servent à valider */
/* la maquette avant de câbler les vraies commandes.                    */
/* ------------------------------------------------------------------ */
const DEMO_TOTAL = 12000;

// Contenu repris du bottom filter marchand (MerchantFilterSheet) : chips de
// statut, cards de mode de livraison, cards de lot de dates + ligne de récap.
// Maquette STATIQUE — aucune logique de filtrage n'est branchée ici.
// Cards de la dernière ligne : total des frais de livraison et total des
// commandes, chacune avec son nombre et son montant.
const DEMO_DELIVERY_CARDS: {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  count: number;
  amount: number;
}[] = [
  {
    key: "livraison",
    icon: "bicycle-outline",
    label: "Livraison total",
    count: 5,
    amount: 3500,
  },
  {
    key: "commandes",
    icon: "receipt-outline",
    label: "Commandes total",
    count: 6,
    amount: 8500,
  },
];
// Cards de mode : chacune liste son détail (zones express, lieux sur place,
// créneaux horaires) avec le montant par ligne, puis son total et son nombre.
const DEMO_MODE_CARDS: {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Titre de la card = nature de la liste (Zones / Boutiques / Créneaux). */
  listTitle: string;
  /** Nom d'un élément au singulier, pour le « +N … en plus ». */
  itemName: string;
  items: { label: string; amount: number }[];
  count: number;
  amount: number;
}[] = [
  {
    key: "express",
    icon: "flash-outline",
    listTitle: "Zones",
    itemName: "zone",
    items: [
      { label: "Bonanjo", amount: 1000 },
      { label: "Akwa", amount: 1000 },
    ],
    count: 2,
    amount: 2000,
  },
  {
    key: "surplace",
    icon: "restaurant-outline",
    listTitle: "Boutiques",
    itemName: "boutique",
    items: [{ label: "Yaammoo Deido", amount: 0 }],
    count: 1,
    amount: 0,
  },
  {
    key: "slots",
    icon: "time-outline",
    listTitle: "Créneaux",
    itemName: "créneau",
    items: [
      { label: "08:00", amount: 500 },
      { label: "12:00", amount: 500 },
      { label: "18:00", amount: 500 },
    ],
    count: 3,
    amount: 1500,
  },
];
/* ------------------------------------------------------------------ */
/* Sous-composants du contenu (markup dupliqué depuis MerchantFilterSheet, */
/* rien n'est importé du marchand).                                        */
/* ------------------------------------------------------------------ */

/** Contenu repris du bottom filter marchand (réseau / modes / dates). */
const FilterContent: React.FC<{
  network: "orange" | "mtn";
  onNetworkChange?: (network: "orange" | "mtn") => void;
}> = ({ network, onNetworkChange }) => {
  const [modes, setModes] = React.useState<string[]>([]);
  const [dateScope, setDateScope] = React.useState("today");

  return (
    <>
      {/* Ligne du haut : libellé + les 2 chips de réseau de paiement. */}
      <View style={styles.statusRow}>
        <View style={[styles.statusChip, styles.networkLabelChip]}>
          <Text style={styles.networkLabelText} numberOfLines={2}>
            Sélectionner le réseau de paiement
          </Text>
        </View>

        {(["orange", "mtn"] as const).map((net) => {
          const active = network === net;
          return (
            <TouchableOpacity
              key={net}
              style={[styles.statusChip, active && styles.statusChipActive]}
              onPress={() => onNetworkChange?.(net)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.statusChipText,
                  active && styles.statusChipTextActive,
                ]}
                numberOfLines={1}
              >
                {net === "orange" ? "Orange Money" : "MTN MoMo"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Cards de mode de livraison : titre + liste détaillée (zone/créneau ·
          montant), puis nombre total et montant total. */}
      <View style={styles.modeCardRow}>
        {DEMO_MODE_CARDS.map((m) => {
          const active = modes.includes(m.key);
          return (
            <TouchableOpacity
              key={m.key}
              style={[styles.scopeCard, active && styles.scopeCardActive]}
              onPress={() =>
                setModes((prev) =>
                  prev.includes(m.key)
                    ? prev.filter((k) => k !== m.key)
                    : [...prev, m.key],
                )
              }
              activeOpacity={0.7}
            >
              {/* Titre + nombre total d'éléments (« Zones x2 »). */}
              <Text style={styles.scopeLabel} numberOfLines={1}>
                {m.listTitle} x{m.count}
              </Text>

              {/* Montant total de la card. */}
              <Text style={styles.deliveryAmount} numberOfLines={1}>
                {formatAmount(m.amount)}
              </Text>

              {/* La card garde TOUJOURS 2 lignes sous le montant. Au-delà de
                  2 éléments, la 1re ligne seule est détaillée et la 2e devient
                  le « +N … en plus » ; sinon les lignes manquantes sont
                  comblées par des tirets. */}
              {(() => {
                const first = m.items[0];
                // Le reste n'est jamais détaillé : la 2e ligne porte toujours
                // le « +N », y compris « +0 » quand il n'y a qu'un élément.
                const rest = Math.max(0, m.items.length - 1);
                return (
                  <>
                    <View style={styles.listRow}>
                      <Text style={styles.listItemLabel} numberOfLines={1}>
                        {first ? first.label : "—"}
                      </Text>
                      <Text style={styles.listItemAmount} numberOfLines={1}>
                        {first ? formatAmount(first.amount) : "—"}
                      </Text>
                    </View>
                    <Text style={styles.listMore} numberOfLines={1}>
                      +{rest} {m.itemName}
                    </Text>
                  </>
                );
              })()}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Cards de lot de dates — la 3e porte le TOTAL À PAYER (même gabarit
          de card, seul son contenu change). */}
      <View style={styles.pastBar}>
        <View style={styles.dateRow}>
          {DEMO_DELIVERY_CARDS.map((d) => {
            const active = dateScope === d.key;
            return (
              <TouchableOpacity
                key={d.key}
                style={[styles.scopeCard, active && styles.scopeCardActive]}
                onPress={() => setDateScope(d.key)}
                activeOpacity={0.7}
              >
                <View style={styles.scopeTop}>
                  <Ionicons
                    name={d.icon}
                    size={18}
                    color={active ? "#1A1916" : "#888780"}
                  />
                  <View
                    style={[
                      styles.countBadge,
                      active && styles.countBadgeActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.countText,
                        active && styles.countTextActive,
                      ]}
                    >
                      {d.count}
                    </Text>
                  </View>
                </View>
                <Text style={styles.deliveryAmount} numberOfLines={1}>
                  {formatAmount(d.amount)}
                </Text>
                <Text style={styles.scopeLabel} numberOfLines={2}>
                  {d.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          <View style={[styles.scopeCard, styles.totalCard]}>
            <View style={styles.scopeTop}>
              <Ionicons name="wallet-outline" size={18} color="#ec4913" />
            </View>
            <Text style={styles.totalCardValue} numberOfLines={1}>
              {formatAmount(DEMO_TOTAL)}
            </Text>
            <Text style={styles.totalCardLabel} numberOfLines={2}>
              Total à payer
            </Text>
          </View>
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
 * Composant **propre au panier** : rien n'est importé du checkout. Contenu
 * encore **statique** (constantes `DEMO_*`), le câblage viendra ensuite.
 */
export const CartPaymentTopCard: React.FC<CartPaymentTopCardProps> = ({
  visible,
  bottom,
  keyboardHeight,
  isKeyboardVisible = false,
  network = "orange",
  onNetworkChange,
  children,
}) => {
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
      <Animated.View style={[styles.wrapper, { bottom: bottom as any }]}>
        {/* Entrée/sortie en TRANSLATION (le sheet glisse depuis le bas), pas en
            fondu : même mouvement que le sheet du home. */}
        <Animated.View
          style={[
            styles.panel,
            {
              transform: [
                {
                  translateY: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [SHEET_HEIGHT, 0],
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
                  outputRange: [0, SHEET_HEIGHT],
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
              transform: [
                {
                  translateY: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [SHEET_HEIGHT, 0],
                  }),
                },
              ],
            },
          ]}
          pointerEvents="box-none"
        >
          {children}
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
  // --- Chips de réseau (gabarit repris du bottom filter marchand) ---
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  // 1er chip de la ligne : simple libellé, non cliquable.
  networkLabelChip: {
    backgroundColor: "transparent",
  },
  statusChip: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: "#ec491310",
  },
  statusChipActive: { backgroundColor: "#ec4913" },
  statusChipText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "700",
    color: "#ec4913",
  },
  statusChipTextActive: { color: "#fff" },
  networkLabelText: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(31,41,55,0.7)",
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
