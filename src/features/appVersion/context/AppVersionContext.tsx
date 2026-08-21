import React, { createContext, useContext, useMemo } from "react";
import {
  AppVersionGate,
  useAppVersionGate,
} from "@/src/features/appVersion/hooks/useAppVersionGate";

interface AppVersionContextValue {
  /** Gate de version : `null` tant que le backend n'a pas répondu (ou en erreur). */
  gate: AppVersionGate | null;
  /** True quand une nouvelle version existe MAIS sans bloquer le client. */
  updateAvailable: boolean;
  /** True quand la version du client est sous le minimum → blocage total. */
  forceUpdate: boolean;
  /** Relance une vérification de version. */
  recheck: () => Promise<void>;
  /** True dès que le backend a répondu OU a échoué — jamais bloquant. */
  checked: boolean;
}

const AppVersionContext = createContext<AppVersionContextValue | null>(null);

export function AppVersionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { gate, checked, recheck } = useAppVersionGate();

  const value = useMemo<AppVersionContextValue>(
    () => ({
      gate,
      updateAvailable: !!gate?.updateAvailable,
      forceUpdate: !!gate?.forceUpdate,
      recheck,
      checked,
    }),
    [gate, checked, recheck],
  );

  return (
    <AppVersionContext.Provider value={value}>
      {children}
    </AppVersionContext.Provider>
  );
}

export function useAppVersion(): AppVersionContextValue {
  const ctx = useContext(AppVersionContext);
  if (!ctx) {
    throw new Error("useAppVersion doit être utilisé sous <AppVersionProvider>");
  }
  return ctx;
}
