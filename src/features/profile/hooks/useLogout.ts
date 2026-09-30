// Logique de deconnexion partagee (LogoutModal, AccountSheet).
// Le retour vers (auth) est pilote par le guard Stack.Protected (app/_layout.tsx) :
// signOut → onAuthStateChanged → userData=null → l'ecran settings se DEMONTE.
// isLoggingOut n'est jamais remis a false sur succes : le loader tourne
// jusqu'au demontage (comme au login).
import { Config } from "@/src/api/config";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { getDeviceId } from "@/src/features/notifications/services/deviceId";
import { auth } from "@/src/services/firebase";
import axios from "axios";
import { signOut } from "firebase/auth";
import { useCallback, useState } from "react";

export function useLogout() {
  const { setUserData } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = useCallback(async () => {
    setIsLoggingOut(true);
    // Best-effort: desenregistre ce device des push avant de signer out
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (idToken) {
        const deviceId = await getDeviceId();
        await axios.post(
          `${Config.apiUrl}/user/push-token/remove`,
          { deviceId },
          {
            headers: {
              Authorization: `Bearer ${idToken}`,
              "Content-Type": "application/json",
              "ngrok-skip-browser-warning": "true",
            },
          },
        );
        console.log("[Settings] push-token/remove OK pour ce device");
      }
    } catch (e: any) {
      console.warn(
        "⚠️ [Settings] push-token/remove échoué (on continue le logout):",
        e?.message,
      );
    }
    await signOut(auth);
    setUserData(null);
  }, [setUserData]);

  return { isLoggingOut, logout };
}
