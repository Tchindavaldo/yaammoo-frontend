import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * Clavier alphanumerique CUSTOM du flux email.
 *
 * ⚠️ Meme raison que `NumericKeypad` : on n'ouvre PAS le clavier natif, dont la
 * hauteur varie selon l'appareil et l'OS et ferait sauter la sheet. Ici les
 * touches font partie de la sheet, la hauteur est constante.
 *
 * Trois dispositions, commutees par la touche de gauche de la derniere rangee :
 * lettres, chiffres, symboles. La touche `@` est toujours visible — c'est une
 * saisie d'email.
 */

interface TextKeyboardProps {
  onPress: (char: string) => void;
  onDelete: () => void;
  disabled?: boolean;
}

const LETTERS = [
  ["a", "z", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["q", "s", "d", "f", "g", "h", "j", "k", "l", "m"],
  ["w", "x", "c", "v", "b", "n"],
];

const DIGITS = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["-", "_", ".", ":", ";", "(", ")", "&", "#", "!"],
  ["+", "=", "/", "*", "?", "%"],
];

const SYMBOLS = [
  ["€", "$", "£", "¥", "^", "[", "]", "{", "}", "~"],
  ["\\", "|", "<", ">", "\"", "'", "`", "°", "§", "¤"],
  [",", ";", "!", "?", "…", "·"],
];

type Layout = "letters" | "digits" | "symbols";

export const TextKeyboard: React.FC<TextKeyboardProps> = ({
  onPress,
  onDelete,
  disabled = false,
}) => {
  const [layout, setLayout] = React.useState<Layout>("letters");
  const [shift, setShift] = React.useState(false);

  const rows =
    layout === "letters" ? LETTERS : layout === "digits" ? DIGITS : SYMBOLS;

  const emit = (char: string) => {
    onPress(layout === "letters" && shift ? char.toUpperCase() : char);
    // La majuscule ne vaut que pour UNE frappe (comportement d'un clavier
    // systeme) : sans ca, tout le reste de la saisie partirait en capitales.
    if (shift) setShift(false);
  };

  const renderKey = (char: string) => (
    <TouchableOpacity
      key={char}
      style={styles.key}
      onPress={() => emit(char)}
      disabled={disabled}
      activeOpacity={0.6}
    >
      <Text style={styles.keyLabel}>
        {layout === "letters" && shift ? char.toUpperCase() : char}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.pad, disabled && styles.padDisabled]}>
      {rows.map((row, i) => (
        <View key={i} style={styles.row}>
          {/* La 3e rangee de lettres est plus courte : on la centre avec des
              demi-espaces, comme un clavier systeme. */}
          {i === 2 ? <View style={styles.halfKey} /> : null}
          {row.map(renderKey)}
          {i === 2 ? <View style={styles.halfKey} /> : null}
        </View>
      ))}

      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.key, styles.wideKey]}
          onPress={() =>
            setLayout((l) => (l === "letters" ? "digits" : "letters"))
          }
          disabled={disabled}
          activeOpacity={0.6}
        >
          <Text style={styles.modLabel}>
            {layout === "letters" ? "123" : "abc"}
          </Text>
        </TouchableOpacity>

        {layout === "letters" ? (
          <TouchableOpacity
            style={styles.key}
            onPress={() => setShift((s) => !s)}
            disabled={disabled}
            activeOpacity={0.6}
          >
            <Ionicons
              name={shift ? "arrow-up-circle" : "arrow-up-circle-outline"}
              size={22}
              color="#141414"
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.key}
            onPress={() =>
              setLayout((l) => (l === "symbols" ? "digits" : "symbols"))
            }
            disabled={disabled}
            activeOpacity={0.6}
          >
            <Text style={styles.modLabel}>
              {layout === "symbols" ? "123" : "#+="}
            </Text>
          </TouchableOpacity>
        )}

        {renderKey("@")}
        {renderKey(".")}

        <TouchableOpacity
          style={[styles.key, styles.wideKey]}
          onPress={onDelete}
          disabled={disabled}
          activeOpacity={0.6}
        >
          <Ionicons name="backspace-outline" size={22} color="#141414" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  pad: { width: "100%", gap: 6 },
  padDisabled: { opacity: 0.4 },
  row: { flexDirection: "row", gap: 4 },
  key: {
    flex: 1,
    height: 42,
    borderRadius: 8,
    backgroundColor: "#f4f4f3",
    alignItems: "center",
    justifyContent: "center",
  },
  wideKey: { flex: 1.4 },
  halfKey: { flex: 0.5 },
  keyLabel: { fontSize: 17, fontWeight: "500", color: "#141414" },
  modLabel: { fontSize: 13, fontWeight: "700", color: "#141414" },
});
