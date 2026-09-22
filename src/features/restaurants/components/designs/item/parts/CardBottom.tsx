import { AppBlurView as BlurView } from "@/src/components/AppBlurView";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";
import { CARD_BOTTOM_STYLE } from "../config";
import { sharedStyles as styles } from "../styles/sharedStyles";

/** Pastille des frais de livraison (« gratuit », « 300F »…). */
export const DeliveryFeePill: React.FC<{ label: string; accent: string }> = ({
  label,
}) => (
  <View style={styles.deliveryFeePill}>
    <Text style={[styles.deliveryFeePillText, { color: "#000" }]}>{label}</Text>
  </View>
);

/**
 * Barre blur d'origine : "X en stock" + progression a gauche, livraison a
 * droite (design de l'ancien bottom du variant 4). Mode "blur2".
 */
const StockDeliveryBar: React.FC<{
  accent: string;
  deliveryTime: string;
  stock: number;
  hideStock?: boolean;
  stockLabel?: string;
}> = ({
  accent,
  deliveryTime,
  stock,
  hideStock = false,
  stockLabel = "disponible",
}) => (
  <BlurView
    disableAndroidBlur
    intensity={60}
    tint="light"
    style={styles.v4StockBar}
  >
    <View style={styles.v4StockMainRow}>
      {!hideStock && (
        <View style={styles.v4StockLeftSection}>
          <View style={styles.v4StockInfo}>
            <Text
              style={[styles.v4StockCount, { color: "#000", flexShrink: 0 }]}
            >
              {stock}
            </Text>
            <Text
              style={[
                styles.v4StockCount,
                { color: "#000000ff", flexShrink: 0 },
              ]}
            >
              {stockLabel}
            </Text>
          </View>
          <View style={styles.v4ProgressTrack}>
            <View style={[styles.v4ProgressFill, { width: `${stock}%` }]} />
          </View>
        </View>
      )}
      <View style={styles.v4DeliveryStrip}>
        <View style={[styles.v5DeliveryIcon, { backgroundColor: "#fff" }]}>
          <Ionicons name="flash" size={10} color={accent} />
        </View>
        <View>
          <Text style={[styles.v5DeliveryLabel, { fontSize: 10 }]}>
            Prochaine
          </Text>
          <Text
            style={[styles.v5DeliveryTime, { color: "black", fontSize: 11 }]}
          >
            Livraison {deliveryTime}
          </Text>
        </View>
      </View>
    </View>
  </BlurView>
);

/** Zone basse du variant 7 (sans fond : la carte porte deja le sien). */
const V7BottomZone: React.FC<{
  accent: string;
  deliveryTime: string;
  deliveryFeeLabel: string;
}> = ({ accent, deliveryTime, deliveryFeeLabel }) => (
  <View style={styles.v7BottomZone}>
    <View style={styles.v7LiveRow}>
      <Text style={styles.v7LiveMeta}>Prochaine</Text>
    </View>
    <View style={styles.v7DeliveryRow}>
      <Text style={styles.v7LiveHour}>livraison · {deliveryTime}</Text>
      <DeliveryFeePill label={deliveryFeeLabel} accent={accent} />
    </View>
  </View>
);

/** Bas interne commun des cartes, pilote par `CARD_BOTTOM_STYLE`. */
export const CardBottom: React.FC<{
  accent: string;
  deliveryTime: string;
  stock: number;
  /** false = zone seule (v7, qui porte deja son fond) ; true = fond + zone. */
  withBackground?: boolean;
  /** true = sans la partie stock (variante 5 en blur2). */
  hideStock?: boolean;
  stockLabel?: string;
  deliveryFeeLabel?: string;
}> = ({
  accent,
  deliveryTime,
  stock,
  withBackground = true,
  hideStock = false,
  stockLabel = "disponible",
  deliveryFeeLabel = "gratuit",
}) => {
  // Mode "blur2" : ancienne barre stock + livraison, sauf le 7 qui garde
  // sa propre zone.
  if (CARD_BOTTOM_STYLE === "blur2") {
    if (!withBackground) {
      return (
        <V7BottomZone
          accent={accent}
          deliveryTime={deliveryTime}
          deliveryFeeLabel={deliveryFeeLabel}
        />
      );
    }
    return (
      <StockDeliveryBar
        accent={accent}
        deliveryTime={deliveryTime}
        stock={stock}
        hideStock={hideStock}
        stockLabel={stockLabel}
      />
    );
  }
  if (CARD_BOTTOM_STYLE !== "blur") {
    // Mode v7 (autres cards) : livraison en chip blanc, comme le chip prix.
    // Le v7 lui-meme garde sa propre zone (withBackground=false).
    if (!withBackground) {
      return (
        <V7BottomZone
          accent={accent}
          deliveryTime={deliveryTime}
          deliveryFeeLabel={deliveryFeeLabel}
        />
      );
    }
    return (
      <View style={styles.v7BottomZone}>
        <View
          style={[
            styles.v7PricePill,
            {
              backgroundColor: "#fff",
              alignSelf: "flex-start",
              maxWidth: "100%",
              paddingVertical: 6,
            },
          ]}
        >
          <Text style={[styles.v7LiveMeta, { color: "#000" }]}>Prochaine</Text>
          <Text style={[styles.v7LiveHour, { color: "#000" }]}>
            livraison · <Text style={{ color: accent }}>{deliveryTime}</Text>
          </Text>
          <DeliveryFeePill label={deliveryFeeLabel} accent={accent} />
        </View>
      </View>
    );
  }
  // Mode "blur" : rien en interne — la barre est en 3e ligne externe
  // (ItemMeta). Les autres modes gardent leur barre interne.
  return null;
};

/**
 * Bande basse du variant 5 : uniquement la prochaine livraison + frais.
 */
export const V5BottomBar: React.FC<{
  accent: string;
  deliveryTime: string;
  deliveryFeeLabel: string;
}> = ({ accent, deliveryTime, deliveryFeeLabel }) => (
  <BlurView
    disableAndroidBlur
    intensity={60}
    tint="light"
    style={styles.v5BottomBar}
  >
    <View style={[styles.v5DeliveryIcon, { backgroundColor: "#fff" }]}>
      <Ionicons name="flash" size={10} color={accent} />
    </View>
    <View>
      <Text style={[styles.v5DeliveryLabel, { fontSize: 10 }]}>Prochaine</Text>
      <Text style={[styles.v5DeliveryTime, { color: "black", fontSize: 11 }]}>
        <View style={styles.v5DeliveryFeeRow}>
          <Text
            style={[styles.v5DeliveryTime, { color: "black", fontSize: 11 }]}
          >
            Livraison {deliveryTime}
          </Text>
          <DeliveryFeePill label={deliveryFeeLabel} accent={accent} />
        </View>
      </Text>
    </View>
  </BlurView>
);
