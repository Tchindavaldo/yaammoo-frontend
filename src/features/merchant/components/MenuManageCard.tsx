"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { DS } from "@/src/theme/ds";
import { t, useLanguage } from "@/src/i18n";
import { styles } from "./MenuManagePanel.styles";

/** Carte d'un plat dans la liste de MenuManagePanel (sortie du fichier, R26). */
export function MenuManageCard({ item, startEdit }: { item: any; startEdit: (m: any) => void }) {
  useLanguage();

    const name = item.name || item.titre || "Menu";
    const status =
      item.status ||
      (item.disponibilite === "Disponible"
        ? "available"
        : item.disponibilite === "Indisponible"
          ? "unavailable"
          : "available");
    const isAvailable = status === "available";
    const prix = item.prices?.[0]?.price || item.prix1 || 0;
    const menuImage = item.coverImage || item.images?.[0] || item.image;
    // Hex obligatoire : le chip statut concatène `statusColor + "14"/"22"`
    // pour obtenir une teinte translucide (8%/13% d'opacité) — une valeur
    // `rgba(...)` ne peut pas être suffixée de la sorte, React Native rendait
    // alors un fond plein illisible au lieu d'un fond léger.
    const statusColor = isAvailable ? "#2dd36f" : DS.accent;

    return (
      <View style={styles.menuRowWrapper}>
        <View style={styles.menuSummaryRow}>
          {/* Avatar image ronde + pastille statut (calque MerchantOrderCard) */}
          <View style={styles.menuAvatarContainer}>
            {menuImage ? (
              <Image
                source={{ uri: menuImage }}
                style={styles.menuAvatarImage}
                cachePolicy="memory-disk"
                transition={150}
              />
            ) : (
              <Ionicons name="fast-food" size={20} color={DS.accent} />
            )}
            <View
              style={[styles.menuStatusDot, { backgroundColor: statusColor }]}
            />
          </View>

          {/* Infos : prix EN HAUT, titre EN BAS (calque commande) */}
          <View style={styles.menuSummaryInfo}>
            <View style={styles.menuTopRow}>
              <View style={styles.menuTitleContainer}>
                <Text style={styles.menuPrice}>{prix} F</Text>
                <Text style={styles.menuName} numberOfLines={1}>
                  {name}
                </Text>
              </View>
              {/* Stock disponible du plat */}
              <View style={styles.menuRankContainer}>
                <Ionicons name="cube-outline" size={13} color="#6b7280" />
                <Text style={styles.menuRankBadge}>{item.stock ?? 0}</Text>
              </View>
            </View>

            <View style={styles.menuBottomRow}>
              {/* Chip prix + chip statut sur la même ligne */}
              <View style={styles.menuChipsRow}>
                <View style={[styles.menuInfoChip]}>
                  <Ionicons name="pricetag-outline" size={13} color="#9ca3af" />
                  <Text style={styles.menuInfoChipText}>
                    {t("{{a}} prix", { a: item.prices?.length || 1 })}
                  </Text>
                </View>
                <View
                  style={[
                    styles.menuInfoChip,
                    {
                      backgroundColor: statusColor + "14",
                      borderColor: statusColor + "22",
                    },
                  ]}
                >
                  <Ionicons name="ellipse" size={8} color={statusColor} />
                  <Text
                    style={[styles.menuInfoChipText, { color: statusColor }]}
                  >
                    {isAvailable ? t("Disponible") : t("Indisponible")}
                  </Text>
                </View>
              </View>

              {/* Action à droite : Modifier */}
              <TouchableOpacity
                style={styles.menuActionBtn}
                onPress={() => startEdit(item)}
              >
                <Ionicons name="create-outline" size={15} color="white" />
                <Text style={styles.menuActionBtnText}>{t("Modifier")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
}
