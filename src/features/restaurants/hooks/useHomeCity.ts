// Ville du home (pilule de localisation -> bottom sheet des villes).
// - `city` : ville appliquee au home (`GET /fastfood/all?city=`), null = toutes.
// - `manual` : choix explicite du client, retenu sur l'appareil (confort par
//   appareil, AsyncStorage). Sinon ville PAR DEFAUT du backend
//   (`GET /fastfood/cities` : ville du client si desservie, sinon la plus proche).
// - Marchand en mode client : toujours la ville de SA boutique (pas de choix).
// - `cityReady` : la premiere page du home attend la ville (pas de double chargement).
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Config } from "@/src/api/config";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { getOptionalIdToken } from "@/src/services/idToken";

const STORAGE_KEY = "home_city_v1";
// Filet de securite seulement : la 1re page attend la vraie ville (sinon elle
// partait sans ville = toutes les villes, et le rechargement suivant pouvait
// etre ignore pendant ce 1er chargement).
const RESOLVE_TIMEOUT_MS = 12000;

export interface HomeCityEntry { name: string; count: number }
export interface HomeCitiesData { cities: HomeCityEntry[]; defaultCity: string | null; total: number; merchantCity?: string | null }

/** Liste des villes + ville par defaut (position connue sans demander de permission). */
export async function fetchHomeCities(): Promise<HomeCitiesData | null> {
  try {
    const perm = await Location.getForegroundPermissionsAsync().catch(() => null);
    // Derniere position connue, sinon position actuelle (souvent nulle sur iOS
    // au demarrage : sans elle, la ville par defaut n'etait pas la bonne).
    const pos = perm?.granted
      ? (await Location.getLastKnownPositionAsync().catch(() => null)) ??
        (await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null),
          new Promise<null>(r => setTimeout(() => r(null), 5000)),
        ]))
      : null;
    const idToken = await getOptionalIdToken();
    const { data } = await axios.get(`${Config.apiUrl}/fastfood/cities`, {
      headers: idToken ? { Authorization: `Bearer ${idToken}` } : undefined,
      params: pos ? { lat: pos.coords.latitude, lng: pos.coords.longitude } : undefined,
      timeout: 8000,
    });
    return data?.data ?? null;
  } catch {
    return null;
  }
}

export function useHomeCity() {
  const { userData } = useAuth();
  const isMerchant = !!(userData?.isMarchand && userData?.fastFoodId);
  const [city, setCityState] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  // « Ma localisation » en cours de calcul : le home affiche son loader tout de
  // suite (sinon les anciennes boutiques restaient le temps de la requete).
  const [resolving, setResolving] = useState(false);
  const cityRef = useRef<string | null>(null);
  // Promesse creee UNE seule fois : `new Promise` dans useRef(...) serait
  // re-evalue a chaque rendu et ecraserait le resolveur (loader infini).
  const readyResolve = useRef<() => void>(() => {});
  const cityReady = useRef<Promise<void> | null>(null);
  if (!cityReady.current) cityReady.current = new Promise<void>(r => { readyResolve.current = r; });

  const apply = useCallback((c: string | null, isManual: boolean) => {
    cityRef.current = c;
    setCityState(c);
    setManual(isManual);
  }, []);

  /** Ville par defaut du backend (marchand : sa boutique). */
  const resolveDefault = useCallback(async () => {
    const data = await fetchHomeCities();
    return data?.merchantCity ?? data?.defaultCity ?? null;
  }, []);

  useEffect(() => {
    let done = false;
    const finish = () => { if (!done) { done = true; readyResolve.current(); } };
    const timer = setTimeout(finish, RESOLVE_TIMEOUT_MS);
    (async () => {
      let stored: { city: string | null } | null = null;
      if (!isMerchant) {
        try { stored = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) || "null"); } catch { stored = null; }
      }
      if (stored) apply(stored.city ?? null, true);
      else apply(await resolveDefault(), false);
      finish();
    })();
    return () => clearTimeout(timer);
  }, [isMerchant, apply, resolveDefault]);

  /** Choix dans la sheet : une ville, ou null = toutes les villes. */
  const chooseCity = useCallback(async (c: string | null) => {
    apply(c, true);
    try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ city: c })); } catch {}
  }, [apply]);

  /** « Ma localisation » : oublie le choix, revient a la ville par defaut. */
  const resetToMyLocation = useCallback(async () => {
    setResolving(true);
    try { await AsyncStorage.removeItem(STORAGE_KEY); } catch {}
    try { apply(await resolveDefault(), false); } finally { setResolving(false); }
  }, [apply, resolveDefault]);

  // Objet stable tant que rien ne change : il entre dans la valeur du contexte
  // FastFood (une nouvelle reference re-rendrait tout le home).
  return useMemo(
    () => ({ city, manual, resolving, isMerchant, cityRef, cityReady, chooseCity, resetToMyLocation }),
    [city, manual, resolving, isMerchant, chooseCity, resetToMyLocation],
  );
}

export type HomeCity = ReturnType<typeof useHomeCity>;
