import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
// Safe-area basse : source unique (R19), cf. blur-safe-area.md §4.
import { useSheetSafeInsets as useSafeAreaInsets } from "@/src/hooks/usePageBottomInset";
import { SafeAreaDebugBand } from "@/src/components/SafeAreaDebugBand";
import {
  CartFilterOption,
  CartFilterOptionRow,
  CartFilterKind,
  filterChipIcons,
  filterChipLabels,
} from "./CartFilterChipsRow";

interface CartFilterOptionsSheetProps {
  visible: boolean;
  /** Axe ouvert : pilote le titre, l'icône et la liste affichée. */
  kind: CartFilterKind | null;
  options: CartFilterOption[];
  selected: string | null;
  /** `null` = « Toutes » (aucun filtre sur cet axe). */
  onSelect: (key: string | null) => void;
  onClose: () => void;
}

/**
 * Bottom sheet de choix d'une valeur de filtre du panier (zone, période ou
 * heure). Sélection UNIQUE par axe : choisir une valeur ferme le sheet.
 */
export const CartFilterOptionsSheet: React.FC<CartFilterOptionsSheetProps> = ({
  visible,
  kind,
  options,
  selected,
  onSelect,
  onClose,
}) => {
  const insets = useSafeAreaInsets();

  // Backdrop en fondu + sheet qui glisse (même animation que CartFilterSheet).
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) return;
    fade.setValue(0);
    slide.setValue(1);
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(slide, {
        toValue: 0,
        useNativeDriver: true,
        damping: 22,
        stiffness: 200,
      }),
    ]).start();
  }, [visible]);

  const total = options.reduce((s, o) => s + o.count, 0);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.backdrop, { opacity: fade }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          {
            // Contenu pose sur la bande safe-area, sans marge en plus (R19).
            paddingBottom: insets.bottom,
            transform: [
              {
                translateY: slide.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 400],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.header}>
          <Ionicons
            name={kind ? filterChipIcons[kind] : "options-outline"}
            size={16}
            color="#0f172a"
          />
          <Text style={styles.title}>
            {kind ? filterChipLabels[kind] : ""}
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={22} color="#888780" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ gap: 8 }}>
            <CartFilterOptionRow
              option={{ key: "__all__", label: "Toutes", count: total }}
              active={selected === null}
              onPress={() => {
                onSelect(null);
                onClose();
              }}
            />
            {options.map((o) => (
              <CartFilterOptionRow
                key={o.key}
                option={o}
                active={selected === o.key}
                onPress={() => {
                  onSelect(o.key);
                  onClose();
                }}
              />
            ))}
            {options.length === 0 && (
              <Text style={styles.empty}>Aucune valeur disponible</Text>
            )}
          </View>
        </ScrollView>
        <SafeAreaDebugBand />
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "70%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: "bold",
    color: "#0f172a",
    letterSpacing: 0.4,
  },
  empty: {
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 12,
    paddingVertical: 20,
  },
});
