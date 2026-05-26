import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";

const KEY = "yaammoo_device_id";

let cached: string | null = null;

/**
 * Renvoie un identifiant unique persistant pour cet appareil/installation.
 * Stocké dans expo-secure-store : survit aux relancements de l'app,
 * disparaît à la désinstallation (comportement voulu).
 */
export async function getDeviceId(): Promise<string> {
  if (cached) return cached;

  try {
    const existing = await SecureStore.getItemAsync(KEY);
    if (existing) {
      cached = existing;
      return existing;
    }
  } catch {
    // ignored
  }

  const bytes = await Crypto.getRandomBytesAsync(16);
  const generated = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  try {
    await SecureStore.setItemAsync(KEY, generated);
  } catch {
    // ignored
  }

  cached = generated;
  console.log("🆔 [DEVICE-ID] Nouveau deviceId généré:", generated.substring(0, 12) + "...");
  return generated;
}
