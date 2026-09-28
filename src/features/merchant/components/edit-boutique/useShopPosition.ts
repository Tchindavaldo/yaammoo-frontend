import * as Location from "expo-location";
import { useCallback, useState } from "react";
import { Platform } from "react-native";

export type ShopPosition = { latitude: number; longitude: number };

/**
 * Position de la boutique (formulaire d'édition) : le marchand, sur place,
 * pose la position GPS du téléphone. Envoyée avec le formulaire
 * (`latitude` / `longitude` de `POST /fastfood/:id`) ; sert à la distance
 * affichée au home (`distanceKm`, BACKEND/architecture/geolocation.md).
 */
export const useShopPosition = (
  onError: (message: string) => void,
) => {
  const [shopPosition, setShopPosition] = useState<ShopPosition | null>(null);
  const [locating, setLocating] = useState(false);

  /** Charge la position enregistrée (réponse de `GET /fastfood/:id`). */
  const loadShopPosition = useCallback((data: any) => {
    const lat = Number(data?.latitude);
    const lng = Number(data?.longitude);
    setShopPosition(
      data?.latitude != null && Number.isFinite(lat) && Number.isFinite(lng)
        ? { latitude: lat, longitude: lng }
        : null,
    );
  }, []);

  const captureShopPosition = useCallback(async () => {
    if (Platform.OS === "web") {
      onError("Disponible dans l'application mobile");
      return;
    }
    setLocating(true);
    try {
      const current = await Location.getForegroundPermissionsAsync();
      let status = current.status;
      if (status !== "granted" && current.canAskAgain) {
        status = (await Location.requestForegroundPermissionsAsync()).status;
      }
      if (status !== "granted") {
        onError("Autorisez la localisation dans les réglages du téléphone");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setShopPosition({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
    } catch (e) {
      console.warn("Position de la boutique impossible:", e);
      onError("Position introuvable, réessayez à l'extérieur");
    } finally {
      setLocating(false);
    }
  }, [onError]);

  return { shopPosition, locating, loadShopPosition, captureShopPosition };
};
