import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

/** Les trois axes de filtrage du panier. */
export type CartFilterKind = "zone" | "periode" | "heure";

export interface CartFilterChip {
  kind: CartFilterKind;
  /** Valeur choisie, ou `null` tant qu'aucun filtre n'est posé sur cet axe. */
  value: string | null;
}

interface CartFilterChipsRowProps {
  chips: CartFilterChip[];
  /** Ouvre le bottom sheet de l'axe touché. */
  onOpen: (kind: CartFilterKind) => void;
  /** Retire le filtre de l'axe (croix du chip actif). */
  onClear: (kind: CartFilterKind) => void;
}

const LABELS: Record<CartFilterKind, string> = {
  zone: "Zone de livraison",
  periode: "Période",
  heure: "Heure",
};

const ICONS: Record<CartFilterKind, keyof typeof Ionicons.glyphMap> = {
  zone: "location",
  periode: "flash-outline",
  heure: "time-outline",
};

/**
 * Reglages d'espacement de la ligne de chips, regroupes ici pour etre ajustes
 * d'un seul endroit.
 *
 * ATTENTION : le padding INTERNE d'un chip n'a d'effet visible que si le chip
 * est a la largeur de son contenu. Avec `CHIP_FLEX = 1` les chips se partagent
 * toute la largeur et sont donc plus larges que leur contenu : le padding
 * interne devient invisible, seuls `ROW_PADDING_H` et `CHIP_GAP` comptent.
 * Passer `CHIP_FLEX` a `undefined` redonne la main au padding interne.
 */
const ROW_PADDING_H = 12; // marge entre les bords de l'ecran et les chips
const ROW_GAP = 8; // espace ENTRE deux chips
const CHIP_PADDING_H = 4; // padding interne gauche/droite d'un chip
const CHIP_GAP = 6; // espace icone / texte / chevron dans un chip
const CHIP_FLEX: number | undefined = 0; // 1 = chips a largeur egale

// Chip selectionne : teinte legere, jamais un aplat fonce.
const ACTIVE_BG = "#f1f5f9";
const ACTIVE_BORDER = "#cbd5e1";

/**
 * Ligne des 3 chips de filtre du panier (Zone / Période / Heure), en tête de
 * liste. Un tap ouvre le bottom sheet correspondant ; le chip porte ensuite la
 * valeur choisie et une croix pour l'effacer.
 */
export const CartFilterChipsRow: React.FC<CartFilterChipsRowProps> = ({
  chips,
  onOpen,
  onClear,
}) => (
  // Ligne FIXE de 3 chips repartis sur toute la largeur (pas de scroll : leur
  // nombre est constant). La liste n'a plus de padding horizontal, les chips
  // le portent.
  <View
    style={{
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: ROW_GAP,
      paddingBottom: 12,
      paddingHorizontal: ROW_PADDING_H,
    }}
  >
    {chips.map((c) => {
      const active = c.value !== null;
      return (
        <TouchableOpacity
          key={c.kind}
          activeOpacity={0.8}
          onPress={() => onOpen(c.kind)}
          style={{
            flex: CHIP_FLEX,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: CHIP_GAP,
            paddingLeft: CHIP_PADDING_H,
            paddingRight: active ? 6 : CHIP_PADDING_H,
            height: 32,
            borderRadius: 16,
            borderWidth: 1,
            // Selection = fond LEGER teinte, pas un aplat noir : le texte et
            // l'icone restent lisibles en fonce.
            backgroundColor: active ? ACTIVE_BG : "#fff",
            borderColor: active ? ACTIVE_BORDER : "#e2e8f0",
          }}
        >
          <Ionicons name={ICONS[c.kind]} size={13} color="#0f172a" />
          <Text
            style={{
              color: "#0f172a",
              fontSize: 12,
              fontWeight: "bold",
              letterSpacing: 0.4,
              maxWidth: 140,
            }}
            numberOfLines={1}
          >
            {/* Seule la ZONE garde son prefixe (« Zone Bonamoussadi ») : un nom
                de quartier seul ne dirait pas de quoi il s'agit. Periode et
                heure se suffisent a elles-memes (« Express », « 12h »). */}
            {!active
              ? LABELS[c.kind]
              : c.kind === "zone"
                ? `Zone ${c.value}`
                : c.value}
          </Text>

          {active ? (
            <TouchableOpacity
              onPress={() => onClear(c.kind)}
              hitSlop={8}
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#00000010",
              }}
            >
              <Ionicons name="close" size={12} color="#0f172a" />
            </TouchableOpacity>
          ) : (
            <Ionicons name="chevron-down" size={12} color="#64748b" />
          )}
        </TouchableOpacity>
      );
    })}
  </View>
);

/** Option listée dans un `CartFilterOptionsSheet`. */
export interface CartFilterOption {
  key: string;
  label: string;
  count: number;
}

interface CartFilterOptionsSheetProps {
  visible: boolean;
  kind: CartFilterKind | null;
  options: CartFilterOption[];
  selected: string | null;
  onSelect: (key: string | null) => void;
  onClose: () => void;
}

/** Titre du sheet selon l'axe ouvert. */
export const sheetTitle = (kind: CartFilterKind | null) =>
  kind ? LABELS[kind] : "";

/** Icône du sheet selon l'axe ouvert. */
export const sheetIcon = (kind: CartFilterKind | null) =>
  kind ? ICONS[kind] : "options-outline";

export const filterChipIcons = ICONS;
export const filterChipLabels = LABELS;

export type { CartFilterOptionsSheetProps };

/** Rendu d'une ligne d'option (utilisé par le sheet). */
export const CartFilterOptionRow: React.FC<{
  option: CartFilterOption;
  active: boolean;
  onPress: () => void;
}> = ({ option, active, onPress }) => (
  <TouchableOpacity
    activeOpacity={0.8}
    onPress={onPress}
    style={{
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 12,
      borderWidth: 1,
      backgroundColor: active ? "#0f172a" : "#fff",
      borderColor: active ? "#0f172a" : "#e2e8f0",
    }}
  >
    <Text
      style={{
        flex: 1,
        color: active ? "#fff" : "#0f172a",
        fontSize: 13,
        fontWeight: "bold",
      }}
      numberOfLines={1}
    >
      {option.label}
    </Text>
    <View
      style={{
        minWidth: 20,
        paddingHorizontal: 6,
        height: 20,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: active ? "#ffffff22" : "#f1f5f9",
      }}
    >
      <Text
        style={{
          color: active ? "#fff" : "#64748b",
          fontSize: 10,
          fontWeight: "bold",
        }}
      >
        {option.count}
      </Text>
    </View>
    {active && <Ionicons name="checkmark" size={16} color="#fff" />}
  </TouchableOpacity>
);
