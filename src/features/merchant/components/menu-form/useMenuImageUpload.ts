import { Config } from "@/src/api/config";
import axios from "axios";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert, Platform } from "react-native";

/**
 * Photos du formulaire menu : sélection galerie + upload `/image/upload` avec
 * progression par emplacement. Extrait de `AddMenuSheetMultiStep` (R4).
 */
export const useMenuImageUpload = () => {
  const [images, setImages] = useState<string[]>([]);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState([0, 0, 0]);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  const pickImage = async (index: number) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission refusée",
        "Nous avons besoin d'accéder à votre galerie.",
      );
      return;
    }

    // Formats par emplacement : photo 1 sans recadrage (cadrage d'origine garde),
    // photo 2 carree, photo 3 verticale (portrait 3:4).
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: index !== 0,
      ...(index !== 0
        ? { aspect: (index === 2 ? [3, 4] : [1, 1]) as [number, number] }
        : {}),
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      const newImages = [...images];
      newImages[index] = uri;
      setImages(newImages);

      // Upload image
      await uploadImage(uri, index);
    }
  };

  const uploadImage = async (uri: string, index: number) => {
    const startTime = Date.now();
    let mockInterval: any = null;
    let currentProgress = 0;

    try {
      setUploadingIdx(index);
      setUploadProgress((prev) => {
        const next = [...prev];
        next[index] = 0;
        return next;
      });

      let fileSize = 0;
      if (Platform.OS !== "web") {
        try {
          const fileInfo = await FileSystem.getInfoAsync(uri);
          if (fileInfo.exists) {
            fileSize = fileInfo.size;
            console.log(`Local file size for index ${index}:`, fileSize);
          }
        } catch (err) {
          console.warn("Failed to get file size", err);
        }
      }

      // Progression simulée pour les uploads trop rapides afin de garantir un rendu progressif visible
      mockInterval = setInterval(() => {
        currentProgress += Math.random() * 12 + 6; // Progression par pas de 6 à 18%
        if (currentProgress >= 95) {
          currentProgress = 95;
          clearInterval(mockInterval);
        }
        const prog = Math.round(currentProgress);
        console.log(`[Progression simulée] Index ${index} ->`, prog, "%");
        setUploadProgress((prev) => {
          const next = [...prev];
          next[index] = prog;
          return next;
        });
      }, 150);

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
      formData.append("folder", "menus");

      const response = await axios.post(
        `${Config.apiUrl}/image/upload`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (e) => {
            const total = e.total || fileSize;
            const elapsedMs = Date.now() - startTime;
            if (total) {
              const realProg = Math.round((e.loaded / total) * 100);
              console.log(
                `[Axios temps réel] Index ${index} -> ${realProg}% | ${Math.round(e.loaded / 1024)} Ko / ${Math.round(total / 1024)} Ko | ${elapsedMs} ms`,
              );
              if (realProg > currentProgress) {
                currentProgress = realProg;
                const prog = Math.min(99, realProg);
                setUploadProgress((prev) => {
                  const next = [...prev];
                  next[index] = prog;
                  return next;
                });
              }
            } else {
              // Pas de total connu (RN ne fournit pas toujours e.total) : on log
              // quand même les octets réellement envoyés.
              console.log(
                `[Axios temps réel] Index ${index} -> ${Math.round(e.loaded / 1024)} Ko envoyés | ${elapsedMs} ms`,
              );
            }
          },
        },
      );
      
      // Stop the simulation once the response is received
      if (mockInterval) clearInterval(mockInterval);
      console.log(
        `[Axios temps réel] Index ${index} -> envoi terminé (réponse serveur) en ${Date.now() - startTime} ms`,
      );

      const url = response.data?.url || response.data?.data || "";
      const newUrls = [...uploadedUrls];
      newUrls[index] = url;
      setUploadedUrls(newUrls);

      setUploadProgress((prev) => {
        const next = [...prev];
        next[index] = 100;
        return next;
      });

      // Garantir au moins 1200ms de visibilité pour voir la progression de l'upload
      const elapsed = Date.now() - startTime;
      if (elapsed < 1200) {
        await new Promise((resolve) => setTimeout(resolve, 1200 - elapsed));
      }
    } catch (error) {
      if (mockInterval) clearInterval(mockInterval);
      console.error("Upload error:", error);
      // Échec d'upload : on retire la photo du slot, sinon l'aperçu resterait
      // affiché sans URL réelle derrière (retour au placeholder "Photo N").
      setImages((prev) => {
        const next = [...prev];
        delete next[index];
        return next;
      });
      setUploadProgress((prev) => {
        const next = [...prev];
        next[index] = 0;
        return next;
      });
      Alert.alert("Erreur", `Impossible d'uploader l'image ${index + 1}`);
    } finally {
      setUploadingIdx(null);
    }
  };

  /** Recharge les images d'un menu existant (déjà uploadées). */
  const load = (urls: string[]) => {
    setImages(urls);
    setUploadedUrls(urls);
  };

  const resetImages = () => {
    setImages([]);
    setUploadedUrls([]);
    setUploadProgress([0, 0, 0]);
  };

  return {
    images,
    uploadedUrls,
    uploadProgress,
    uploadingIdx,
    pickImage,
    load,
    resetImages,
  };
};
