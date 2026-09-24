import { AppBlurView as BlurView } from "@/src/components/AppBlurView";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { CARD_BOTTOM_STYLE } from "../config";
import { sharedStyles as styles } from "../styles/sharedStyles";

/** Pastille des frais de livraison (« gratuit », « 300F »…) : fond accent, texte blanc gras. */
export const DeliveryFeePill: React.FC<{ label: string; accent: string }> = ({
  label,
  accent,
}) => (
  <View style={[styles.deliveryFeePill, { backgroundColor: accent }]}>
    <Text style={[styles.deliveryFeePillText, { color: "#fff", fontWeight: "800" }]}>
      {label}
    </Text>
  </View>
);

/**
 * ANDROID — ombre interne noire legere en bas de carte (pas de degrade), posee
 * SOUS la barre basse des variants 4 et 5, qui passe alors en `dark`.
 * `boxShadow` inset : new architecture requise (activee, RN 0.81).
 */
export const DarkBottomShade: React.FC = () => (
  <View
    pointerEvents="none"
    style={[
      StyleSheet.absoluteFill,
      { boxShadow: "inset 0px -70px 40px -30px rgba(0,0,0,0.55)" },
    ]}
  />
);

/**
 * Barre blur d'origine : "X en stock" + progression a gauche, livraison a
 * droite (design de l'ancien bottom du variant 4). Mode "blur2".
 * `dark` : meme contenu, sans aucun fond blanc, textes blancs (sur l'ombre).
 */
const StockDeliveryBar: React.FC<{
  accent: string;
  deliveryTime: string;
  stock: number;
  hideStock?: boolean;
  stockLabel?: string;
  dark?: boolean;
}> = ({
  accent,
  deliveryTime,
  stock,
  hideStock = false,
  stockLabel = "disponible",
  dark = false,
}) => {
  const ink = dark ? "#fff" : "#000";
  return (
    <BlurView
      disableAndroidBlur
      intensity={60}
      tint="light"
      style={[styles.v4StockBar, dark && styles.darkNoBg]}
    >
      <View style={styles.v4StockMainRow}>
        {!hideStock && (
          <View style={[styles.v4StockLeftSection, dark && styles.darkNoBg]}>
            <View style={styles.v4StockInfo}>
              <Text style={[styles.v4StockCount, { color: ink, flexShrink: 0 }]}>
                {stock}
              </Text>
              <Text style={[styles.v4StockCount, { color: ink, flexShrink: 0 }]}>
                {stockLabel}
              </Text>
            </View>
            <View style={[styles.v4ProgressTrack, dark && styles.darkTrack]}>
              <View style={[styles.v4ProgressFill, { width: `${stock}%` }]} />
            </View>
          </View>
        )}
        <View style={[styles.v4DeliveryStrip, dark && styles.darkNoBg]}>
          <View
            style={[
              styles.v5DeliveryIcon,
              { backgroundColor: dark ? "transparent" : "#fff" },
            ]}
          >
            <Ionicons name="flash" size={10} color={accent} />
          </View>
          <View>
            <Text
              style={[styles.v5DeliveryLabel, { fontSize: 10 }, dark && { color: ink }]}
            >
              Prochaine
            </Text>
            <Text style={[styles.v5DeliveryTime, { color: ink, fontSize: 11 }]}>
              Livraison {deliveryTime}
            </Text>
          </View>
        </View>
      </View>
    </BlurView>
  );
};

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
  /** true = barre "blur2" sans fond blanc, textes blancs (Android, variant 4). */
  dark?: boolean;
}> = ({
  accent,
  deliveryTime,
  stock,
  withBackground = true,
  hideStock = false,
  stockLabel = "disponible",
  deliveryFeeLabel = "gratuit",
  dark = false,
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
        dark={dark}
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
 * `dark` : meme contenu, sans aucun fond blanc, textes blancs (Android).
 */
export const V5BottomBar: React.FC<{
  accent: string;
  deliveryTime: string;
  deliveryFeeLabel: string;
  dark?: boolean;
}> = ({ accent, deliveryTime, deliveryFeeLabel, dark = false }) => {
  const ink = dark ? "#fff" : "black";
  return (
    <BlurView
      disableAndroidBlur
      intensity={60}
      tint="light"
      style={[styles.v5BottomBar, dark && styles.darkNoBg]}
    >
      <View
        style={[
          styles.v5DeliveryIcon,
          { backgroundColor: dark ? "transparent" : "#fff" },
        ]}
      >
        <Ionicons name="flash" size={10} color={accent} />
      </View>
      <View>
        <Text
          style={[styles.v5DeliveryLabel, { fontSize: 10 }, dark && { color: ink }]}
        >
          Prochaine
        </Text>
        <Text style={[styles.v5DeliveryTime, { color: ink, fontSize: 11 }]}>
          <View style={styles.v5DeliveryFeeRow}>
            <Text style={[styles.v5DeliveryTime, { color: ink, fontSize: 11 }]}>
              Livraison {deliveryTime}
            </Text>
            <DeliveryFeePill label={deliveryFeeLabel} accent={accent} />
          </View>
        </Text>
      </View>
    </BlurView>
  );
};
