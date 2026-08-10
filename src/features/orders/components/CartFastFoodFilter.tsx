import { Theme } from "@/src/theme";
import { Image } from "expo-image";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

/**
 * Filtre fastfood du panier — duplication autonome du filtre haut de la page
 * « État des commandes » (OrderTrackingHeader). Aucun import croisé : les deux
 * composants évoluent séparément.
 */

/** Un fastfood présent dans le panier. */
export interface CartFastFood {
  id: string;
  name: string;
  image?: string;
  /** Nombre de commandes du panier pour ce fastfood (pastille d'angle). */
  orderCount: number;
  /** Montant total du panier pour ce fastfood (livraison mutualisée incluse). */
  total: number;
}

interface CartFastFoodFilterProps {
  /** Fastfoods présents dans le panier (liste horizontale du haut). */
  fastFoods?: CartFastFood[];
  /** Fastfood filtré (`null` = tous). */
  selectedFastFoodId?: string | null;
  onFastFoodPress?: (id: string | null) => void;
}

const fmtAmount = (n: number) => `${(n || 0).toLocaleString("fr-FR")} F`;

const FastFoodAvatar = ({ item }: { item: CartFastFood }) => {
  const initials = (item.name || "??").substring(0, 2).toUpperCase();
  return item.image ? (
    <Image
      source={{ uri: item.image }}
      style={styles.ffAvatarImage}
      cachePolicy="memory-disk"
      transition={150}
    />
  ) : (
    <Text style={styles.ffAvatarInitials}>{initials}</Text>
  );
};

/** Pastille unique : nombre de commandes du panier pour ce fastfood. */
const CountPill = ({ count }: { count: number }) => {
  if (count === 0) return null;
  return (
    <View style={styles.ffPill}>
      <Text style={styles.ffPillText}>{count}</Text>
    </View>
  );
};

/**
 * Carte fastfood servant de filtre.
 * - Exactement 2 fastfoods : avatar + nom sur chaque carte du scroll, et le
 *   slot fixe de gauche n'affiche que l'avatar.
 * - Au-delà de 2 : design de base — avatars seuls dans le scroll, le nom
 *   n'apparaissant que dans le slot fixe du fastfood sélectionné.
 */
const FastFoodPill = React.memo(function FastFoodPill({
  item,
  selected,
  showName,
  fill,
  compactMeta,
  onLayout,
  onPress,
}: {
  item: CartFastFood;
  selected: boolean;
  showName: boolean;
  /** Étire la carte pour occuper une part égale de la rangée (mode 2 cartes). */
  fill?: boolean;
  /** Libellé raccourci (« cmd ») quand la carte est étroite (3 fastfoods). */
  compactMeta?: boolean;
  /** Position/largeur de la carte dans le scroll (auto-scroll sur sélection). */
  onLayout?: (x: number, width: number) => void;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={!onPress}
      onLayout={
        onLayout
          ? (e) => onLayout(e.nativeEvent.layout.x, e.nativeEvent.layout.width)
          : undefined
      }
      style={[
        styles.ffCard,
        fill ? styles.ffCardFill : styles.ffCardCompact,
        // Mode 2 cartes : pas de bordure, c'est le FOND qui porte la sélection.
        fill
          ? selected
            ? styles.ffCardFillActive
            : styles.ffCardFillIdle
          : selected && styles.ffCardActive,
      ]}
    >
      <View
        style={[
          styles.ffAvatar,
          !fill && selected && styles.ffAvatarActive,
        ]}
      >
        <FastFoodAvatar item={item} />
      </View>
      {showName ? (
        <View style={[styles.ffInfo, fill && styles.ffInfoFill]}>
          <Text style={styles.ffName} numberOfLines={1} ellipsizeMode="tail">
            {item.name}
          </Text>
          <Text style={styles.ffMeta} numberOfLines={1}>
            {item.orderCount}{" "}
            {compactMeta
              ? "cmd"
              : `commande${item.orderCount > 1 ? "s" : ""}`}
          </Text>
          <Text style={styles.ffTotal} numberOfLines={1}>
            {fmtAmount(item.total)}
          </Text>
        </View>
      ) : (
        <CountPill count={item.orderCount} />
      )}
    </TouchableOpacity>
  );
});

