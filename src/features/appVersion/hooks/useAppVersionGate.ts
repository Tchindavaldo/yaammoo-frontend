import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Config } from "@/src/api/config";

export interface AppVersionGate {
  clientVersion: string;
  minVersion: string;
  latestVersion: string;
  forceUpdate: boolean;
  updateAvailable: boolean;
}

/**
 * Vérifie l'état de version de l'app auprès du backend (`GET /settings/app-version`).
 *
 * En cas d'échec réseau, on ne bloque JAMAIS l'app : `gate` reste `null` et
 * l'appelant traite ça comme "pas de gate" — un incident serveur ne doit pas
 * empêcher un client à jour d'utiliser l'app.
 */
export function useAppVersionGate() {
  const [gate, setGate] = useState<AppVersionGate | null>(null);
  const [checked, setChecked] = useState(false);

  const check = useCallback(async () => {
    try {
      const { data } = await axios.get(`${Config.apiUrl}/settings/app-version`);
      setGate(data?.data ?? null);
    } catch (error) {
      console.error("[appVersion] vérification impossible :", error);
      setGate(null);
    } finally {
      setChecked(true);
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  return { gate, checked, recheck: check };
}
