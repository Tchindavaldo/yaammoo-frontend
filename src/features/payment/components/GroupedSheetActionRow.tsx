"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
// Barre de navigation du parcours groupe, extraite de CartGroupedDeliverySheet
// (R4). Retour + « Continuer » ; sur la DERNIERE page, la capsule (leurre)
// prend la place du bouton et ouvre la vraie capsule de saisie au tap.
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { t } from "@/src/i18n";
import { styles } from "./CartGroupedDeliverySheet.styles";
import { C } from "./CartPaymentSheet.styles";

interface Props {
  step: 1 | 2 | 3 | 4;
  /** Premiere page du parcours (2 si une seule commande). */
  firstStep: 1 | 2;
  isBusy: boolean;
  isProcessing: boolean;
  phone: string;
  onBack: () => void;
  onNext: () => void;
  onOpenCapsule: () => void;
}

export const GroupedSheetActionRow: React.FC<Props> = ({
  step,
  firstStep,
  isBusy,
  isProcessing,
  phone,
  onBack,
  onNext,
  onOpenCapsule,
}) => (
  <View style={styles.actionRow}>
    {step > firstStep && !isBusy && (
      <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.85}>
        <Ionicons name="arrow-back" size={20} color={C.ink} />
      </TouchableOpacity>
    )}
    {step < 4 ? (
      <TouchableOpacity style={[styles.primaryBtn, styles.actionRowPrimary]} onPress={onNext} activeOpacity={0.9}>
        <Text style={styles.primaryBtnLabel}>{t("Continuer")}</Text>
      </TouchableOpacity>
    ) : (
      <TouchableOpacity style={styles.payCapsule} onPress={onOpenCapsule} disabled={isBusy || isProcessing} activeOpacity={0.85}>
        <Ionicons name="call-outline" size={16} color="#fff" />
        <Text style={[styles.payCapsuleInput, !phone && styles.payCapsulePlaceholder]} numberOfLines={1}>
          {phone || t("Numéro de paiement")}
        </Text>
        <TouchableOpacity style={styles.payCapsuleBtn} onPress={onOpenCapsule} disabled={isBusy || isProcessing} activeOpacity={0.85}>
          {isProcessing || isBusy ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="arrow-forward" size={17} color="#fff" />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    )}
  </View>
);
