import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
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
import { EmailAuthStep } from "./EmailAuthStep";
import { AppleIcon, GoogleIcon, WhatsAppIcon } from "./AuthProviderIcons";
import {
  requestPhoneCode,
  verifyPhoneCode,
} from "@/src/features/auth/services/whatsappAuthService";

export default function AuthSheetContent() {
  const { user, userData, setUserData } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  // Sous-flux email (`EmailAuthStep`) : `isRegister` distingue connexion et
  // creation de compte. La SAISIE elle-meme appartient a ce composant dedie —
  // la sheet ne garde plus ni email, ni mot de passe, ni loader.
  const [emailMode, setEmailMode] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  // Sous-flux WhatsApp (numero puis code). Meme principe : un composant dedie
  // remplace tout le contenu de la sheet le temps des deux etapes.
  const [whatsappMode, setWhatsappMode] = useState(false);
  // Numero saisi a l'etape 1 : la verification et le renvoi en ont besoin, et
  // le composant ne le repasse pas a l'etape 2.
  const [whatsappPhone, setWhatsappPhone] = useState("");

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
      setWhatsappPhone("");
      setGoogleLoading(false);
      setAppleLoading(false);
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

  // ⚠️ Les identifiants arrivent en ARGUMENT et l'erreur est PROPAGEE (throw),
  // plus d'`Alert` : `EmailAuthStep` tient sa propre saisie et affiche l'erreur
  // inline. Une boite de dialogue par-dessus la sheet a clavier custom serait
  // incoherente avec le reste du flux.
  const onLoginWith = async (mail: string, pwd: string) => {
    const cred = await signInWithEmailAndPassword(auth, mail, pwd);
    const data = await authService.getUserById(cred.user.uid);
    // Loader maintenu jusqu'au montage de la home (voir onGoogle).
    if (data) setUserData(data);
  };

  const onRegisterWith = async (mail: string, pwd: string) => {
    const cred = await createUserWithEmailAndPassword(auth, mail, pwd);
    const firebaseUser = cred.user;
    // Nom par défaut depuis l'email (le profil pourra être complété plus tard).
    const nom = mail.split("@")[0] || "Utilisateur";
    const newUser = new Users(
      firebaseUser.uid,
      firebaseUser.uid,
      new UsersInfos(nom, "", 0, 0, mail, ""),
      false,
      100,
      [],
      undefined,
    );
    await userFirestore.createUser(newUser, firebaseUser);
    const data = await userFirestore.getUser(firebaseUser);
    // Loader maintenu jusqu'au montage de la home (voir onGoogle).
    setUserData(data ?? newUser);
  };

  // ⚠️ Le sous-flux WhatsApp remplace TOUT le contenu de la sheet (titre et
  // footer compris) : ses deux etapes ont leur propre titre et leur propre
  // bouton retour. Laisser le « Welcome to Yaammoo » au-dessus donnerait deux
  // titres concurrents et pousserait le champ sous le clavier.
  // ⚠️ Meme principe que WhatsApp : l'ecran email remplace TOUT le contenu de
  // la sheet. Il porte son propre clavier custom, son retour et son bascule
  // connexion/inscription.
  if (emailMode) {
    return (
      <EmailAuthStep
        isRegister={isRegister}
        onSubmit={(mail, pwd) =>
          isRegister ? onRegisterWith(mail, pwd) : onLoginWith(mail, pwd)
        }
        onToggleMode={() => setIsRegister((v) => !v)}
        onBack={() => setEmailMode(false)}
      />
    );
  }

  if (whatsappMode) {
    return (
      <WhatsAppAuthStep
        onSubmitPhone={async (phone) => {
          setWhatsappPhone(phone);
          await requestPhoneCode(phone);
        }}
        onSubmitCode={async (code) => {
          const { userData: data, isNewUser } = await verifyPhoneCode(
            whatsappPhone,
            code,
          );

          // ⚠️ PREMIERE connexion : le backend a bien cree le compte Firebase,
          // mais aucun profil n'existe encore cote `/user` — `getUser` renvoie
          // donc `null`. Sans creation, `isSignedIn` resterait faux et la sheet
          // tournerait indefiniment sur son loader. On cree le profil minimal
          // avec ce qu'on a : le numero.
          if (!data && isNewUser && auth.currentUser) {
            const infos = new UsersInfos(
              "",
              "",
              0,
              Number(whatsappPhone),
              auth.currentUser.email ?? "",
              "",
            );
            await userFirestore.createUser(
              new Users(auth.currentUser.uid, auth.currentUser.uid, infos, false, 0, []),
              auth.currentUser,
            );
            const created = await userFirestore.getUser(auth.currentUser);
            if (created) setUserData(created);
            return;
          }

          // ⚠️ Comme Google/Apple : on ne coupe pas le loader et on ne
          // redirige pas ici. Le guard demonte la sheet des que `isSignedIn`
          // passe a true (cf. app/_layout.tsx).
          if (data) setUserData(data);
        }}
        onResend={async () => {
          await requestPhoneCode(whatsappPhone);
        }}
        onBack={() => setWhatsappMode(false)}
      />
    );
  }

  return (
    <View style={styles.content}>
      <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
        Bienvenue sur Yaammoo
      </Text>
      <Text style={styles.subtitle}>
        La meilleure application de cuisine et de recettes du siècle.
      </Text>

      {/* Plus de ternaire `emailMode` ici : la saisie email a son propre ecran
          (`EmailAuthStep`), retourne plus haut. Ce bloc n'affiche donc que les
          boutons de fournisseurs. */}
      <View style={styles.auth}>
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
                <Text style={styles.btnText}>Continuer avec Apple</Text>
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
              <Text style={styles.btnText}>Continuer avec Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btn}
              onPress={() => setWhatsappMode(true)}
              activeOpacity={0.85}
            >
              <View style={styles.btnIcon}>
                <WhatsAppIcon />
              </View>
              <Text style={styles.btnText}>Continuer avec WhatsApp</Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Ou connectez-vous avec</Text>
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
                Se connecter avec un email
              </Text>
            </TouchableOpacity>
      </View>

      {/* Ce footer n'est visible que sur l'ecran des fournisseurs : la bascule
          connexion <-> inscription appartient desormais a `EmailAuthStep`. */}
      <View style={styles.footerLine}>
        <Text style={styles.footerText}>Pas encore de compte ?</Text>
        <TouchableOpacity
          onPress={() => {
            setIsRegister(true);
            setEmailMode(true);
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <Text style={styles.footerLink}> S&apos;inscrire</Text>
        </TouchableOpacity>
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
    justifyContent: "center",
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
