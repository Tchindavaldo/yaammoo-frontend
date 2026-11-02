import { GlobalToastHost } from "@/src/components/GlobalToastHost";
import { useSheetSafeInsets } from "@/src/hooks/usePageBottomInset";
import { AppLanguage, LANGUAGES, getLanguage, setLanguage, t } from "@/src/i18n";
import { DS } from "@/src/theme/ds";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface Props {
  visible: boolean;
  onClose: () => void;
}

/**
 * Bottom sheet de Settings : choix de la langue (Français / English).
 * Choisir une autre langue l'enregistre puis recharge l'app (src/i18n).
 */
export function LanguageSheet({ visible, onClose }: Props) {
  const insets = useSheetSafeInsets();
  const current = getLanguage();
  const [pending, setPending] = useState<AppLanguage | null>(null);

  const choose = (code: AppLanguage) => {
    if (pending) return;
    if (code === current) {
      onClose();
      return;
    }
    setPending(code);
    setLanguage(code);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom }]}>
        <View style={styles.handle} />
        <Text style={styles.title}>{t("Langue")}</Text>
        {LANGUAGES.map(({ code, label }) => {
          const active = code === current;
          return (
            <TouchableOpacity
              key={code}
              style={[styles.row, active && styles.rowActive]}
              onPress={() => choose(code)}
              activeOpacity={0.7}
              disabled={!!pending}
            >
              <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
              {pending === code ? (
                <ActivityIndicator color={DS.accent} size="small" />
              ) : active ? (
                <Ionicons name="checkmark-circle" size={22} color={DS.accent} />
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
      {/* Toast global au premier plan (Android). */}
      <GlobalToastHost modal />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: DS.backdrop,
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: DS.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: DS.track,
    marginBottom: 6,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: DS.ink,
    marginBottom: 4,
  },
  row: {
    height: 54,
    borderRadius: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: DS.surface,
  },
  rowActive: {
    backgroundColor: DS.accentWash,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
    color: DS.ink,
  },
  labelActive: {
    color: DS.accentText,
  },
});
