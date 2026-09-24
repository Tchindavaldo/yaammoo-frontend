import axios from "axios";
import { Platform } from "react-native";
import { Config } from "@/src/api/config";

/**
 * Envoie une note vocale (fichier local m4a) au backend et renvoie son URL
 * publique, rangee dans le dossier `voiceNotes/` du stockage.
 *
 * IMPORTANT : la commande doit porter cette URL, jamais l'URI locale
 * (`file://...`) : elle n'existe que sur le telephone qui a enregistre, le
 * marchand ne pourrait pas l'ecouter.
 */
export async function uploadVoiceNote(uri: string): Promise<string> {
  const formData = new FormData();
  const name = uri.split("/").pop() || "voice.m4a";

  if (Platform.OS === "web") {
    const blob = await (await fetch(uri)).blob();
    formData.append("image", blob, name.includes(".") ? name : `${name}.webm`);
  } else {
    formData.append("image", { uri, name, type: "audio/m4a" } as any);
  }
  formData.append("folder", "voiceNotes");

  const response = await axios.post(`${Config.apiUrl}/image/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  const url: string = response.data?.data || "";
  if (!url) throw new Error("URL de la note vocale absente de la reponse");
  return url;
}
