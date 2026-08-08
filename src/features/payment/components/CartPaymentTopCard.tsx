import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React from "react";
import {
  Animated,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

// Même bloc que le home (CheckoutPaymentTopOverlay) : hauteur du sheet, place
// réservée en bas pour la capsule, et gap entre les deux.
const SHEET_HEIGHT = 384;
const BOTTOM_CAPSULE_SPACE = 70; // hauteur capsule
const GAP = 12; // espace entre la card et la capsule

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
const DEMO_MENU = {
  titre: "Poulet DG",
  image: "https://images.unsplash.com/photo-1604909052743-94e838986d24?w=200",
};
const DEMO_MENU_PRICE = 6500;
const DEMO_DRINKS_PRICE = 1500;
const DEMO_EXTRAS_PRICE = 3000;
const DEMO_DELIVERY_PRICE = 1000;
const DEMO_TOTAL = 12000;

/* ------------------------------------------------------------------ */
/* Sous-composants DUPLIQUÉS depuis le top overlay du home (markup      */
/* propre au panier — on n'importe rien du checkout).                   */
/* ------------------------------------------------------------------ */

// Header menu : photo + titre + description.
const MenuHeader: React.FC = () => (
  <View style={styles.menuHeader}>
    <Image source={{ uri: DEMO_MENU.image }} style={styles.menuImage} />
    <View style={styles.menuHeaderInfo}>
      <Text style={styles.menuTitle} numberOfLines={1}>
        {DEMO_MENU.titre}
      </Text>
      <Text style={styles.menuDesc} numberOfLines={2}>
        Produit de qualité supérieure préparé avec soin par nos chefs Yaammoo.
      </Text>
    </View>
  </View>
);

// Récap prix (menu / boisson / extras / livraison) — SANS le total.
const PriceRecap: React.FC = () => {
  const rows: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: number;
  }[] = [
    { icon: "fast-food-outline", label: "Menu", value: DEMO_MENU_PRICE },
    { icon: "wine-outline", label: "Boisson", value: DEMO_DRINKS_PRICE },
    { icon: "add-circle-outline", label: "Extras", value: DEMO_EXTRAS_PRICE },
    { icon: "bicycle-outline", label: "Livraison", value: DEMO_DELIVERY_PRICE },
  ];
  return (
    <View style={styles.recapRow}>
      {rows.map((r) => (
        <View key={r.label} style={styles.recapItem}>
          <Ionicons name={r.icon} size={16} color="#ec4913" />
          <Text style={styles.recapLabel}>{r.label}</Text>
          <Text style={styles.recapValue}>{r.value} F</Text>
        </View>
      ))}
    </View>
  );
};

// Zone d'action : choix du réseau.
const ActionArea: React.FC<{
  network: "orange" | "mtn";
  onNetworkChange?: (network: "orange" | "mtn") => void;
}> = ({ network, onNetworkChange }) => (
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
);

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
    <Modal visible={mounted} transparent animationType="none" statusBarTranslucent>
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
            <MenuHeader />

            <PriceRecap />

            {/* Total affiché à part, plus grand */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total à payer</Text>
              <Text style={styles.totalValue}>{DEMO_TOTAL} FCFA</Text>
            </View>

            <ActionArea network={network} onNetworkChange={onNetworkChange} />
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
    bottom: 0,
    height: BOTTOM_CAPSULE_SPACE + GAP,
  },
  panel: {
    flex: 1,
    // Le blanc descend jusqu'au bas du sheet : la capsule se pose DESSUS. Avec
    // une marge, la bande laissée sous le panel laissait voir la page
    // assombrie au travers — ce qu'on prenait pour un flou parasite.
    paddingBottom: BOTTOM_CAPSULE_SPACE + GAP,
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
  // --- Header menu ---
  menuHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  menuHeaderInfo: {
    flex: 1,
  },
  menuTitle: {
    color: "#1f2937",
    fontSize: 16,
    fontWeight: "700",
  },
  menuDesc: {
    color: "rgba(31,41,55,0.55)",
    fontSize: 12,
    marginTop: 2,
  },
  // --- Récap prix ---
  recapRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  recapItem: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  recapLabel: {
    color: "rgba(31,41,55,0.6)",
    fontSize: 11,
  },
  recapValue: {
    color: "#1f2937",
    fontSize: 12,
    fontWeight: "600",
  },
  // --- Total ---
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  totalLabel: {
    color: "rgba(31,41,55,0.8)",
    fontSize: 14,
    fontWeight: "600",
  },
  totalValue: {
    color: "#ec4913",
    fontSize: 24,
    fontWeight: "800",
  },
  // --- Zone d'action ---
  actionArea: {
    marginTop: "auto",
  },
  actionTitle: {
    color: "rgba(31,41,55,0.85)",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 10,
  },
  networkRow: {
    flexDirection: "row",
    gap: 10,
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
});
