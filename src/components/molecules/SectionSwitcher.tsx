import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, TouchableOpacity, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Theme } from "@/src/theme";

export interface SwitcherSection {
  key: string;
  icon: string;
}

interface SectionSwitcherProps {
  sections: SwitcherSection[];
  activeKey: string;
  onSelect: (key: string) => void;
  /** Position depuis le bas (au-dessus de la tab bar). */
  bottom: number;
  right?: number;
}

const SIZE = 56;
const ITEM_SIZE = 48;
const GAP = 12;
// Diamètre de la zone de sécurité circulaire centrée sur le bouton switch.
// Tout tap à l'intérieur est capturé (n'atteint pas les éléments en dessous).
const SAFE_ZONE = 170;

/**
 * Bouton flottant qui, au clic, déploie verticalement (vers le haut) les icônes
 * des AUTRES sections avec une animation. L'utilisateur tape une icône pour
 * switcher : le menu se referme et le bouton principal adopte l'icône de la
 * nouvelle section active. Re-taper le bouton principal referme sans changer.
 */
export const SectionSwitcher: React.FC<SectionSwitcherProps> = ({
  sections,
  activeKey,
  onSelect,
  bottom,
  right = 20,
}) => {
  const [open, setOpen] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const activeSection =
    sections.find((s) => s.key === activeKey) ?? sections[0];
  const others = sections.filter((s) => s.key !== activeKey);

  useEffect(() => {
    Animated.spring(anim, {
      toValue: open ? 1 : 0,
      useNativeDriver: true,
      tension: 70,
      friction: 9,
    }).start();
  }, [open, anim]);

  // Referme le menu si la section active change (après un switch).
  useEffect(() => {
    setOpen(false);
  }, [activeKey]);

  const handleSelect = (key: string) => {
    onSelect(key);
    setOpen(false);
  };

  // Quand le menu est ouvert, la zone s'étend vers le HAUT pour couvrir toute la
  // colonne d'icônes déployées (capsule). Fermé : simple cercle autour du bouton.
  const expandHeight = open ? others.length * (ITEM_SIZE + GAP) : 0;
  const zoneHeight = SAFE_ZONE + expandHeight;

  return (
    <>
      {/* Zone de sécurité centrée sur le bouton switch. Cercle quand fermé,
          capsule étendue vers le haut quand ouvert (couvre les icônes déployées).
          Tout tap à l'intérieur est capturé (ferme le menu si ouvert) et n'atteint
          JAMAIS les éléments en dessous (ex. bouton "Valider commande"). Le fond
          coloré rend la zone visible pour valider sa délimitation. */}
      <Pressable
        style={[
          styles.safeZone,
          {
            height: zoneHeight,
            // Le bas reste ancré au centre du bouton ; la zone grandit vers le haut.
            bottom: bottom + SIZE / 2 - SAFE_ZONE / 2,
            right: right + SIZE / 2 - SAFE_ZONE / 2,
          },
        ]}
        onPress={() => setOpen(false)}
        android_disableSound
      />


      <View style={[styles.root, { bottom, right }]} pointerEvents="box-none">
        {/* Icônes des autres sections, empilées vers le haut. */}
        {others.map((section, idx) => {
          // La plus proche du bouton principal sort en premier (idx 0 → juste au-dessus).
          const offset = (idx + 1) * (ITEM_SIZE + GAP);
          const translateY = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -offset],
          });
          const opacity = anim.interpolate({
            inputRange: [0, 0.4, 1],
            outputRange: [0, 0, 1],
          });
          return (
            <Animated.View
              key={section.key}
              style={[
                styles.itemWrapper,
                { transform: [{ translateY }, { scale: anim }], opacity },
              ]}
              pointerEvents={open ? "auto" : "none"}
            >
              <TouchableOpacity
                style={styles.item}
                onPress={() => handleSelect(section.key)}
                activeOpacity={0.85}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name={section.icon as any} size={20} color="white" />
              </TouchableOpacity>
            </Animated.View>
          );
        })}

        {/* Bouton principal = section active. */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setOpen((o) => !o)}
          activeOpacity={0.85}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name={activeSection.icon as any} size={24} color="white" />
        </TouchableOpacity>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  safeZone: {
    position: "absolute",
    width: SAFE_ZONE,
    // height fourni dynamiquement (cercle fermé / capsule ouverte).
    borderRadius: SAFE_ZONE / 2,
    // Zone de capture invisible (transparente).
    backgroundColor: "transparent",
    zIndex: 1050,
    elevation: 1050,
  },
  root: {
    position: "absolute",
    width: SIZE,
    alignItems: "center",
    zIndex: 1100,
    elevation: 1100,
  },
  fab: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: Theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  itemWrapper: {
    position: "absolute",
    bottom: (SIZE - ITEM_SIZE) / 2,
    zIndex: 1200,
    elevation: 1200,
  },
  item: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: ITEM_SIZE / 2,
    backgroundColor: Theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },
});
