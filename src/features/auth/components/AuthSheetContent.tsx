import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { handleGoogleSignIn } from "@/src/features/auth/services/googleAuthService";
import { handleAppleSignIn } from "@/src/features/auth/services/appleAuthService";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "@/src/services/firebase";
import { authService } from "@/src/features/auth/services/authService";
import { userFirestore } from "@/src/features/auth/services/userFirestore";
import { Users, UsersInfos } from "@/src/types";
import { WhatsAppAuthStep } from "./WhatsAppAuthStep";
import { AppleIcon, GoogleIcon, WhatsAppIcon } from "./AuthProviderIcons";

export default function AuthSheetContent() {
  const { user, userData, setUserData } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  // "social" = boutons Apple/Google ; "login" = email+password (connexion) ;
  // "register" = email+password (création de compte). login/register partagent
  // la même UI, seuls le bouton et le handler changent.
  const [emailMode, setEmailMode] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  // Sous-flux WhatsApp (numero puis code). Rendu par un composant dedie qui
  // remplace tout le contenu de la sheet le temps des deux etapes.
  const [whatsappMode, setWhatsappMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  // Réinitialise le sheet quand l'utilisateur n'est PAS connecté (boot invité,
  // ou retour après déconnexion/suppression). Au login on laisse les loaders
  // actifs jusqu'au démontage ; mais comme ce composant n'est jamais démonté
  // (écran Welcome + overlay AuthGate), il faut nettoyer dès que le compte
  // disparaît, sinon on rouvre la sheet avec un loader bloqué / le mode email.
  const signedOut = !user && !userData;
  useEffect(() => {
    if (signedOut) {
      setEmailMode(false);
      setIsRegister(false);
      setWhatsappMode(false);
      setGoogleLoading(false);
      setAppleLoading(false);
      setLoggingIn(false);
      setEmail("");
      setPassword("");
      setShowPassword(false);
    }
  }, [signedOut]);

  const onGoogle = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    try {
      const result = await handleGoogleSignIn();
      if (result.success && result.userData) {
        // La redirection vers (tabs) est pilotée par le guard Stack.Protected
        // dans app/_layout.tsx dès que isSignedIn passe à true. NE PAS appeler
        // router.replace ici : il s'exécuterait avant que le guard soit prêt
        // → groupe (tabs) non monté → écran blanc/noir transitoire.
        // ⚠️ On NE coupe PAS le loader sur succès : on le laisse tourner jusqu'à
        // ce que la home soit montée (l'écran auth se démonte alors tout seul).
        // Évite le flash blanc le temps que la home charge.
        setUserData(result.userData);
        return;
      } else if (result.error && result.error !== "Connexion annulée") {
        Alert.alert("Erreur Google", result.error);
      }
      setGoogleLoading(false);
    } catch {
      Alert.alert("Erreur", "Connexion Google échouée.");
      setGoogleLoading(false);
    }
  };

  const onApple = async () => {
    if (appleLoading) return;
    setAppleLoading(true);
    try {
      const result = await handleAppleSignIn();
      if (result.success && result.userData) {
        // Loader maintenu jusqu'au montage de la home (voir onGoogle).
        setUserData(result.userData);
        return;
      } else if (result.error && result.error !== "Connexion annulée") {
        Alert.alert("Erreur Apple", result.error);
      }
      setAppleLoading(false);
    } catch {
      Alert.alert("Erreur", "Connexion Apple échouée.");
      setAppleLoading(false);
    }
  };

  const onLogin = async () => {
    if (loggingIn) return;
    if (!email || !password) {
      Alert.alert("Erreur", "L'email ou le mot de passe ne doit pas être vide.");
      return;
    }
    setLoggingIn(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const data = await authService.getUserById(cred.user.uid);
      // Loader maintenu jusqu'au montage de la home (voir onGoogle).
      if (data) {
        setUserData(data);
        return;
      }
      setLoggingIn(false);
    } catch (err: any) {
      Alert.alert("Erreur", err?.message ?? "Connexion échouée.");
      setLoggingIn(false);
    }
  };

  const onRegister = async () => {
    if (loggingIn) return;
    if (!email || !password) {
      Alert.alert("Erreur", "L'email ou le mot de passe ne doit pas être vide.");
      return;
    }
    setLoggingIn(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = cred.user;
      // Nom par défaut depuis l'email (le profil pourra être complété plus tard).
      const nom = email.split("@")[0] || "Utilisateur";
      const newUser = new Users(
        firebaseUser.uid,
        firebaseUser.uid,
        new UsersInfos(nom, "", 0, 0, email, ""),
        false,
        100,
        [],
        undefined,
      );
      await userFirestore.createUser(newUser, firebaseUser);
      const data = await userFirestore.getUser(firebaseUser);
      // Loader maintenu jusqu'au montage de la home (voir onGoogle).
      setUserData(data ?? newUser);
    } catch (err: any) {
      Alert.alert("Erreur", err?.message ?? "Inscription échouée.");
      setLoggingIn(false);
    }
  };

  // ⚠️ Le sous-flux WhatsApp remplace TOUT le contenu de la sheet (titre et
  // footer compris) : ses deux etapes ont leur propre titre et leur propre
  // bouton retour. Laisser le « Welcome to Yaammoo » au-dessus donnerait deux
  // titres concurrents et pousserait le champ sous le clavier.
  if (whatsappMode) {
    return (
      <WhatsAppAuthStep
        // TODO(backend) : brancher l'envoi du code une fois l'endpoint fourni.
        onSubmitPhone={async () => {
          await new Promise((r) => setTimeout(r, 900));
        }}
        // TODO(backend) : brancher la verification + setUserData().
        onSubmitCode={async () => {
          await new Promise((r) => setTimeout(r, 900));
        }}
        onResend={async () => {
          await new Promise((r) => setTimeout(r, 600));
        }}
        onBack={() => setWhatsappMode(false)}
      />
    );
  }

  return (
    <View style={styles.content}>
      <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
        Welcome to Yaammoo <Text style={styles.wave}>👋</Text>
      </Text>
      <Text style={styles.subtitle}>
        The best cooking and food recipes app of the century.
      </Text>

      <View style={styles.auth}>
        {!emailMode ? (
          <>
            {Platform.OS === "ios" && (
              <TouchableOpacity
                style={styles.btn}
                onPress={onApple}
                disabled={appleLoading}
                activeOpacity={0.85}
              >
                {appleLoading ? (
                  <ActivityIndicator
                    size="small"
                    color="#141414"
                    style={styles.btnIcon}
                  />
                ) : (
                  <View style={styles.btnIcon}>
                    <AppleIcon />
                  </View>
                )}
                <Text style={styles.btnText}>Continue with Apple</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.btn}
              onPress={onGoogle}
              disabled={googleLoading}
              activeOpacity={0.85}
            >
              {googleLoading ? (
                <ActivityIndicator
                  size="small"
                  color="#141414"
                  style={styles.btnIcon}
                />
              ) : (
                <View style={styles.btnIcon}>
                  <GoogleIcon />
                </View>
              )}
              <Text style={styles.btnText}>Continue with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btn}
              onPress={() => setWhatsappMode(true)}
              activeOpacity={0.85}
            >
              <View style={styles.btnIcon}>
                <WhatsAppIcon />
              </View>
              <Text style={styles.btnText}>Continue with WhatsApp</Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or sign in with</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={() => {
                setIsRegister(false);
                setEmailMode(true);
              }}
              activeOpacity={0.85}
            >
              <Ionicons
                name="mail-outline"
                size={18}
                color="#ffffff"
                style={styles.btnIcon}
              />
              <Text style={[styles.btnText, styles.btnTextPrimary]}>
                Sign In with email
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.inputWrap}>
              <Ionicons
                name="mail-outline"
                size={18}
                color="#7a7a78"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#a8a8a6"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loggingIn}
              />
            </View>

            <View style={styles.inputWrap}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color="#7a7a78"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#a8a8a6"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loggingIn}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                style={styles.inputRight}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color="#7a7a78"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={isRegister ? onRegister : onLogin}
              disabled={loggingIn}
              activeOpacity={0.85}
            >
              {loggingIn ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={[styles.btnText, styles.btnTextPrimary]}>
                  {isRegister ? "Sign Up" : "Login"}
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.btn}
              onPress={() => setEmailMode(false)}
              activeOpacity={0.85}
            >
              <View style={styles.socialIconsRow}>
                <AppleIcon />
                <View style={{ width: 18 }} />
                <GoogleIcon />
              </View>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.footerLine}>
        {emailMode && isRegister ? (
          <>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity
              onPress={() => {
                setIsRegister(false);
                setEmailMode(true);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <Text style={styles.footerLink}> Sign In</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.footerText}>Don&apos;t have account?</Text>
            <TouchableOpacity
              onPress={() => {
                setIsRegister(true);
                setEmailMode(true);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
            >
              <Text style={styles.footerLink}> Sign Up</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ⚠️ `flex: 1` + `justifyContent: center` : la sheet a desormais une hauteur
  // FIXE (voir AuthGateContext). Sans ca, le bloc social resterait colle en
  // haut avec un grand vide dessous.
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#141414",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  wave: { fontSize: 26 },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#7a7a78",
    fontWeight: "500",
    textAlign: "center",
    maxWidth: 280,
  },
  auth: { width: "100%", gap: 10 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#ececec",
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  btnIcon: { position: "absolute", left: 22 },
  btnText: { fontSize: 15, fontWeight: "600", color: "#141414" },
  btnPrimary: { backgroundColor: "#141414", borderColor: "#141414" },
  btnTextPrimary: { color: "#ffffff" },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#ececec" },
  dividerText: { fontSize: 12, color: "#a8a8a6", fontWeight: "500" },
  footerLine: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  footerText: { fontSize: 14, color: "#7a7a78", fontWeight: "500" },
  footerLink: { fontSize: 14, color: "#141414", fontWeight: "700" },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#ececec",
    borderRadius: 999,
    paddingHorizontal: 20,
    height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#141414",
    fontWeight: "500",
    paddingVertical: 0,
  },
  inputRight: { paddingLeft: 10 },
  socialIconsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});
