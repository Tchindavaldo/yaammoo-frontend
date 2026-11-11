import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Config } from "@/src/api/config";
import { sinceBoot } from "@/src/utils/bootClock";
import { trackBootStep } from "@/src/services/bootTelemetry";

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
/**
 * Attente maximale du verdict sous le splash.
 *
 * ⚠️ Ce n'est PAS un timeout de requete (aucune n'en porte, cf. `setupHttp`) :
 * la requete continue et son verdict s'applique s'il arrive plus tard. On cesse
 * seulement de RETENIR le splash. Constate : donnees mobiles / WiFi actives mais
 * le trafic vers le backend ne passe pas (la sonde Internet, elle, repond) → la
 * requete restait pendante et l'app calait sur le splash a l'ouverture.
 */
const SPLASH_WAIT_MS = 6000;

export function useAppVersionGate() {
  const [gate, setGate] = useState<AppVersionGate | null>(null);
  const [checked, setChecked] = useState(false);

  const check = useCallback(async () => {
    // Mesure : avec `/fastFood/all`, c'est l'une des deux seules requetes
    // autorisees sous le splash.
    const startedAt = Date.now();
    const release = setTimeout(() => {
      console.log(`[boot t=${sinceBoot()}s] app-version sans reponse : splash libere`);
      setChecked(true);
    }, SPLASH_WAIT_MS);
    try {
      const { data } = await axios.get(`${Config.apiUrl}/settings/app-version`);
      setGate(data?.data ?? null);
    } catch (error) {
      console.error("[appVersion] vérification impossible :", error);
      setGate(null);
    } finally {
      const elapsed = Date.now() - startedAt;
      console.log(
        `[boot t=${sinceBoot()}s] /settings/app-version en ${(elapsed / 1000).toFixed(2)}s`,
      );
      trackBootStep("appVersion", elapsed);
      clearTimeout(release);
      setChecked(true);
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  return { gate, checked, recheck: check };
}
