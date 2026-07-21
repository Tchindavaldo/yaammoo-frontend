import { Theme } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Clipboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Bonus } from "../types/bonus.types";

interface BonusCredentialsSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Identifiants livrés (null = rien à afficher, la sheet ne s'ouvre pas). */
  credentials: NonNullable<Bonus["rewardCredentials"]> | null;
  /**
   * Section affichée : "account" (défaut) = email + mot de passe,
   * "profile" = nom du profil + son code. Les deux sont disjointes.
   */
  section?: "account" | "profile";
  /** Couleur d'accent du bonus (icônes de copie). */
  color: string;
  /** Titre de la récompense, ex. "Netflix 1 mois". */
  title?: string;
}

const DARK = Theme.colors.dark;
const GRAY = Theme.colors.gray[600];

/**
 * Bottom sheet des identifiants d'une récompense (Netflix…).
 * Une ligne par champ — Profil, Email, Mot de passe — chacune copiable
 * séparément (un mot de passe se colle seul, pas accolé au login).
 */
export const BonusCredentialsSheet: React.FC<BonusCredentialsSheetProps> = ({
  visible,
  onClose,
  credentials,
  section = "account",
  color,
  title,
}) => {
  const insets = useSafeAreaInsets();
  // Valeur copiée en dernier (null = aucune) — feedback éphémère de 2 s.
  const [copied, setCopied] = useState<string | null>(null);

  // Backdrop en FONDU + sheet qui glisse (le Modal natif ne fait pas monter le fond).
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) return;
    setCopied(null);
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

  if (!credentials) return null;
  // Section profil demandée sur un bonus sans profil : rien à montrer.
  if (section === "profile" && !credentials.profile) return null;

  const handleCopy = (value: string) => {
    Clipboard.setString(value);
    setCopied(value);
    setTimeout(() => setCopied(null), 2000);
  };

  type Row = {
    label: string;
    value: string;
    icon: keyof typeof Ionicons.glyphMap;
  };

  // Le profil n'est pas toujours fourni (undefined hors Netflix & co.).
  const profileRows: Row[] = credentials.profile
    ? [
        {
          label: "Profil",
          value: credentials.profile.name,
          icon: "person-outline",
        },
        {
          label: "Code du profil",
          value: credentials.profile.code,
          icon: "keypad-outline",
        },
      ]
    : [];

  const accountRows: Row[] = [
    { label: "Email", value: credentials.login, icon: "mail-outline" },
    {
      label: "Mot de passe",
      value: credentials.password,
      icon: "lock-closed-outline",
    },
  ];

  // Contenus disjoints : chaque bouton n'ouvre que sa section.
  const rows: Row[] = section === "profile" ? profileRows : accountRows;

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
            paddingBottom: insets.bottom + 16,
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
        <View style={styles.handle} />

        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>
              {section === "profile" ? "Ton profil" : "Tes identifiants"}
            </Text>
            {!!title && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {title}
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={22} color={GRAY} />
          </TouchableOpacity>
        </View>

        {rows.map((r) => (
          <TouchableOpacity
            key={r.label}
            style={styles.row}
            onPress={() => handleCopy(r.value)}
            activeOpacity={0.7}
          >
            <View style={[styles.rowIcon, { backgroundColor: `${color}1f` }]}>
              <Ionicons name={r.icon} size={18} color={color} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>{r.label}</Text>
              <Text style={styles.rowValue} numberOfLines={1} selectable>
                {r.value}
              </Text>
            </View>
            <Ionicons
              name={copied === r.value ? "checkmark" : "copy-outline"}
              size={20}
              color={copied === r.value ? "#16a34a" : GRAY}
            />
          </TouchableOpacity>
        ))}

        <Text style={styles.hint}>Appuie sur une ligne pour la copier.</Text>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.12)",
    marginBottom: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  headerText: { flex: 1 },
  title: { fontSize: 17, fontWeight: "800", color: DARK },
  subtitle: { fontSize: 12, color: GRAY, marginTop: 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: Theme.colors.gray[100],
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 11, color: GRAY, fontWeight: "600" },
  rowValue: { fontSize: 14, color: DARK, fontWeight: "700", marginTop: 1 },
  hint: {
    fontSize: 11,
    color: GRAY,
    textAlign: "center",
    marginTop: 4,
  },
});
