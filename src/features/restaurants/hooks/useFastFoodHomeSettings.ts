import { useCallback, useEffect, useRef, useState } from "react";
import {
  HOME_CLIENT_SETTINGS_FALLBACK,
  parseHomeClientSettings,
  readStoredHomeClientSettings,
  storeHomeClientSettings,
  type HomeClientSettings,
} from "../utils/homeClientSettings";

/**
 * Reglages d'affichage du home venus du serveur (`clientSettings`), extraits
 * de `FastFoodContext` : etat pour l'ecran, ref pour `fetchPage`, copie gardee
 * du lancement precedent. Voir `utils/homeClientSettings`.
 */
export function useFastFoodHomeSettings() {
  /**
   * Reglages d'affichage du home (`clientSettings`). L'etat sert l'ecran
   * (fantomes, prechargement) ; la ref sert `fetchPage`, callback stable qui
   * lirait sinon une valeur figee.
   */
  const [homeSettings, setHomeSettings] = useState<HomeClientSettings>(
    HOME_CLIENT_SETTINGS_FALLBACK,
  );
  const homeSettingsRef = useRef(HOME_CLIENT_SETTINGS_FALLBACK);
  /** Vrai des qu'une reponse serveur a fixe les reglages : la copie gardee, plus ancienne, ne l'ecrase plus. */
  const serverSettingsRef = useRef(false);
  /** Lecture de la copie gardee au lancement precedent : la premiere page l'attend. */
  const storedSettingsRef = useRef<Promise<void> | null>(null);
  const applyHomeSettings = useCallback((s: HomeClientSettings) => {
    homeSettingsRef.current = s;
    setHomeSettings((prev) =>
      prev.pageSize === s.pageSize &&
      prev.prefetchDistance === s.prefetchDistance
        ? prev
        : s,
    );
  }, []);
  /** `clientSettings` d'une reponse premiere page : applique, puis garde pour le lancement suivant. */
  const applyServerSettings = useCallback(
    (raw: unknown) => {
      if (!raw || typeof raw !== "object") return;
      serverSettingsRef.current = true;
      applyHomeSettings(parseHomeClientSettings(raw));
      storeHomeClientSettings(raw);
    },
    [applyHomeSettings],
  );
  useEffect(() => {
    storedSettingsRef.current = readStoredHomeClientSettings().then((s) => {
      if (!serverSettingsRef.current) applyHomeSettings(s);
    });
  }, [applyHomeSettings]);

  return { homeSettings, homeSettingsRef, storedSettingsRef, applyServerSettings };
}

export type FastFoodHomeSettings = ReturnType<typeof useFastFoodHomeSettings>;
