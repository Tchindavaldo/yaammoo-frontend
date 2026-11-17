// Villes de livraison des boutiques : liste servie par `GET /cities` (communes du
// Cameroun, table `cities` du backend), gardee en memoire pour la session. Repli
// sur la liste fixe historique si le backend ne repond pas. Partage par les
// selecteurs de creation et d'edition de boutique (service pur, R16).
import axios from "axios";
import { useEffect, useState } from "react";
import { Config } from "@/src/api/config";
import { CAMEROON_CITIES } from "@/src/features/merchant/components/create-boutique/constants";

let cache: string[] | null = null;
let pending: Promise<string[]> | null = null;

const load = (): Promise<string[]> => {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = axios
      .get(`${Config.apiUrl}/cities`)
      .then(({ data }) => {
        const names: string[] = (data?.data || []).map((c: { name: string }) => c.name).filter(Boolean);
        if (names.length) cache = names;
        return names.length ? names : CAMEROON_CITIES;
      })
      .catch(() => CAMEROON_CITIES)
      .finally(() => {
        pending = null;
      });
  }
  return pending;
};

/** Liste des villes (repli immediat sur la liste fixe pendant le chargement). */
export function useDeliveryCities(): string[] {
  const [cities, setCities] = useState<string[]>(cache ?? CAMEROON_CITIES);
  useEffect(() => {
    let alive = true;
    load().then(c => alive && setCities(c));
    return () => {
      alive = false;
    };
  }, []);
  return cities;
}

/** Recherche sans accents ni majuscules : « yaounde » trouve « Yaoundé ». */
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export const matchCity = (city: string, search: string) => fold(city).includes(fold(search.trim()));
