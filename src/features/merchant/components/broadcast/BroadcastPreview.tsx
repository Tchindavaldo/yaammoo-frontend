import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { BC } from "./broadcastTheme";

const APP_ICON = require("@/assets/images/icon.png");

interface Props {
  title: string;
  body: string;
  imageUri: string | null;
}

/**
 * Aperçu en direct de la notification telle que le client la recevra, posé sur
 * un fond chaud où la photo jointe transparaît floutée.
 */
export const BroadcastPreview: React.FC<Props> = ({ title, body, imageUri }) => {
  const hasTitle = title.trim().length > 0;
  const hasBody = body.trim().length > 0;

  return (
    <View style={styles.stage}>
      {!!imageUri && (
        <Image
          source={{ uri: imageUri }}
          style={[StyleSheet.absoluteFill, styles.backdrop]}
          contentFit="cover"
          blurRadius={24}
        />
      )}
      <View style={styles.card}>
        <Image source={APP_ICON} style={styles.appIcon} />
        <View style={styles.texts}>
          <View style={styles.meta}>
            <Text style={styles.app}>YAAMMOO</Text>
            <Text style={styles.metaText}>maintenant</Text>
          </View>
          <Text style={[styles.title, !hasTitle && styles.placeholder]} numberOfLines={1}>
            {hasTitle ? title : "Titre de la notification"}
          </Text>
          {hasBody && (
            <Text style={styles.body} numberOfLines={2}>
              {body}
            </Text>
          )}
        </View>
        {!!imageUri && (
          <Image source={{ uri: imageUri }} style={styles.thumb} contentFit="cover" />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  stage: {
    overflow: "hidden",
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderRadius: 22,
    backgroundColor: "#F1EFEC",
  },
  backdrop: { opacity: 0.6 },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.94)",
    shadowColor: "#000",
    shadowOpacity: 0.09,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  appIcon: { width: 36, height: 36, borderRadius: 9 },
  texts: { flex: 1, minWidth: 0, gap: 2 },
  meta: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  app: { fontSize: 12, fontWeight: "600", letterSpacing: 0.3, color: BC.muted },
  metaText: { fontSize: 12, color: BC.muted },
  title: { fontSize: 15, fontWeight: "600", color: BC.ink },
  placeholder: { color: "#9A9AA0" },
  body: { fontSize: 14, lineHeight: 19, color: "#3A3A3C" },
  thumb: { width: 44, height: 44, marginTop: 16, borderRadius: 9 },
});
