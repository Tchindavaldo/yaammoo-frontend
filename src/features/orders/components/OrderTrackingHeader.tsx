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

/** Un fastfood ayant des commandes en cours sur la date/statut sélectionné. */
export interface TrackedFastFood {
  id: string;
  name: string;
  image?: string;
  orderCount: number;
  /** Commandes de la date sélectionnée, par statut (pastilles de la carte). */
  counts: { pending: number; active: number; finished: number };
}

interface OrderTrackingHeaderProps {
  /** Fastfoods dont des commandes sont en cours (liste horizontale du haut). */
  fastFoods?: TrackedFastFood[];
  /** Fastfood filtré (`null` = tous). */
  selectedFastFoodId?: string | null;
  onFastFoodPress?: (id: string | null) => void;
}

const FastFoodAvatar = ({ item }: { item: TrackedFastFood }) => {
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


/**
 * Pastille unique : total des commandes (en attente + en cours + terminées)
 * du fastfood pour la DATE sélectionnée.
 */
const CountPill = ({ counts }: { counts: TrackedFastFood["counts"] }) => {
  const total = counts.pending + counts.active + counts.finished;
  if (total === 0) return null;
  return (
    <View style={styles.ffPill}>
      <Text style={styles.ffPillText}>{total}</Text>
    </View>
  );
};

/**
 * Carte fastfood servant de filtre : avatar seul dans la liste scrollable.
 * Le nom n'est affiché que dans le slot fixe de gauche (fastfood sélectionné).
 */
const FastFoodPill = React.memo(function FastFoodPill({
  item,
  selected,
  onPress,
}: {
  item: TrackedFastFood;
  selected: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={!onPress}
      style={[styles.ffCard, selected && styles.ffCardActive]}
    >
      <View style={[styles.ffAvatar, selected && styles.ffAvatarActive]}>
        <FastFoodAvatar item={item} />
      </View>
      <CountPill counts={item.counts} />
    </TouchableOpacity>
  );
});

export const OrderTrackingHeader: React.FC<OrderTrackingHeaderProps> = ({
  fastFoods = [],
  selectedFastFoodId = null,
  onFastFoodPress,
}) => {
  const selectedItem = fastFoods.find((f) => f.id === selectedFastFoodId);
  return (
    <View style={styles.container}>
      {/* Dates gérées par le header de page (TabHeader / DatePill). */}

      {/* Fastfoods avec commandes en cours : slot fixe (sélection, avec nom)
          à gauche + liste scrollable des avatars à droite. */}
      {fastFoods.length > 0 && (
        <View style={styles.ffRow}>
          {selectedItem && (
            <View style={styles.ffSelectedSlot}>
              <View style={styles.ffAvatar}>
                <FastFoodAvatar item={selectedItem} />
              </View>
              <View style={styles.ffInfo}>
                <Text
                  style={styles.ffName}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {selectedItem.name}
                </Text>
              </View>
            </View>
          )}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.ffScroll}
          >
            {fastFoods.map((ff) => {
              const selected = selectedFastFoodId === ff.id;
              return (
                <FastFoodPill
                  key={ff.id}
                  item={ff}
                  selected={selected}
                  onPress={
                    onFastFoodPress ? () => onFastFoodPress(ff.id) : undefined
                  }
                />
              );
            })}
          </ScrollView>
        </View>
      )}

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
  ffScroll: {
    paddingRight: 10,
    // Marge haute : le badge d'angle dépasse de la carte et ne doit pas être rogné.
    paddingTop: 4,
    gap: 8,
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
});
