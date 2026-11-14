// Capsule de confirmation de SUPPRESSION d'une commande du panier (mode separe
// du paiement). Extraite de `cart.tsx` pour R4.
import React from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppBlurView as BlurView } from "@/src/components/AppBlurView";
import { ActivityIndicator } from "@/src/components/CustomActivityIndicator";
import { t } from "@/src/i18n";
import { cartScreenStyles as styles } from "./CartScreen.styles";

interface Props {
  item: any;
  bottom: number;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const CartDeleteCapsule: React.FC<Props> = ({ item, bottom, submitting, onCancel, onConfirm }) => (
  <Animated.View style={[styles.payFooterCapsule, { bottom }]}>
    <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
    <TouchableOpacity style={styles.closeCircle} onPress={onCancel}>
      <Ionicons name="close" size={16} color="white" />
    </TouchableOpacity>
    <View style={styles.deleteMsgWrapper}>
      <Text style={styles.deleteMenuTitle} numberOfLines={1}>
        {item?.menu?.titre || item?.menu?.name || "Article"} - {item?.total || item?.prixTotal || 0} FCFA
      </Text>
      <Text style={styles.deleteMsg}>{t("Voulez-vous vraiment supprimer ?")}</Text>
    </View>
    <TouchableOpacity
      style={[styles.payerBtnHome, { backgroundColor: "#ef4444" }, submitting && { opacity: 0.7 }]}
      onPress={onConfirm}
      disabled={submitting}
    >
      {submitting ? (
        <ActivityIndicator size="small" color="white" />
      ) : (
        <Ionicons name="checkmark" size={16} color="white" />
      )}
    </TouchableOpacity>
  </Animated.View>
);