export const CartFastFoodFilter: React.FC<CartFastFoodFilterProps> = ({
  fastFoods = [],
  selectedFastFoodId = null,
  onFastFoodPress,
}) => {
  const selectedItem = fastFoods.find((f) => f.id === selectedFastFoodId);

  // Auto-scroll : on centre la carte sélectionnée dans la zone visible.
  const scrollRef = React.useRef<ScrollView>(null);
  const layoutsRef = React.useRef<Record<string, { x: number; width: number }>>(
    {},
  );
  const [viewportWidth, setViewportWidth] = React.useState(0);

  const scrollToSelected = React.useCallback(
    (id: string) => {
      const l = layoutsRef.current[id];
      if (!l || !viewportWidth) return;
      const x = Math.max(0, l.x + l.width / 2 - viewportWidth / 2);
      scrollRef.current?.scrollTo({ x, animated: true });
    },
    [viewportWidth],
  );

  React.useEffect(() => {
    if (selectedFastFoodId) scrollToSelected(selectedFastFoodId);
  }, [selectedFastFoodId, scrollToSelected]);

  // Un seul fastfood dans le panier : filtrer n'a aucun sens, on masque.
  if (fastFoods.length <= 1) return null;

  // De 2 à 3 fastfoods : pas de slot fixe, les cartes se partagent la rangée à
  // parts égales et portent nom + nb de commandes + montant.
  // Au-delà de 3 : design de base (scroll d'avatars + slot fixe nommé).
  const nameOnCards = fastFoods.length <= 3;

  return (
    <View style={styles.container}>
      <View style={styles.ffRow}>
        {/* Slot fixe uniquement au-delà de 3 fastfoods : de 2 à 3, les cartes
            occupent toute la rangée. */}
        {!nameOnCards && selectedItem && (
          <View style={styles.ffSelectedSlot}>
            <View style={styles.ffAvatar}>
              <FastFoodAvatar item={selectedItem} />
            </View>
            <View style={styles.ffInfo}>
              <Text style={styles.ffName} numberOfLines={2} ellipsizeMode="tail">
                {selectedItem.name}
              </Text>
            </View>
          </View>
        )}

        {nameOnCards ? (
          // 2 ou 3 fastfoods : pas de scroll, les cartes se partagent la
          // rangée à parts égales.
          <View style={styles.ffSplitRow}>
            {fastFoods.map((ff) => (
              <FastFoodPill
                key={ff.id}
                item={ff}
                selected={selectedFastFoodId === ff.id}
                showName
                fill
                compactMeta={fastFoods.length >= 3}
                onPress={
                  onFastFoodPress ? () => onFastFoodPress(ff.id) : undefined
                }
              />
            ))}
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.ffScrollView}
            contentContainerStyle={styles.ffScroll}
            onLayout={(e) => setViewportWidth(e.nativeEvent.layout.width)}
          >
            {fastFoods.map((ff) => (
              <FastFoodPill
                key={ff.id}
                item={ff}
                selected={selectedFastFoodId === ff.id}
                showName={false}
                onLayout={(x, width) => {
                  layoutsRef.current[ff.id] = { x, width };
                  if (ff.id === selectedFastFoodId) scrollToSelected(ff.id);
                }}
                onPress={
                  onFastFoodPress ? () => onFastFoodPress(ff.id) : undefined
                }
              />
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    paddingTop: 0,
    overflow: "hidden",
  },
  ffRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 10,
    paddingVertical: 10,
  },
  ffSelectedSlot: {
    // Slot fixe : toujours à gauche, hors du scroll.
    maxWidth: 140,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Theme.colors.primary + "10",
    padding: 6,
    borderRadius: 18,
    marginRight: 8,
  },
  // Le scroll s'arrête au padding parent : les cartes ne touchent jamais le
  // bord droit de l'écran.
  ffScrollView: {
    flex: 1,
    marginRight: 10,
  },
  ffScroll: {
    // Marge haute : le badge d'angle dépasse de la carte et ne doit pas être rogné.
    paddingTop: 4,
    gap: 8,
  },
  // Rangée sans scroll : les 2 cartes se partagent l'espace à parts égales.
  ffSplitRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "stretch",
    paddingRight: 10,
    paddingTop: 4,
    gap: 8,
  },
  // Carte à part égale : avatar à gauche, texte à droite (rangée horizontale).
  ffCardFill: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    borderWidth: 0,
  },
  // Non sélectionnée : fond gris neutre.
  ffCardFillIdle: {
    backgroundColor: "#f3f4f6",
  },
  // Sélectionnée : le fond se colore (aucune bordure).
  ffCardFillActive: {
    backgroundColor: Theme.colors.primary + "22",
  },
  ffCardCompact: {
    maxWidth: 160,
  },
  ffCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Theme.colors.primary + "10",
    padding: 6,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  ffCardActive: {
    borderColor: "rgba(236,73,19,1.00)",
  },
  ffAvatarActive: {
    borderWidth: 1.5,
    borderColor: "rgba(236,73,19,1.00)",
  },
  ffInfo: {
    flexShrink: 1,
    minWidth: 0,
    marginLeft: 6,
  },
  // Bloc texte des cartes à part égale : occupe la place restante à droite de
  // l'avatar, ce qui permet une troncature propre du nom.
  ffInfoFill: {
    flex: 1,
  },
  ffAvatar: {
    width: 42,
    height: 46,
    borderRadius: 21,
    backgroundColor: "#fee2e2",
    justifyContent: "center",
    alignItems: "center",
  },
  ffAvatarImage: {
    width: 42,
    height: 46,
    borderRadius: 21,
  },
  ffAvatarInitials: {
    fontSize: 14,
    fontWeight: "900",
    color: "#ec4913",
  },
  // Pastille de comptage, en badge d'angle sur la mini-card.
  ffPill: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(236,73,19,1.00)",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  ffPillText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#fff",
  },
  ffName: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#111827",
    marginTop: 2,
  },
  ffMeta: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6b7280",
    marginTop: 1,
  },
  ffTotal: {
    fontSize: 12,
    fontWeight: "800",
    color: "#111827",
    marginTop: 1,
  },
});
