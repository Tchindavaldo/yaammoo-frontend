import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/src/features/auth/context/AuthContext";

/**
 * Mode marchand / mode client d'un compte marchand.
 * - Marchand (compte avec boutique) : demarre TOUJOURS en mode marchand (non
 *   memorise : chaque lancement repart en marchand).
 * - Non-marchand : toujours mode client.
 * Mode marchand : home = nouveau design, navbar Accueil / Commandes (boutique)
 * / Portefeuille / Notifications / Profil.
 */
interface Value {
  isMerchant: boolean;
  isMerchantMode: boolean;
  setMerchantMode: (on: boolean) => void;
}

const Ctx = createContext<Value>({ isMerchant: false, isMerchantMode: false, setMerchantMode: () => {} });

export function MerchantModeProvider({ children }: { children: React.ReactNode }) {
  const { userData } = useAuth();
  const isMerchant = !!(userData?.isMarchand && userData?.fastFoodId);
  const [mode, setMode] = useState(true);
  // Changement de compte : on repart en mode marchand.
  useEffect(() => setMode(true), [userData?.fastFoodId]);
  const value = useMemo(
    () => ({ isMerchant, isMerchantMode: isMerchant && mode, setMerchantMode: setMode }),
    [isMerchant, mode],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useMerchantMode = () => useContext(Ctx);
