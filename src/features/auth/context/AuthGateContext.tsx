// ⚠️ `expo-blur` en direct, PAS `AppBlurView` : ce dernier coupe le flou sous
// Android 12 pour eviter un crash lie au scroll. Ici rien ne defile derriere la
// sheet, donc on veut le flou sur toutes les versions.
import { BlurView } from "expo-blur";
import AuthSheetContent from "@/src/features/auth/components/AuthSheetContent";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import {
  AUTH_SHEET_HEIGHT,
  AUTH_SHEET_PADDING_BOTTOM,
} from "@/src/features/auth/constants";
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
  Pressable,
  StyleSheet,
  View,
} from "react-native";

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

  // ⚠️ La sheet NE REMONTE PAS avec le clavier — elle reste FIXE, comme celle
  // du panier groupe. La saisie ne se fait pas dans la sheet mais dans une
  // capsule flottante (`AuthFieldCapsule`), qui s'ancre elle-meme au clavier.
  // Translater la sheet en plus la ferait monter deux fois.
  const sheetTranslateY = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_H, 0],
  });
  const backdropOpacity = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <AuthGateContext.Provider value={{ requireAuth, isSignedIn }}>
      {children}

      {open && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { opacity: backdropOpacity, zIndex: 999 },
          ]}
          pointerEvents="auto"
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={close}>
            {/* Flou + voile sombre, sur les deux OS. `dimezisBlurView` est
                force meme sous Android 12 : le crash que `AppBlurView` evite
                vient du redessin d'une liste qui defile, et rien ne scrolle
                derriere cette sheet. */}
            <BlurView
              intensity={30}
              tint="light"
              style={StyleSheet.absoluteFill}
              experimentalBlurMethod="dimezisBlurView"
            />
            <View style={styles.backdropDim} />
          </Pressable>
        </Animated.View>
      )}

      <Animated.View
        style={[styles.sheet, { transform: [{ translateY: sheetTranslateY }] }]}
        pointerEvents={open ? "auto" : "none"}
      >
        {/* ⚠️ PAS de `ScrollView` : la sheet a une hauteur fixe et son contenu
            est calibre pour y tenir. Un scroll ne ferait que permettre de
            deplacer le contenu par accident. */}
        <View style={styles.sheetBody}>
          <AuthSheetContent />
        </View>
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
  sheetBody: { flex: 1 },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    // ⚠️ Hauteur FIXE, pas `maxHeight` : la sheet doit garder exactement la
    // meme taille sur tous ses ecrans (social, email, WhatsApp numero, WhatsApp
    // code). Avec `maxHeight` elle se dimensionnait sur son contenu et sautait
    // a chaque changement d'etape.
    height: AUTH_SHEET_HEIGHT,
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 0,
    paddingBottom: AUTH_SHEET_PADDING_BOTTOM,
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 20,
  },
});
