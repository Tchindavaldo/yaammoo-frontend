import { Menu } from "@/src/types";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";
import { useNextDeliveryTime } from "../../../../utils/deliveryUtils";
import { SHOW_AVAILABILITY } from "../config";
import { sharedStyles as styles } from "../styles/sharedStyles";

/**
 * Bloc d'infos rendu SOUS la carte, hors de celle-ci : nom du menu, livraison
 * (montant + delai), note et votes, stock.
 */
export const ItemMeta: React.FC<{
  menu: Menu;
  variant: number;
  width: number;
  marginRight: number;
  deliveryHours?: string[];
  orderLeadTime?: number;
  index?: number;
}> = ({
  menu,
  variant,
  width,
  marginRight,
  deliveryHours = [],
  orderLeadTime = 0,
  index = 0,
}) => {
  const rating = (menu as any)?.rating ?? 4.5;
  const votes = (menu as any)?.votes ?? 0;
  // Appel conserve : le hook fait partie de l'ordre des hooks du composant.
  useNextDeliveryTime(deliveryHours, orderLeadTime);

  return (
    <View style={[styles.metaBlock, { width, marginRight }]}>
      <View style={styles.metaTitleRow}>
        {variant === 7 ? (
          <>
            <Text style={[styles.metaTitle, { color: "#000" }]} numberOfLines={1}>
              {menu.titre}
            </Text>
            <View style={{ flex: 1 }} />
            <Text style={[styles.metaText, { color: "#000", marginRight: 6 }]}>
              {(menu as any)?.stock ?? 0}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.metaTitle} numberOfLines={1}>
              {menu.titre}
            </Text>
            {/* Pour masquer le statut : SHOW_AVAILABILITY = false (config.ts). */}
            {SHOW_AVAILABILITY ? (
              <>
                <View style={{ flex: 1 }} />
                {variant === 4 ? (
                  <>
                    <Ionicons name="star" size={12} color="#f5a623" />
                    <Text style={[styles.metaText, { color: "#000" }]}>
                      {rating}
                    </Text>
                    <Text style={styles.metaMuted}>({votes} avis)</Text>
                  </>
                ) : (
                  <Text
                    style={[
                      styles.metaText,
                      { color: "#000", fontSize: variant === 6 ? 13 : 11 },
                    ]}
                  >
                    {(menu as any)?.stock ?? 0}
                    {variant !== 5 ? " plats disponibles" : null}
                  </Text>
                )}
              </>
            ) : null}
          </>
        )}
      </View>

      {variant === 4 ? (
        <View style={[styles.metaRow, { justifyContent: "space-between" }]}>
          <Text style={styles.metaText}>
            Livraison{" "}
            <Text style={{ color: "#e8440a", fontWeight: "900" }}>
              {index % 3 === 0 ? "gratuite" : index % 3 === 1 ? "300F" : "1000F"}
            </Text>
          </Text>
          <Text style={styles.v4TimeText}>
            Livré en <Text style={styles.v4TimeValue}>15min</Text>
          </Text>
        </View>
      ) : (
        <View style={styles.metaRow}>
          {variant === 5 || variant === 7 ? (
            <Text style={styles.metaText}>
              Livré en{" "}
              <Text style={{ color: "#e8440a", fontWeight: "900" }}>30min</Text>
            </Text>
          ) : (
            <>
              <Text style={styles.metaText}>Livraison </Text>
              <Text style={[styles.metaFree, { color: "#e8440a" }]}>
                offerte 30min
              </Text>
            </>
          )}
          <View style={{ flex: 1 }} />
          {/* Le variant 7 n'affiche pas de note. */}
          {variant !== 7 && variant !== 4 ? (
            <Ionicons name="star" size={12} color="#f5a623" />
          ) : null}
          {variant !== 7 && variant !== 4 ? (
            <Text style={styles.metaText}>{rating}</Text>
          ) : null}
          {/* La carte du variant 5 est plus etroite : le nombre d'avis deborde. */}
          {variant !== 5 && variant !== 7 ? (
            <Text style={styles.metaMuted}>({votes} avis)</Text>
          ) : null}
        </View>
      )}
    </View>
  );
};
