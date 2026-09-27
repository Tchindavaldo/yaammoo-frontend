import { Image } from "expo-image";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { BroadcastShop } from "../../types/broadcast.types";
import { BC } from "./broadcastTheme";

const APP_LOGO = require("@/assets/images/logo.png");

interface Props {
  shop: BroadcastShop | null;
  title: string;
  body: string;
  imageUri: string | null;
}

/**
 * Aperçu en direct de la notification telle que le client la recevra, posé sur
 * un fond chaud où la photo jointe transparaît floutée. Comme le push : photo
 * de la boutique en avatar avec le logo de l'app en pastille, nom de la
 * boutique en en-tête, titre saisi puis message. Boutique sans photo : logo de l'app.
 */
export const BroadcastPreview: React.FC<Props> = ({ shop, title, body, imageUri }) => {
  const hasTitle = title.trim().length > 0;
  const hasBody = body.trim().length > 0;
  const shopName = shop?.name.trim() || "";
  const shownTitle = hasTitle ? title.trim() : "Titre de la notification";

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
        {shop?.imageUrl ? (
          <View style={styles.avatarWrap}>
            <Image source={{ uri: shop.imageUrl }} style={styles.avatar} contentFit="cover" />
            <Image source={APP_LOGO} style={styles.badge} contentFit="cover" />
          </View>
        ) : (
          <Image source={APP_LOGO} style={styles.appIcon} contentFit="cover" />
        )}
        <View style={styles.texts}>
          <Text style={styles.app} numberOfLines={1}>
            {shopName || "Yaammoo"}
          </Text>
          <Text style={[styles.title, !hasTitle && styles.placeholder]} numberOfLines={1}>
            {shownTitle}
          </Text>
          {hasBody && (
            <Text style={styles.body} numberOfLines={2}>
              {body}
            </Text>
          )}
        </View>
        {/* Heure en haut à droite, photo juste dessous, alignées à droite. */}
        <View style={styles.side}>
          <Text style={styles.metaText}>maintenant</Text>
          {!!imageUri && (
            <Image source={{ uri: imageUri }} style={styles.thumb} contentFit="cover" />
          )}
        </View>
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
    // Centré comme la notification iOS : pas de vide sous le texte quand
    // la colonne heure + photo est plus haute.
    alignItems: "center",
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
  appIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#fff" },
  avatarWrap: { width: 40, height: 40 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#E5E5EA" },
  badge: {
    position: "absolute",
    right: -3,
    bottom: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#fff",
    backgroundColor: "#fff",
  },
  texts: { flex: 1, minWidth: 0, gap: 2 },
  side: { alignItems: "flex-end", gap: 6 },
  app: { fontSize: 15, fontWeight: "700", color: BC.ink },
  metaText: { fontSize: 12, color: BC.muted },
  title: { fontSize: 14, fontWeight: "500", color: BC.ink },
  placeholder: { color: "#9A9AA0" },
  body: { fontSize: 14, lineHeight: 19, color: "#3A3A3C" },
  thumb: { width: 44, height: 44, borderRadius: 9 },
});
