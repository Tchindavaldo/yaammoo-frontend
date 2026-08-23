import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * Clavier numerique CUSTOM du flux WhatsApp.
 *
 * ⚠️ On n'ouvre PAS le clavier natif. Il change de hauteur d'un appareil a
 * l'autre (et d'un OS a l'autre), ce qui ferait sauter la sheet et masquerait
 * une partie du contenu. Ici les touches font partie de la sheet : la hauteur
 * est connue et constante.
 *
 * Les champs de saisie associes doivent donc etre `showSoftInputOnFocus={false}`
 * (ou de simples `<Text>`), sinon le clavier systeme remonterait par-dessus.
 */

interface NumericKeypadProps {
  onPress: (digit: string) => void;
  onDelete: () => void;
  /** Retour, rendu dans la case a gauche du 0 (vide si non fourni). */
  onBack?: () => void;
  /** Grise les touches pendant une requete. */
  disabled?: boolean;
}

/** Derniere rangee : pas de touche « vide » a gauche, on centre le 0. */
const ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
];

export const NumericKeypad: React.FC<NumericKeypadProps> = ({
  onPress,
  onDelete,
  onBack,
  disabled = false,
}) => {
  const renderKey = (label: string) => (
    <TouchableOpacity
      key={label}
      style={styles.key}
      onPress={() => onPress(label)}
      disabled={disabled}
      activeOpacity={0.6}
    >
      <Text style={styles.keyLabel}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.pad, disabled && styles.padDisabled]}>
      {ROWS.map((row) => (
        <View key={row[0]} style={styles.row}>
          {row.map(renderKey)}
        </View>
      ))}
      <View style={styles.row}>
        {/* Case a gauche du 0 : le retour s'y loge, sinon elle reste vide pour
            garder le 0 aligne avec le 2, 5 et 8. */}
        {onBack ? (
          <TouchableOpacity
            style={styles.key}
            onPress={onBack}
            disabled={disabled}
            activeOpacity={0.6}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="chevron-back" size={24} color="#141414" />
          </TouchableOpacity>
        ) : (
          <View style={styles.key} />
        )}
        {renderKey("0")}
        <TouchableOpacity
          style={styles.key}
          onPress={onDelete}
          disabled={disabled}
          activeOpacity={0.6}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="backspace-outline" size={24} color="#141414" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  pad: { width: "100%", gap: 6 },
  padDisabled: { opacity: 0.4 },
  row: { flexDirection: "row" },
  key: {
    flex: 1,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  keyLabel: {
    fontSize: 24,
    fontWeight: "500",
    color: "#141414",
  },
});
