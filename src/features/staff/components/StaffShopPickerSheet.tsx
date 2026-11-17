"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import React from "react";
import { Animated, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlobalToastHost } from "@/src/components/GlobalToastHost";
import { useSheetAnimation } from "@/src/hooks/useSheetAnimation";
import { useSheetSafeInsets } from "@/src/hooks/usePageBottomInset";
import type { ShopOption } from "@/src/features/merchant/context/MerchantModeContext";
import { t, useLanguage } from "@/src/i18n";
import { DS } from "@/src/theme/ds";

interface Props {
  visible: boolean;
  shops: ShopOption[];
  onClose: () => void;
  onPick: (fastFoodId: string) => void;
  /** Boutiques ou le compte est livreur (une ligne chacune). */
  driverShops?: { fastFoodId: string; name: string }[];
  onPickDriver?: (fastFoodId: string) => void;
}

/** Choix de la boutique au passage en mode personnel (employe de plusieurs boutiques). */
export function StaffShopPickerSheet({ visible, shops, onClose, onPick, driverShops = [], onPickDriver }: Props) {
  useLanguage();
  const { mounted, backdropStyle, sheetStyle, onSheetLayout } = useSheetAnimation(visible);
  const { bottom } = useSheetSafeInsets();
  if (!mounted) return null;
  return (
    <Modal transparent animationType="none" visible onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t("Fermer")} />
      </Animated.View>
      <Animated.View onLayout={onSheetLayout} style={[styles.sheet, { paddingBottom: bottom }, sheetStyle]}>
        <Text style={styles.title}>{t("Choisir le mode")}</Text>
        {shops.map((s) => (
          <Pressable key={s.fastFoodId} style={styles.row} onPress={() => onPick(s.fastFoodId)}>
            <Ionicons name="storefront-outline" size={18} color={DS.ink} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>
                {s.isOwner ? t("Ma boutique") : s.name || t("Boutique")}
              </Text>
              <Text style={styles.sub} numberOfLines={1}>
                {s.isOwner ? t("Propriétaire") : s.roleName || t("Personnel")}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={DS.muted} />
          </Pressable>
        ))}
        {driverShops.map((d) => (
          <Pressable key={"driver-" + d.fastFoodId} style={styles.row} onPress={() => onPickDriver?.(d.fastFoodId)}>
            <Ionicons name="bicycle-outline" size={18} color={DS.ink} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{d.name || t("Boutique")}</Text>
              <Text style={styles.sub}>{t("Livreur")}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={DS.muted} />
          </Pressable>
        ))}
      </Animated.View>
      <GlobalToastHost modal />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: DS.scrimMid },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: DS.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 18,
    paddingHorizontal: 16,
    gap: 8,
  },
  title: { fontSize: 16, fontWeight: "700", color: DS.ink, marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 16, backgroundColor: DS.surface },
  name: { fontSize: 14.5, fontWeight: "700", color: DS.ink },
  sub: { fontSize: 12.5, color: DS.muted },
});
