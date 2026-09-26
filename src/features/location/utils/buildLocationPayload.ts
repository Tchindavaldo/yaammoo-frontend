import * as Location from "expo-location";
import { Platform } from "react-native";
import {
  LocationSource,
  UserLocationPayload,
} from "../services/userLocationService";

/** Texte nettoyé et borné à la longueur acceptée par le backend. */
const clean = (v?: string | null, max = 120) =>
  v && v.trim() ? v.trim().slice(0, max) : undefined;

/** Mesure valide dans [min, max] ; iOS renvoie -1 pour une vitesse ou un cap inconnus. */
const within = (v: number | null | undefined, min: number, max: number) =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max
    ? v
    : undefined;

/**
 * Position → payload de `POST /user/location`, avec le géocodage inverse du
 * téléphone (ville, département, région…, sans clé d'API). Le géocodage peut
 * échouer (hors ligne) : les coordonnées partent quand même.
 */
export const buildLocationPayload = async (
  position: Location.LocationObject,
  source: LocationSource,
): Promise<UserLocationPayload> => {
  const { latitude, longitude, accuracy, altitude, speed, heading } =
    position.coords;

  let place: Location.LocationGeocodedAddress | undefined;
  try {
    [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
  } catch (error) {
    console.warn("Géocodage inverse impossible:", error);
  }

  return {
    latitude,
    longitude,
    accuracy: within(accuracy, 0, Infinity),
    altitude: within(altitude, -1000, 10000),
    speed: within(speed, 0, Infinity),
    heading: within(heading, 0, 360),
    city: clean(place?.city),
    subregion: clean(place?.subregion),
    region: clean(place?.region),
    district: clean(place?.district),
    street: clean(place?.street),
    streetNumber: clean(place?.streetNumber, 20),
    placeName: clean(place?.name),
    formattedAddress: clean(place?.formattedAddress, 300),
    postalCode: clean(place?.postalCode),
    country: clean(place?.country),
    isoCountryCode: clean(place?.isoCountryCode, 3),
    timezone: clean(place?.timezone, 64),
    source,
    platform: Platform.OS === "ios" ? "ios" : "android",
    capturedAt: new Date(position.timestamp).toISOString(),
  };
};
