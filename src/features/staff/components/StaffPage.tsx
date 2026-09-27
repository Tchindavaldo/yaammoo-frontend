import React, { useEffect, useState } from "react";
import { Keyboard, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  /** En-tête fixe (titre, bouton fermer / retour). */
  header: React.ReactNode;
  /** Bouton d'action fixe en bas, remonté au-dessus du clavier. */
  footer?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Page entière (formulaires Nouveau membre / Rôle) : rendue dans le <Modal>
 * de StaffManageModal, elle couvre le header et la tab bar.
 */
export const StaffPage: React.FC<Props> = ({ header, footer, children }) => {
  const insets = useSafeAreaInsets();
  const [keyboard, setKeyboard] = useState(0);

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const s = Keyboard.addListener(showEvt, (e) => setKeyboard(e.endCoordinates.height));
    const h = Keyboard.addListener(hideEvt, () => setKeyboard(0));
    return () => {
      s.remove();
      h.remove();
    };
  }, []);

  const bottomPad = keyboard > 0 ? keyboard + 10 : insets.bottom + 12;

  return (
    <View style={[styles.page, { paddingTop: insets.top + 12 }]}>
      {header}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, !footer && { paddingBottom: bottomPad }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      {footer && <View style={[styles.footer, { paddingBottom: bottomPad }]}>{footer}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  page: { ...StyleSheet.absoluteFill, backgroundColor: "#fff", gap: 14 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 16, gap: 16 },
  footer: { paddingHorizontal: 20, paddingTop: 8 },
});
