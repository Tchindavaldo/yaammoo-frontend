"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AppBlurView } from "@/src/components/AppBlurView";
import { ActivityIndicator } from "@/src/components/CustomActivityIndicator";
import { DS } from "@/src/theme/ds";
import { t, useLanguage } from "@/src/i18n";

/**
 * Cache pose sur TOUTE la feuille de retrait (maquettes C4 / C5) :
 * - requete en cours : loader « Retrait en cours… » ;
 * - verdict reussi : message de reussite et bouton « Fermer ».
 * iPhone : flou clair sur la feuille. Android : fond blanc plein.
 */

const FADE_MS = 220;

interface WithdrawStatusCoverProps {
  /** `null` = pas de cache. */
  status: "pending" | "success" | null;
  /** Ligne sous le titre, deja traduite (montant et numero). */
  detail: string;
  onClose: () => void;
}

export const WithdrawStatusCover: React.FC<WithdrawStatusCoverProps> = ({
  status,
  detail,
  onClose,
}) => {
  useLanguage();
  const anim = React.useRef(new Animated.Value(0)).current;
  const [shown, setShown] = React.useState(status);

  React.useEffect(() => {
    if (status) {
      setShown(status);
      Animated.timing(anim, {
        toValue: 1,
        duration: FADE_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
      return;
    }
    Animated.timing(anim, {
      toValue: 0,
      duration: FADE_MS,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setShown(null);
    });
  }, [status, anim]);

  if (!shown) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.cover, { opacity: anim }]}>
      {Platform.OS === "ios" ? (
        <>
          <AppBlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
          <View pointerEvents="none" style={styles.frost} />
        </>
      ) : null}

      <View style={styles.content}>
        {shown === "pending" ? (
          <>
            <ActivityIndicator size={40} color={DS.accent} />
            <Text style={styles.title}>{t("Retrait en cours…")}</Text>
          </>
        ) : (
          <>
            <View style={styles.okDot}>
              <Ionicons name="checkmark" size={26} color={DS.onInk} />
            </View>
            <Text style={[styles.title, styles.titleOk]}>{t("Retrait réussi")}</Text>
          </>
        )}
        <Text style={styles.detail}>{detail}</Text>
        {shown === "success" ? (
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.closeLabel}>{t("Fermer")}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  // Android : blanc plein. iOS : transparent, le flou + le voile font le fond.
  cover: {
    backgroundColor: Platform.OS === "ios" ? "transparent" : DS.bg,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: "hidden",
    zIndex: 10,
  },
  frost: { ...StyleSheet.absoluteFill, backgroundColor: DS.frost },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  title: { fontSize: 15, fontWeight: "bold", color: DS.slate900, textAlign: "center" },
  titleOk: { fontSize: 16, fontWeight: "800" },
  detail: {
    fontSize: 12,
    fontWeight: "600",
    color: DS.slate600,
    lineHeight: 17,
    textAlign: "center",
  },
  okDot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: DS.successStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    marginTop: 4,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 99,
    backgroundColor: DS.slate900,
  },
  closeLabel: { fontSize: 13, fontWeight: "bold", color: DS.onInk },
});
