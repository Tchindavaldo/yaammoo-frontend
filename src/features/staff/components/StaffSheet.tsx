import React, { useEffect, useState } from "react";
import {
  Animated,
  Easing,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ST } from "./staffTheme";

interface Props {
  onClose: () => void;
  /** Hauteur pleine (formulaires) ; sinon ajustée au contenu. */
  full?: boolean;
  /** En-tête fixe au-dessus du contenu défilant. */
  header: React.ReactNode;
  /** Bouton d'action fixe, remonté au-dessus du clavier. */
  footer?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Feuille remontant du bas, rendue dans l'overlay de l'écran Personnel (pas
 * de <Modal>). Au repos le bas se cale sur la bande safe-area réservée par
 * la page ; clavier ouvert, au-dessus du clavier (même mécanique que le
 * composeur de notifications).
 */
export const StaffSheet: React.FC<Props> = ({ onClose, full = false, header, footer, children }) => {
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const [enter] = useState(() => new Animated.Value(0));
  const [keyboard, setKeyboard] = useState(0);

  useEffect(() => {
    // Driver JS : une opacité animée en natif peut bloquer le défilement
    // interne sur Android (cf. architecture/blur-safe-area.md).
    Animated.timing(enter, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [enter]);

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

  const topGap = insets.top + 24;
  // Rendue dans la page Personnel (ShopPageFrame) : la safe-area basse est
  // déjà réservée et tronquée sous la feuille. Au repos, rien à ajouter (R19).
  const bottomPad = keyboard > 0 ? keyboard + 10 : 0;
  const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [60, 0] });

  return (
    // zIndex au-dessus de StaffHeader (10) : le voile couvre aussi l'en-tête.
    <View style={[StyleSheet.absoluteFill, { zIndex: 20 }]}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: enter }]}>
        <Pressable
          style={[StyleSheet.absoluteFill, styles.backdrop]}
          onPress={() => (keyboard > 0 ? Keyboard.dismiss() : onClose())}
          accessibilityLabel="Fermer"
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          full ? { top: topGap } : { maxHeight: screenH - topGap },
          { opacity: enter, transform: [{ translateY }] },
        ]}
      >
        <View style={styles.handle} />
        {header}
        <ScrollView
          style={full ? styles.scrollFull : styles.scrollFit}
          contentContainerStyle={[styles.content, !footer && { paddingBottom: keyboard > 0 ? bottomPad : 8 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
        {footer && <View style={[styles.footer, { paddingBottom: bottomPad }]}>{footer}</View>}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: { backgroundColor: ST.backdrop },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 8,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: "#fff",
    gap: 14,
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: ST.idle,
  },
  scrollFull: { flex: 1 },
  scrollFit: { flexGrow: 0, flexShrink: 1 },
  content: { paddingHorizontal: 16, gap: 16 },
  footer: { paddingHorizontal: 20, paddingTop: 8 },
});
