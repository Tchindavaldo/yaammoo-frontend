import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { auth } from "@/src/services/firebase";
import { userFirestore } from "./userFirestore";
import { Users, UsersInfos } from "@/src/types";
import { Config } from "@/src/api/config";

// Configuration Google Sign-In
GoogleSignin.configure({
  webClientId: Config.googleAuth.webClientId,
  iosClientId: Config.googleAuth.iosClientId,
  offlineAccess: true,
});

export interface GoogleSignInResult {
  success: boolean;
  isNewUser: boolean;
  userData?: Users;
  error?: string;
}

/**
 * Connexion avec Google via @react-native-google-signin + Firebase
 */
export async function handleGoogleSignIn(): Promise<GoogleSignInResult> {
  try {
    // Vérifie que Google Play Services est disponible (Android)
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // Lance le flow de connexion Google
    await GoogleSignin.signIn();

    // Récupère les tokens
    const tokens = await GoogleSignin.getTokens();
    const idToken = tokens.idToken;

    if (!idToken) {
      return {
        success: false,
        isNewUser: false,
        error: "Token Google invalide",
      };
    }

    // Crée la credential Firebase
    const credential = GoogleAuthProvider.credential(idToken);

    // Connexion Firebase
    const userCredential = await signInWithCredential(auth, credential);
    const firebaseUser = userCredential.user;

    // Vérifie si l'utilisateur existe dans notre backend
    const existingUser = await userFirestore.getUser(firebaseUser.uid);

    if (existingUser) {
      return {
        success: true,
        isNewUser: false,
        userData: existingUser,
      };
    }

    // Nouvel utilisateur → créer le profil dans le backend
    const displayName = firebaseUser.displayName ?? "";
    const nameParts = displayName.trim().split(" ");
    const prenom = nameParts[0] ?? "User";
    const nom = nameParts.slice(1).join(" ") || prenom;

    const newUser: Users = new Users(
      new UsersInfos(
        nom,
        prenom,
        0,
        0,
        firebaseUser.uid,
        firebaseUser.email ?? "",
        "",
      ),
      false,
      100,
      [],
      "",
    );

    await userFirestore.createUser(newUser, firebaseUser.uid);

    return {
      success: true,
      isNewUser: true,
      userData: newUser,
    };
  } catch (error: any) {
    console.error("Google sign-in error:", error);

    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      return { success: false, isNewUser: false, error: "Connexion annulée" };
    } else if (error.code === statusCodes.IN_PROGRESS) {
      return {
        success: false,
        isNewUser: false,
        error: "Connexion déjà en cours",
      };
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return {
        success: false,
        isNewUser: false,
        error: "Google Play Services non disponible",
      };
    } else if (error.code === "auth/account-exists-with-different-credential") {
      return {
        success: false,
        isNewUser: false,
        error:
          "Un compte existe déjà avec cet email. Utilisez email/mot de passe.",
      };
    } else if (error.code === "auth/network-request-failed") {
      return {
        success: false,
        isNewUser: false,
        error: "Erreur réseau. Vérifiez votre connexion.",
      };
    }

    return {
      success: false,
      isNewUser: false,
      error: "Erreur de connexion Google",
    };
  }
}

/**
 * Déconnexion Google
 */
export async function handleGoogleSignOut(): Promise<void> {
  try {
    await GoogleSignin.revokeAccess();
    await GoogleSignin.signOut();
  } catch (error) {
    console.error("Google sign-out error:", error);
  }
}
