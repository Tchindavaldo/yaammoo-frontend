"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
// Overlay « Commentaire » de la notation du livreur (DriverInfoTab), sorti du composant (R4, R26) :
// Modal, blur plein écran en fondu piloté par le clavier + card opaque. Remontée BORNÉE.
// Le parent garde l'état (texte, ouverture) et les valeurs animées du clavier.
import React from "react";
import { Animated, Keyboard, Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppBlurView as BlurView } from "@/src/components/AppBlurView";
import { GlobalToastHost } from "@/src/components/GlobalToastHost";
import { t } from "@/src/i18n";
import { styles } from "./DriverInfoTab.styles";

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

interface Props {
  visible: boolean;
  onClose: () => void;
  comment: string;
  onChangeComment: (text: string) => void;
  blurOpacity: Animated.Value;
  keyboardHeight: Animated.Value;
}

export function DriverCommentModal({ visible, onClose, comment, onChangeComment, blurOpacity, keyboardHeight }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.keyboardWrapper}>
        <AnimatedBlurView intensity={40} tint="light" pointerEvents="none" style={[styles.blurOverlay, { opacity: blurOpacity }]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={[
            styles.commentContainer,
            { transform: [{ translateY: keyboardHeight.interpolate({ inputRange: [0, 100], outputRange: [0, -90] }) }] },
          ]}
        >
          <View style={styles.commentModalCard}>
            <View style={styles.commentInlineHeader}>
              <View style={styles.commentHeaderLeft}>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color="#94a3b8" />
                <Text style={styles.commentInlineTitle}>{t("Commentaire")}</Text>
                <TouchableOpacity onPress={() => Keyboard.dismiss()} style={styles.keyboardSmallBtn}>
                  <Ionicons name="chevron-down-outline" size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.commentInlineClose}>
                <Ionicons name="close" size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.commentModalInput}
              placeholder={t("Votre commentaire…")}
              placeholderTextColor="#9CA3AF"
              value={comment}
              onChangeText={onChangeComment}
              multiline
              textAlignVertical="top"
              autoFocus
            />
            <TouchableOpacity style={styles.commentValidateBtn} onPress={onClose}>
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.commentValidateText}>{t("Valider")}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
      {/* Toast global au premier plan (Android). */}
      <GlobalToastHost modal />
    </Modal>
  );
}
