import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/src/services/firebase";
import { storage } from "@/src/utils/storage";
import { Users } from "@/src/types";
import { userFirestore } from "../services/userFirestore";

interface AuthContextType {
  user: User | null;
  userData: Users | null;
  loading: boolean;
  setUserData: (data: Users | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<Users | null>(null);
  const [loading, setLoading] = useState(false);

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
        setLoading(true);
        try {
          // 1. Try fetching from API (freshest data)
          console.log(
            "🔵 [AuthContext] Tentative de récupération depuis API...",
          );
          const apiData = await userFirestore.getUser(firebaseUser);
          if (apiData) {
            console.log(
              "✅ [AuthContext] User data récupéré depuis API:",
              JSON.stringify(apiData, null, 2),
            );
            setUserData(apiData);
            await storage.set("user_data", apiData);
          } else {
            console.log(
              "⚠️ [AuthContext] API n'a pas retourné de données, fallback vers storage",
            );
            // 2. Fallback to stored data if API fails or returns null
            const stored = await storage.get("user_data");
            if (stored) {
              console.log("✅ [AuthContext] User data récupéré depuis storage");
              setUserData(stored);
            } else {
              console.log(
                "❌ [AuthContext] Aucune donnée trouvée (API + storage)",
              );
            }
          }
        } catch (error) {
          console.error("❌ [AuthContext] Erreur lors du chargement:", error);
          const stored = await storage.get("user_data");
          if (stored) {
            console.log("✅ [AuthContext] Fallback vers storage après erreur");
            setUserData(stored);
          } else {
            console.log("❌ [AuthContext] Aucun fallback disponible");
          }
        }
      } else {
        console.log(
          "🔵 [AuthContext] Pas de Firebase User, nettoyage userData",
        );
        setUserData(null);
        await storage.remove("user_data");
      }
      setLoading(false);
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

  return (
    <AuthContext.Provider
      value={{ user, userData, loading, setUserData: handleUpdateUserData }}
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
