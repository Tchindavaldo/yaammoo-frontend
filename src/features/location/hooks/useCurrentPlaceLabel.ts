import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { SHOW_PLACE_OUTSIDE_SERVICE_AREA } from "../config";
import { onForegroundLocationStatus } from "../services/locationPermission";

type OsmAddress = {
  neighbourhood?: string;
  suburb?: string;
  quarter?: string;
  city_district?: string;
  district?: string;
  city?: string;
  town?: string;
  village?: string;
};

/**
 * Quartier via Nominatim (OpenStreetMap) : le geocodeur du telephone ne
 * connait que l'arrondissement (« Yaounde 5e »), pas le quartier (Ngousso).
 */
const osmReverse = async (lat: number, lon: number): Promise<OsmAddress | null> => {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
    { headers: { "User-Agent": "yaammoo-app", "Accept-Language": "fr" } },
  );
  const json = await res.json();
  console.log("[LIEU] Nominatim:", JSON.stringify(json?.address ?? json, null, 2));
  return json?.address ?? null;
};

/**
 * Dernier lieu connu, garde sur l'appareil : affiche tout de suite a
 * l'ouverture, et le geocodage (Nominatim) n'est refait que si le client a
 * bouge de plus de PLACE_CACHE_RADIUS_M.
 */
const PLACE_CACHE_KEY = "place_label_v1";
const PLACE_CACHE_RADIUS_M = 300;
type PlaceCache = { lat: number; lon: number; label: string; city: string };

const distanceM = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
  const r = Math.PI / 180;
  const x = (b.lon - a.lon) * r * Math.cos(((a.lat + b.lat) / 2) * r);
  const y = (b.lat - a.lat) * r;
  return Math.sqrt(x * x + y * y) * 6371000;
};

/** Seule zone desservie pour l'instant, affichee a tous ceux qui sont ailleurs. */
const SERVICE_AREA_LABEL = "Banganté, Cameroun";
const SERVICE_AREA_KEY = "bangante";

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Vrai si un champ du geocodage (ville, quartier…) cite Banganté. */
const isServiceArea = (raw: string) => normalize(raw).includes(SERVICE_AREA_KEY);

/**
 * Libelle du lieu pour le header home. A Banganté (ou partout si
 * `SHOW_PLACE_OUTSIDE_SERVICE_AREA`) : « Quartier, Arrondissement » du lieu
 * actuel. Ailleurs, sans permission ou en echec : « Banganté, Cameroun »
 * (seule zone desservie). Ne demande pas la permission.
 * Renvoie aussi `city`, la ville reelle du geocodage (vide si inconnue).
 */
export const useCurrentPlaceLabel = (fallback = SERVICE_AREA_LABEL) => {
  const [label, setLabel] = useState(fallback);
  // Ville reelle du geocodage (champ city/town/village), meme hors zone.
  const [city, setCity] = useState("");
  // Permission accordée après le montage (bandeau du home) : libellé relu.
  const [grantTick, setGrantTick] = useState(0);
  useEffect(
    () =>
      onForegroundLocationStatus((status) => {
        if (status === "granted") setGrantTick((t) => t + 1);
      }),
    [],
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      let cache: PlaceCache | null = null;
      try {
        cache = JSON.parse((await AsyncStorage.getItem(PLACE_CACHE_KEY)) || "null");
      } catch {
        cache = null;
      }
      try {
        const { granted } = await Location.getForegroundPermissionsAsync();
        console.log("[LIEU] permission accordee:", granted);
        if (!granted) return;
        // Lieu deja connu : affiche tout de suite.
        if (cache && alive) {
          setLabel(cache.label);
          if (cache.city) setCity(cache.city);
        }
        const position =
          (await Location.getLastKnownPositionAsync()) ??
          (await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          }));
        const { latitude, longitude } = position.coords;
        console.log("[LIEU] position:", latitude, longitude);
        // Pas bouge : on garde le lieu en cache, sans nouveau geocodage.
        if (cache && distanceM(cache, { lat: latitude, lon: longitude }) < PLACE_CACHE_RADIUS_M) return;

        let text = "";
        let inZone = false;
        let cityName = "";
        try {
          const osm = await osmReverse(latitude, longitude);
          inZone = isServiceArea(JSON.stringify(osm ?? {}));
          const quartier = osm?.neighbourhood || osm?.suburb || osm?.quarter;
          const zone =
            osm?.city_district || osm?.district || osm?.city || osm?.town || osm?.village;
          text = [quartier, zone].filter(Boolean).join(", ");
          cityName = osm?.city || osm?.town || osm?.village || "";
        } catch (error) {
          console.warn("[LIEU] Nominatim echec:", error);
        }

        // Repli : geocodeur du telephone (arrondissement, ville).
        if (!text) {
          const [place] = await Location.reverseGeocodeAsync(position.coords);
          console.log("[LIEU] geocodage telephone:", JSON.stringify(place, null, 2));
          inZone = isServiceArea(JSON.stringify(place ?? {}));
          text = [place?.district || place?.street, place?.city]
            .filter(Boolean)
            .join(", ");
          cityName = place?.city || place?.subregion || "";
        }

        // Hors de la zone desservie : on garde la zone en dur, pour que
        // l'utilisateur comprenne que le service n'y est pas encore (sauf si
        // le flag demande le lieu reel partout).
        if (!inZone && !SHOW_PLACE_OUTSIDE_SERVICE_AREA) text = SERVICE_AREA_LABEL;
        console.log("[LIEU] dans la zone:", inZone, "| libelle affiche:", text);
        if (alive && text) setLabel(text);
        if (alive && cityName) setCity(cityName);
        if (text) {
          const next: PlaceCache = { lat: latitude, lon: longitude, label: text, city: cityName };
          AsyncStorage.setItem(PLACE_CACHE_KEY, JSON.stringify(next)).catch(() => {});
        }
      } catch (error) {
        console.warn("[LIEU] lieu actuel indisponible:", error);
      }
    })();
    return () => {
      alive = false;
    };
  }, [grantTick]);

  return { label, city };
};
