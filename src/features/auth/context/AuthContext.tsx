import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import axios from "axios";
import { auth } from "@/src/services/firebase";
import { storage } from "@/src/utils/storage";
import { Users } from "@/src/types";
import { userFirestore } from "../services/userFirestore";
import { Config } from "@/src/api/config";

interface AuthContextType {
  user: User | null;
  userData: Users | null;
  loading: boolean;
  setUserData: (data: Users | null) => void;
  deleteAccount: () => Promise<void>;
  /**
   * Rafraichit le profil depuis l'API, une fois par session. Appele par le home :
   * sous le splash, le profil en cache suffit.
   */
  ensureProfileRefreshed: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<Users | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Le profil a-t-il deja ete rafraichi depuis l'API dans cette session ?
   * Evite qu'un remontage du home ne relance la requete.
   */
  const profileRefreshed = useRef(false);

  /**
   * Rafraichit le profil depuis l'API, une seule fois par session.
   *
   * ⚠️ Appele par le HOME, pas au boot : sous le splash, seules `/fastFood/all`
   * et `/settings/app-version` ont le droit de partir. Quand un cache est
   * present, le profil affiche est deja le bon — verifier qu'il a change peut
   * attendre que l'app soit a l'ecran.
   */
  const ensureProfileRefreshed = useCallback(async () => {
    if (profileRefreshed.current) return;
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return;
    profileRefreshed.current = true;

    try {
      console.log("🔵 [AuthContext] Refresh profil depuis l'API (home)...");
      const apiData = await userFirestore.getUser(firebaseUser);
      if (apiData) {
        console.log("✅ [AuthContext] Profil rafraîchi depuis l'API");
        setUserData(apiData);
        await storage.set("user_data", apiData);
      }
    } catch (error) {
      console.error("❌ [AuthContext] Refresh profil échoué:", error);
      // Hors-ligne : on garde le cache deja affiche (rien a faire).
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("🔵 [AuthContext] onAuthStateChanged déclenché");
      setUser(firebaseUser);
      if (firebaseUser) {
        console.log(
          "🔵 [AuthContext] Firebase User détecté:",
          firebaseUser.uid,
          firebaseUser.email,
        );

        // 1. CACHE D'ABORD : si un profil est en cache pour cet user, l'afficher
        //    immédiatement et débloquer l'app (marche hors-ligne, pas d'attente réseau).
        const stored = await storage.get("user_data");
        const hasFreshCache = stored && stored.uid === firebaseUser.uid;
        if (hasFreshCache) {
          console.log("✅ [AuthContext] Profil chargé depuis le cache (affichage immédiat)");
          setUserData(stored);
          setLoading(false);
        } else {
          // Pas de cache → on attend l'API (premier login sur cet appareil).
          setLoading(true);
        }

        // 2. REFRESH EN ARRIÈRE-PLAN : tenter de récupérer la version fraîche.
        //    Ne bloque pas l'UI si on a déjà affiché le cache.
        //
        // ⚠️ Cache frais : on ne rafraîchit PAS ici. Sous le splash, seules
        // `/fastFood/all` et `/settings/app-version` ont le droit de partir —
        // le profil affiché est déjà le bon. Le rafraîchissement est déclenché
        // par le home, via `ensureProfileRefreshed()`.
        // Sans cache, en revanche, on attend l'API : c'est elle qui débloque
        // l'app.
        if (hasFreshCache) {
          setLoading(false);
          // Deja rafraichi ? Non — mais c'est le home qui le demandera.
          return;
        }

        // Pas de cache : le profil vient d'etre charge depuis l'API, le home
        // n'a rien a redemander.
        profileRefreshed.current = true;

        try {
          console.log("🔵 [AuthContext] Refresh profil depuis l'API...");
          const apiData = await userFirestore.getUser(firebaseUser);
          if (apiData) {
            console.log("✅ [AuthContext] Profil rafraîchi depuis l'API");
            setUserData(apiData);
            await storage.set("user_data", apiData);
          } else if (!hasFreshCache) {
            // Pas de cache ET l'API ne renvoie rien : conserver d'éventuelles
            // données d'inscription en cours, sinon rester sans profil.
            setUserData((prev) =>
              prev && prev.uid === firebaseUser.uid ? prev : null,
            );
          }
        } catch (error) {
          console.error("❌ [AuthContext] Refresh profil échoué:", error);
          // Hors-ligne : on garde le cache déjà affiché (rien à faire).
        } finally {
          setLoading(false);
        }
      } else {
        console.log(
          "🔵 [AuthContext] Pas de Firebase User, nettoyage userData",
        );
        setUserData(null);
        await storage.remove("user_data");
        // Prochaine connexion : le home devra redemander le profil.
        profileRefreshed.current = false;
        setLoading(false);
      }
      console.log("🔵 [AuthContext] Loading terminé");
    });

    return unsubscribe;
  }, []);

  const handleUpdateUserData = async (data: Users | null) => {
    console.log(
      "🔵 [AuthContext] setUserData appelé:",
      data ? JSON.stringify(data, null, 2) : "null",
    );
    setUserData(data);
    if (data) {
      console.log("🔵 [AuthContext] Sauvegarde dans storage");
      await storage.set("user_data", data);
    } else {
      console.log("🔵 [AuthContext] Suppression du storage");
      await storage.remove("user_data");
    }
  };

  const deleteAccount = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("Aucun utilisateur connecté");
    }

    const idToken = await currentUser.getIdToken();
    const response = await axios.delete(
      `${Config.apiUrl}/user/delete-account`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
      },
    );

    if (!response.data?.success) {
      throw new Error(response.data?.error || response.data?.message || "Échec de la suppression");
    }

    console.log("✅ [AuthContext] Compte supprimé côté serveur");

    try {
      await signOut(auth);
    } catch (e) {
      console.warn("⚠️ [AuthContext] signOut après deleteAccount:", e);
    }

    await storage.remove("user_data");
    setUser(null);
    setUserData(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        loading,
        setUserData: handleUpdateUserData,
        deleteAccount,
        ensureProfileRefreshed,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
