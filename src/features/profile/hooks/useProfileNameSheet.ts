import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "expo-router";
import { auth } from "@/src/services/firebase";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { userFirestore } from "@/src/features/auth/services/userFirestore";
import { getMissingName, MissingName } from "../utils/missingName";

/** Delai apres l'arrivee sur le home, le temps que l'ecran s'affiche. */
const ARRIVAL_DELAY_MS = 700;

interface ProfileNameValue {
  visible: boolean;
  missing: MissingName | null;
  saving: boolean;
  error: string | null;
  dismiss: () => void;
  submit: (values: { prenom?: string; nom?: string }) => Promise<void>;
  /**
   * Garde « nom / prenom » avant toute commande (home ou panier) : si un champ
   * manque, ouvre la sheet (meme deja fermee) et n'execute `action` qu'apres
   * enregistrement. Sinon execute `action` tout de suite.
   */
  requireName: (action?: () => void) => boolean;
}

const ProfileNameContext = createContext<ProfileNameValue | undefined>(
  undefined,
);

/**
 * Pilote la sheet « nom / prenom manquant ».
 *
 * - Arrivee sur le home (route `/`) : affichee si un champ manque, sauf si
 *   l'utilisateur l'a deja fermee pendant la session.
 * - Avant une commande : `requireName()` la force, fermee ou non.
 */
export const ProfileNameProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, userData, setUserData } = useAuth();
  const pathname = usePathname();
  const [dismissedUid, setDismissedUid] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);
  const [forced, setForced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingAction = useRef<(() => void) | null>(null);

  const missing: MissingName | null = useMemo(
    () => (user && userData ? getMissingName(userData) : null),
    [user, userData],
  );
  const onHome = pathname === "/";
  const dismissed = !!user && dismissedUid === user.uid;

  // Arme la sheet un court instant apres l'arrivee sur le home.
  useEffect(() => {
    if (!onHome || !missing || dismissed) {
      setArmed(false);
      return;
    }
    const t = setTimeout(() => setArmed(true), ARRIVAL_DELAY_MS);
    return () => clearTimeout(t);
  }, [onHome, missing, dismissed]);

  const visible = !!missing && (forced || (armed && onHome && !dismissed));

  const dismiss = useCallback(() => {
    if (user) setDismissedUid(user.uid);
    setForced(false);
    pendingAction.current = null;
    setError(null);
  }, [user]);

  const requireName = useCallback(
    (action?: () => void) => {
      if (!missing) {
        action?.();
        return true;
      }
      pendingAction.current = action ?? null;
      setError(null);
      setForced(true);
      return false;
    },
    [missing],
  );

  const submit = useCallback(
    async (values: { prenom?: string; nom?: string }) => {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser || !userData) return;
      setSaving(true);
      setError(null);
      const updated = {
        ...userData,
        infos: {
          ...userData.infos,
          ...(values.prenom !== undefined && { prenom: values.prenom.trim() }),
          ...(values.nom !== undefined && { nom: values.nom.trim() }),
        },
      };
      try {
        await userFirestore.updateUser(updated, firebaseUser);
        await setUserData(updated);
        setForced(false);
        const action = pendingAction.current;
        pendingAction.current = null;
        // Laisse la sheet sortir avant d'ouvrir la suite (checkout, paiement).
        if (action) setTimeout(action, 250);
      } catch (e) {
        console.error("❌ [ProfileNameSheet] Mise a jour du nom echouee:", e);
        setError("Enregistrement impossible. Vérifie ta connexion.");
      } finally {
        setSaving(false);
      }
    },
    [userData, setUserData],
  );

  return React.createElement(
    ProfileNameContext.Provider,
    {
      value: { visible, missing, saving, error, dismiss, submit, requireName },
    },
    children,
  );
};

export function useProfileNameSheet() {
  const ctx = useContext(ProfileNameContext);
  if (!ctx) {
    throw new Error(
      "useProfileNameSheet must be used within ProfileNameProvider",
    );
  }
  return ctx;
}

/** Garde a appeler avant toute commande. */
export const useRequireName = () => useProfileNameSheet().requireName;
