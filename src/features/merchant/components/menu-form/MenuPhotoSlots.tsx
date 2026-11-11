"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import { Theme } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Image, Text, TouchableOpacity, View } from "react-native";
import { styles } from "./AddMenuSheet.styles";
import { t, useLanguage } from "@/src/i18n";

/** Les 3 emplacements photo du plat (aperçu + progression d'upload). */
export const MenuPhotoSlots: React.FC<{
  images: string[];
  uploadProgress: number[];
  uploadingIdx: number | null;
  pickImage: (index: number) => void;
}> = ({ images, uploadProgress, uploadingIdx, pickImage }) => {
  useLanguage();
  return (
  <>
    <Text
      style={[styles.fieldLabel, { marginTop: Theme.spacing.md }]}
    >
      {t("Photos du plat (3 requises)")}
    </Text>
    <View style={styles.imageRow}>
      {[0, 1, 2].map((idx) => (
        <TouchableOpacity
          key={idx}
          style={[
            styles.imageSlot,
            uploadingIdx !== null && styles.imageSlotDisabled,
          ]}
          onPress={() => pickImage(idx)}
          // Pendant un upload en cours, on bloque toute autre sélection.
          disabled={uploadingIdx !== null}
        >
          {images[idx] ? (
            <>
              <Image
                source={{ uri: images[idx] }}
                style={styles.imagePreview}
              />
              {uploadingIdx === idx && (
                <View style={styles.uploadOverlay}>
                  <ActivityIndicator color="white" />
                  <Text style={styles.uploadText}>
                    {uploadProgress[idx]}%
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons
                name="camera-outline"
                size={28}
                color={Theme.colors.gray[400]}
              />
              <Text style={styles.imagePlaceholderText}>
                {t("Photo")} {idx + 1}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  </>
);
};
