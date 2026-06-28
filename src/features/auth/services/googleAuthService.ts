import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { Config } from "../../../api/config";
import { auth } from "../../../services/firebase";
import { Users, UsersInfos } from "../../../types";
import { userFirestore } from "./userFirestore";

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
  // Temporairement désactiver Google Auth sur Expo Go
  if (process.env.EXPO_PUBLIC_DISABLE_GOOGLE_AUTH === 'true') {
    return {
      success: false,
      isNewUser: false,
      error: "Google Auth est désactivé dans Expo Go. Utilisez un development build.",
    };
  }

  let statusCodes: any;

  try {
    // Import dynamique pour éviter les erreurs sur Expo Go
    const { GoogleSignin: GS, statusCodes: SC } = await import("@react-native-google-signin/google-signin");
    const GoogleSignin = GS;
    statusCodes = SC;

    // Configuration Google Signin (Android Client ID est lu depuis
    // google-services.json automatiquement par la lib, ne pas le passer ici)
    GoogleSignin.configure({
      webClientId: Config.googleAuth.webClientId,
      iosClientId: Config.googleAuth.iosClientId,
      offlineAccess: true,
    });
    // Vérifie que Google Play Services est disponible (Android)
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    console.log("🔵 [GoogleAuth] Étape 2: Lancement du sélecteur de compte");
    // Lance le flow de connexion Google
    await GoogleSignin.signIn();

    console.log("🔵 [GoogleAuth] Étape 3: Récupération du token");
    // Récupère les tokens
    const tokens = await GoogleSignin.getTokens();
    const idToken = tokens.idToken;

    if (!idToken) {
      console.error("❌ [GoogleAuth] Token Google invalide");
      return {
        success: false,
        isNewUser: false,
        error: "Token Google invalide",
      };
    }

    console.log("🔵 [GoogleAuth] Étape 4: Création credential Firebase");
    // Crée la credential Firebase
    const credential = GoogleAuthProvider.credential(idToken);

    console.log("🔵 [GoogleAuth] Étape 5: Connexion Firebase");
    // Connexion Firebase
    const userCredential = await signInWithCredential(auth, credential);
    const firebaseUser = userCredential.user;
    console.log("✅ [GoogleAuth] Firebase User:", {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
    });

    console.log("🔵 [GoogleAuth] Étape 6: Vérification backend (GET /user)");
    // Vérifie si l'utilisateur existe dans notre backend
    const existingUser = await userFirestore.getUser(firebaseUser);

    if (existingUser) {
      console.log(
        "✅ [GoogleAuth] Utilisateur existant trouvé:",
        existingUser.infos.email,
      );
      return {
        success: true,
        isNewUser: false,
        userData: existingUser,
      };
    }

    console.log(
      "🔵 [GoogleAuth] Étape 7: Nouvel utilisateur - Création du profil",
    );
    // Nouvel utilisateur → créer le profil dans le backend
    const displayName = firebaseUser.displayName ?? "";
    const nameParts = displayName.trim().split(" ");
    const prenom = nameParts[0] ?? "User";
    const nom = nameParts.slice(1).join(" ") || "";

    const newUser: Users = new Users(
      firebaseUser.uid,
      firebaseUser.uid,
      new UsersInfos(nom, prenom, 0, 0, firebaseUser.email ?? "", ""),
      false,
      100,
      [],
      undefined,
    );

    console.log("🔵 [GoogleAuth] Étape 8: Envoi au backend (POST /user)");
    console.log("📤 [GoogleAuth] Données envoyées:", {
      uid: newUser.uid,
      nom: newUser.infos.nom,
      prenom: newUser.infos.prenom,
      email: newUser.infos.email,
    });

    await userFirestore.createUser(newUser, firebaseUser);

    console.log("🔵 [GoogleAuth] Étape 9: Récupération des données utilisateur depuis backend");
    // Fetch the user data from API to get server data
    const createdUserData = await userFirestore.getUser(firebaseUser);
    if (!createdUserData) {
      throw new Error("Failed to retrieve created user data");
    }

    console.log("✅ [GoogleAuth] Utilisateur créé avec succès");
    return {
      success: true,
      isNewUser: true,
      userData: createdUserData,
    };
  } catch (error: any) {
    console.error("❌ [GoogleAuth] Erreur:", error);

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
    const { GoogleSignin } = await import("@react-native-google-signin/google-signin");
    await GoogleSignin.revokeAccess();
    await GoogleSignin.signOut();
  } catch (error) {
    console.error("Google sign-out error:", error);
  }
}
