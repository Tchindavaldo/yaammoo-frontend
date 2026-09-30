import * as Location from "expo-location";
import { useEffect, useState } from "react";

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

/** Seule zone desservie pour l'instant, affichee a tous ceux qui sont ailleurs. */
const SERVICE_AREA_LABEL = "Banganté, Cameroun";
const SERVICE_AREA_KEY = "bangante";

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Vrai si un champ du geocodage (ville, quartier…) cite Banganté. */
const isServiceArea = (raw: string) => normalize(raw).includes(SERVICE_AREA_KEY);

/**
 * Libelle du lieu pour le header home. A Banganté : « Quartier, Arrondissement »
 * du lieu actuel. Ailleurs, sans permission ou en echec : « Banganté, Cameroun »
 * (seule zone desservie). Ne demande pas la permission.
 */
export const useCurrentPlaceLabel = (fallback = SERVICE_AREA_LABEL) => {
  const [label, setLabel] = useState(fallback);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { granted } = await Location.getForegroundPermissionsAsync();
        console.log("[LIEU] permission accordee:", granted);
        if (!granted) return;
        const position =
          (await Location.getLastKnownPositionAsync()) ??
          (await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          }));
        const { latitude, longitude } = position.coords;
        console.log("[LIEU] position:", latitude, longitude);

        let text = "";
        let inZone = false;
        try {
          const osm = await osmReverse(latitude, longitude);
          inZone = isServiceArea(JSON.stringify(osm ?? {}));
          const quartier = osm?.neighbourhood || osm?.suburb || osm?.quarter;
          const zone =
            osm?.city_district || osm?.district || osm?.city || osm?.town || osm?.village;
          text = [quartier, zone].filter(Boolean).join(", ");
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
        }

        // Hors de la zone desservie : on garde la zone en dur, pour que
        // l'utilisateur comprenne que le service n'y est pas encore.
        if (!inZone) text = SERVICE_AREA_LABEL;
        console.log("[LIEU] dans la zone:", inZone, "| libelle affiche:", text);
        if (alive && text) setLabel(text);
      } catch (error) {
        console.warn("[LIEU] lieu actuel indisponible:", error);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return label;
};
