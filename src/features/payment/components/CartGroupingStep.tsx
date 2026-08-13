import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "./CartGroupedDeliverySheet.styles";
import { C } from "./CartPaymentSheet.styles";

const fmt = (n: number) => `${Math.round(n).toLocaleString("fr-FR")}`;

interface CartGroupingStepProps {
  /** Nombre total de commandes du lot. */
  cmd: number;
  /** Boutique du lot : titre de la card rappelant ses livraisons distinctes. */
  fastFoodName?: string;
  /** Nombre de livraisons differentes actuellement prevues pour cette boutique. */
  deliveryCount?: number;
  /** Frais de course cumulés si chaque zone est livrée séparément. */
  fraisSepares: number;
  /** Frais réellement dus une fois tout groupé (une seule course). */
  fraisGroupes: number;
  /** Passage à l'étape de composition de la livraison commune. */
  onGroup: () => void;
  /** Livraisons séparées : retour au panier, chaque zone garde son bouton. */
  onSplit: () => void;
}

/**
 * ÉTAPE 1 du sheet de livraison groupée — choix du groupage (écran 02 du
 * design « Panier - Paiement »). Contenu seul : le calque animé qui l'accueille
 * est porté par `CartGroupedDeliverySheet`.
 */
export const CartGroupingStep: React.FC<CartGroupingStepProps> = ({
  cmd,
  fastFoodName,
  deliveryCount,
  fraisSepares,
  fraisGroupes,
  onGroup,
  onSplit,
}) => (
  <>
    <Text style={styles.question}>
      Une seule livraison pour tout, ou des livraisons différentes ?
    </Text>

    <View style={styles.cards}>
      {fastFoodName && deliveryCount ? (
        <View style={styles.card}>
          <View style={styles.dot}>
            <Ionicons name="storefront-outline" size={17} color={C.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{fastFoodName}</Text>
            <Text style={styles.cardSub}>
              {deliveryCount} livraison{deliveryCount > 1 ? "s" : ""} différente
              {deliveryCount > 1 ? "s" : ""} pour ce fastfood
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.card}>
        <View style={styles.dot}>
          <Ionicons name="cube-outline" size={17} color={C.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>1 course, 1 livreur</Text>
          <Text style={styles.cardSub}>
            Vos {cmd} commande{cmd > 1 ? "s" : ""} voyagent ensemble
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.dot}>
          <Ionicons name="time-outline" size={17} color={C.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Frais de livraison uniques</Text>
          <Text style={styles.cardSub}>
            {fmt(fraisGroupes)} F au lieu de {fmt(fraisSepares)} F
          </Text>
        </View>
      </View>
    </View>

    <View style={styles.spacer} />

    <TouchableOpacity
      style={styles.primaryBtn}
      onPress={onGroup}
      activeOpacity={0.85}
    >
      <Text style={styles.primaryBtnLabel}>Tout livrer ensemble</Text>
    </TouchableOpacity>
    {/* 
    <Text style={styles.hint}>
      Toutes vos commandes seront livrées à la même adresse, au même moment.
    </Text> */}

    <TouchableOpacity
      style={styles.linkBtn}
      onPress={onSplit}
      activeOpacity={0.7}
    >
      <Text style={styles.linkBtnLabel}>
        J&apos;ai besoin de livraisons séparées
      </Text>
    </TouchableOpacity>
  </>
);
