import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "./CartGroupedDeliverySheet.styles";
import { C } from "./CartPaymentSheet.styles";

/** Types de livraison proposes pour la course commune. */
export type GroupedDeliveryType = "express" | "standard" | "aucune";

interface CartDeliveryTypeStepProps {
  /** Nombre total de commandes du lot (rappel dans les sous-titres). */
  cmd: number;
  /** Type actuellement retenu : sa card porte le surlignage orange. */
  value: GroupedDeliveryType;
  /** Choix d'un type — la card devient active immediatement. */
  onChange: (type: GroupedDeliveryType) => void;
  /** Passage a l'etape de composition de la livraison. */
  onNext: () => void;
  /** Retour a l'etape de groupage. */
  onBack: () => void;
}

/**
 * ETAPE intermediaire du sheet de livraison groupee — choix du TYPE de
 * livraison (Express / Heure / Aucun), entre le groupage et la composition de
 * la livraison commune.
 *
 * Copie dediee de `CartGroupingStep` (R16 : on duplique, on ne partage pas) :
 * meme gabarit — accroche, trois cards, bouton principal, lien secondaire — mais
 * ses cards sont SELECTIONNABLES et portent les types de livraison au lieu des
 * informations du lot.
 */
export const CartDeliveryTypeStep: React.FC<CartDeliveryTypeStepProps> = ({
  cmd,
  value,
  onChange,
  onNext,
  onBack,
}) => {
  const options: {
    key: GroupedDeliveryType;
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    sub: string;
  }[] = [
    {
      key: "express",
      icon: "flash-outline",
      title: "Livraison express",
      sub: "Livré dès que terminée",
    },
    {
      key: "standard",
      icon: "time-outline",
      title: "Livraison à l'heure",
      sub: "Vous choisissez le créneau",
    },
    {
      key: "aucune",
      icon: "storefront-outline",
      title: "Aucune livraison",
      sub: `Vous récupérez vos ${cmd} commande${cmd > 1 ? "s" : ""}`,
    },
  ];

  return (
    <>
      <Text style={styles.question}>
        Comment souhaitez-vous être livré pour cette course ?
      </Text>

      <View style={styles.cards}>
        {options.map((o) => {
          const active = value === o.key;
          return (
            <TouchableOpacity
              key={o.key}
              style={[styles.card, active && styles.cardActive]}
              onPress={() => onChange(o.key)}
              activeOpacity={0.85}
            >
              <View style={styles.dot}>
                <Ionicons name={o.icon} size={17} color={C.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{o.title}</Text>
                <Text style={styles.cardSub}>{o.sub}</Text>
              </View>
              {active ? (
                <Ionicons name="checkmark-circle" size={20} color={C.accent} />
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.spacer} />

      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={onNext}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryBtnLabel}>Continuer</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.linkBtn} onPress={onBack} activeOpacity={0.7}>
        <Text style={styles.linkBtnLabel}>Revenir au choix du groupage</Text>
      </TouchableOpacity>
    </>
  );
};
