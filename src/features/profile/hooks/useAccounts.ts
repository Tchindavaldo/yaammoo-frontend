// Comptes affiches par la pastille du header Settings et sa sheet.
// Pour l'instant : uniquement le compte connecte (pas de stockage multi-compte).
// Brancher ici la liste des comptes memorises quand elle existera.
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { useMemo } from "react";

export interface AccountEntry {
  id: string;
  initiale: string;
  nom: string;
  contact: string;
  isMarchand: boolean;
  current: boolean;
}

export function useAccounts(): AccountEntry[] {
  const { user, userData } = useAuth();

  return useMemo(() => {
    if (!user && !userData) return [];
    const firebaseName = user?.displayName || "";
    const nom =
      [userData?.infos.prenom, userData?.infos.nom].filter(Boolean).join(" ") ||
      firebaseName ||
      "Utilisateur";
    const contact =
      userData?.infos.email ||
      user?.email ||
      userData?.infos.numero?.toString() ||
      "";
    return [
      {
        id: user?.uid || "current",
        initiale: nom.charAt(0).toUpperCase() || "U",
        nom,
        contact,
        isMarchand: !!userData?.isMarchand,
        current: true,
      },
    ];
  }, [user, userData]);
}
