import { AppBlurView } from "@/src/components/AppBlurView";
import { BlurScope, BlurTarget } from "@/src/components/BlurTarget";
import AuthSheetContent from "@/src/features/auth/components/AuthSheetContent";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { AUTH_SHEET_HEIGHT } from "@/src/features/auth/constants";
import { useBottomSafeArea } from "@/src/hooks/usePageBottomInset";
import { SafeAreaDebugBand } from "@/src/components/SafeAreaDebugBand";
import { DS } from "@/src/theme/ds";
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
  /**
   * `true` une fois « Explorer sans compte » touche sur l'ecran d'accueil :
   * l'invite entre dans (tabs). Vaut pour la session (pas de stockage) : a
   * chaque lancement, un non-connecte revoit l'ecran d'accueil. Remis a
   * `false` a la connexion, pour qu'une deconnexion ramene a l'accueil.
   */
  guestBrowsing: boolean;
  /** Entree en invite (Apple 5.1.1(v) : parcourir sans compte). */
  browseAsGuest: () => void;
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
  // Gouttiere basse = bande safe-area, ajoutee a la hauteur utile (R19).
  const band = useBottomSafeArea();
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

  const [guestBrowsing, setGuestBrowsing] = useState(false);
  const browseAsGuest = useCallback(() => setGuestBrowsing(true), []);
  // Connecte : le mode invite n'a plus lieu d'etre. Sans cette remise a zero,
  // une deconnexion laisserait l'utilisateur dans (tabs) au lieu de l'accueil.
  useEffect(() => {
    if (isSignedIn) setGuestBrowsing(false);
  }, [isSignedIn]);

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
    <AuthGateContext.Provider
      value={{ requireAuth, isSignedIn, guestBrowsing, browseAsGuest }}
    >
      <BlurScope>
      <BlurTarget style={styles.appTarget}>{children}</BlurTarget>

      {open && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { opacity: backdropOpacity, zIndex: 999 },
          ]}
          pointerEvents="auto"
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={close}>
            {/* Flou (iOS) ou voile blanc (Android, aucun flou), puis voile sombre. */}
            <AppBlurView
              intensity={30}
              tint="light"
              style={StyleSheet.absoluteFill}
              fallbackStyle={styles.backdropWhite}
            />
            <View style={styles.backdropDim} />
          </Pressable>
        </Animated.View>
      )}
      </BlurScope>

      <Animated.View
        style={[
          styles.sheet,
          { height: AUTH_SHEET_HEIGHT + band, paddingBottom: band },
          { transform: [{ translateY: sheetTranslateY }] },
        ]}
        pointerEvents={open ? "auto" : "none"}
      >
        {/* ⚠️ PAS de `ScrollView` : la sheet a une hauteur fixe et son contenu
            est calibre pour y tenir. Un scroll ne ferait que permettre de
            deplacer le contenu par accident. */}
        <View style={styles.sheetBody}>
          <AuthSheetContent />
        </View>
        <SafeAreaDebugBand />
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
  appTarget: { flex: 1 },
  backdropWhite: { backgroundColor: DS.frost },
  backdropDim: {
    ...StyleSheet.absoluteFill,
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
    // Hauteur et gouttiere basse portees au rendu (bande safe-area, R19).
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 0,
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 20,
  },
});
