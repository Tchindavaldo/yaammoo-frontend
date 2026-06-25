import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Dimensions,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import AuthSheetContent from "@/src/features/auth/components/AuthSheetContent";
import { useAuth } from "@/src/features/auth/context/AuthContext";

const { height: SCREEN_H } = Dimensions.get("window");

interface AuthGateValue {
  /**
   * Exécute `action` si l'utilisateur est connecté. Sinon, ouvre la sheet
   * d'auth (Apple / Google / email) en overlay et ne fait rien d'autre.
   * Retourne `true` si l'action a été exécutée, `false` si l'auth a été demandée.
   */
  requireAuth: (action?: () => void) => boolean;
  /** true si l'utilisateur est connecté (raccourci pour masquer des CTA). */
  isSignedIn: boolean;
}

const AuthGateContext = createContext<AuthGateValue | undefined>(undefined);

/**
 * AuthGate — passerelle "invité → compte".
 *
 * Les invités peuvent parcourir l'app (home, boutique). Dès qu'ils déclenchent
 * une action liée à un compte (panier, commande, profil), on appelle
 * `requireAuth()` qui affiche la sheet de connexion par-dessus le contenu.
 * Après connexion, le guard de navigation révèle l'app authentifiée comme
 * d'habitude (cf. app/_layout.tsx) ; l'overlay se ferme automatiquement.
 */
export function AuthGateProvider({ children }: { children: React.ReactNode }) {
  const { user, userData } = useAuth();
  const isSignedIn = !!user && !!userData;

  const [open, setOpen] = useState(false);
  const slide = useRef(new Animated.Value(0)).current;

  const close = useCallback(() => setOpen(false), []);

  const requireAuth = useCallback(
    (action?: () => void) => {
      if (isSignedIn) {
        action?.();
        return true;
      }
      setOpen(true);
      return false;
    },
    [isSignedIn],
  );

  // Si l'utilisateur se connecte alors que l'overlay est ouvert, on le ferme.
  useEffect(() => {
    if (isSignedIn && open) setOpen(false);
  }, [isSignedIn, open]);

  useEffect(() => {
    Animated.spring(slide, {
      toValue: open ? 1 : 0,
      useNativeDriver: true,
      damping: 18,
      stiffness: 140,
      mass: 0.9,
    }).start();
  }, [open, slide]);

  // Décalage clavier : on translate le sheet entier vers le haut de la hauteur
  // du clavier (un KeyboardAvoidingView interne est inopérant ici, le sheet
  // étant positionné en absolu + transform). Combiné avec l'anim d'ouverture.
  const keyboardOffset = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvt, (e) => {
      Animated.timing(keyboardOffset, {
        toValue: e.endCoordinates.height,
        duration: Platform.OS === "ios" ? e.duration ?? 250 : 150,
        useNativeDriver: true,
      }).start();
    });
    const hideSub = Keyboard.addListener(hideEvt, (e) => {
      Animated.timing(keyboardOffset, {
        toValue: 0,
        duration: Platform.OS === "ios" ? e.duration ?? 250 : 150,
        useNativeDriver: true,
      }).start();
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardOffset]);

  const openTranslateY = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_H, 0],
  });
  // translateY final = position d'ouverture − hauteur clavier (remonte le sheet).
  const sheetTranslateY = Animated.subtract(openTranslateY, keyboardOffset);
  const backdropOpacity = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <AuthGateContext.Provider value={{ requireAuth, isSignedIn }}>
      {children}

      {open && (
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: backdropOpacity, zIndex: 999 }]}
          pointerEvents="auto"
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={close}>
            <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
            <View style={styles.backdropDim} />
          </Pressable>
        </Animated.View>
      )}

      <Animated.View
        style={[styles.sheet, { transform: [{ translateY: sheetTranslateY }] }]}
        pointerEvents={open ? "auto" : "none"}
      >
        <View style={styles.sheetHandle} />
        <ScrollView
          bounces={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AuthSheetContent />
        </ScrollView>
      </Animated.View>
    </AuthGateContext.Provider>
  );
}

export function useAuthGate(): AuthGateValue {
  const ctx = useContext(AuthGateContext);
  if (!ctx) {
    throw new Error("useAuthGate doit être utilisé dans un AuthGateProvider");
  }
  return ctx;
}

const styles = StyleSheet.create({
  backdropDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(20,20,20,0.25)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: SCREEN_H * 0.82,
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 8,
    paddingBottom: 24,
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 20,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#e0e0de",
    marginTop: 8,
    marginBottom: 4,
  },
});
