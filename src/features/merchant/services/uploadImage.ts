import axios from "axios";
import { Platform } from "react-native";
import { Config } from "@/src/api/config";

/**
 * Upload une image (URI locale ou blob web) vers le backend et renvoie l'URL
 * publique. Utilisé pour la photo de la boutique (création + édition) et,
 * potentiellement, les images de menu. Lève en cas d'échec serveur.
 */
export async function uploadImageToServer(uri: string): Promise<string> {
  const formData = new FormData();
  const filename = uri.split("/").pop() || "image.jpg";
  const type = "image/jpeg";

  if (Platform.OS === "web") {
    const res = await fetch(uri);
    const blob = await res.blob();
    formData.append("image", blob, filename);
  } else {
    formData.append("image", { uri, name: filename, type } as any);
  }

  const response = await axios.post(`${Config.apiUrl}/image/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data?.url || response.data?.data || "";
}

/** true si l'URI est une image locale pas encore uploadée (à uploader avant envoi). */
export function isLocalUri(uri: string): boolean {
  return (
    uri.startsWith("file://") ||
    uri.startsWith("content://") ||
    uri.startsWith("blob:") ||
    uri.startsWith("data:")
  );
}
