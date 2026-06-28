import { OAuthProvider, signInWithCredential } from "firebase/auth";
import { Alert, Platform, ToastAndroid } from "react-native";
import * as Crypto from "expo-crypto";
import { auth } from "@/src/services/firebase";
import { userFirestore } from "./userFirestore";
import { Users, UsersInfos } from "@/src/types";

export interface AppleSignInResult {
  success: boolean;
  isNewUser: boolean;
  userData?: Users;
  error?: string;
}

const notifyUnavailable = (message: string) => {
  if (Platform.OS === "android") {
    ToastAndroid.show(message, ToastAndroid.LONG);
  } else {
    Alert.alert("Apple Sign In", message);
  }
};

/**
 * Connexion avec Apple (iOS natif) + Firebase
 * Aligné sur googleAuthService : retourne le même type de résultat.
 */
export async function handleAppleSignIn(): Promise<AppleSignInResult> {
  if (Platform.OS !== "ios") {
    const msg = "Sign in with Apple est disponible uniquement sur iOS.";
    console.warn(`🍎 [AppleAuth] ${msg}`);
    notifyUnavailable(msg);
    return { success: false, isNewUser: false, error: msg };
  }

  try {
    const AppleAuthentication = await import("expo-apple-authentication");

    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) {
      const msg = "Sign in with Apple non disponible sur cet appareil.";
      console.warn(`🍎 [AppleAuth] ${msg}`);
      notifyUnavailable(msg);
      return { success: false, isNewUser: false, error: msg };
    }

    // Nonce : Apple signe son hash SHA-256, Firebase vérifie avec rawNonce
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    const rawNonce = Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce,
    );

    console.log("🍎 [AppleAuth] Étape 1: Sélecteur Apple");
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    if (!credential.identityToken) {
      console.error("❌ [AppleAuth] Identity token Apple manquant");
      return { success: false, isNewUser: false, error: "Identity token Apple manquant" };
    }

    console.log("🍎 [AppleAuth] Étape 2: Connexion Firebase");
    const provider = new OAuthProvider("apple.com");
    const firebaseCred = provider.credential({
      idToken: credential.identityToken,
      rawNonce,
    });
    const userCredential = await signInWithCredential(auth, firebaseCred);
    const firebaseUser = userCredential.user;
    console.log("✅ [AppleAuth] Firebase User:", {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
    });

    console.log("🍎 [AppleAuth] Étape 3: Vérification backend");
    const existingUser = await userFirestore.getUser(firebaseUser);

    if (existingUser) {
      console.log("✅ [AppleAuth] Utilisateur existant:", existingUser.infos.email);
      return { success: true, isNewUser: false, userData: existingUser };
    }

    // Apple ne fournit nom/email qu'à la PREMIÈRE connexion
    const prenom =
      credential.fullName?.givenName ||
      firebaseUser.displayName?.split(" ")[0] ||
      "User";
    const nom =
      credential.fullName?.familyName ||
      firebaseUser.displayName?.split(" ").slice(1).join(" ") ||
      "";
    const email = credential.email ?? firebaseUser.email ?? "";

    const newUser: Users = new Users(
      firebaseUser.uid,
      firebaseUser.uid,
      new UsersInfos(nom, prenom, 0, 0, email, ""),
      false,
      100,
      [],
      undefined,
    );

    console.log("🍎 [AppleAuth] Étape 4: Création backend (POST /user)");
    await userFirestore.createUser(newUser, firebaseUser);

    console.log("🍎 [AppleAuth] Étape 5: Récupération données backend");
    const createdUserData = await userFirestore.getUser(firebaseUser);
    if (!createdUserData) {
      throw new Error("Failed to retrieve created Apple user");
    }

    console.log("✅ [AppleAuth] Utilisateur créé");
    return { success: true, isNewUser: true, userData: createdUserData };
  } catch (error: any) {
    console.error("❌ [AppleAuth] Erreur:", error);

    if (error.code === "ERR_REQUEST_CANCELED" || error.code === "ERR_CANCELED") {
      return { success: false, isNewUser: false, error: "Connexion annulée" };
    }
    if (error.code === "auth/account-exists-with-different-credential") {
      return {
        success: false,
        isNewUser: false,
        error: "Un compte existe déjà avec cet email.",
      };
    }
    if (error.code === "auth/network-request-failed") {
      return {
        success: false,
        isNewUser: false,
        error: "Erreur réseau. Vérifiez votre connexion.",
      };
    }
    return {
      success: false,
      isNewUser: false,
      error: error?.message || "Erreur de connexion Apple",
    };
  }
}
