import React, { useCallback, useMemo, useRef, useState } from "react";
import { View, StyleSheet, TouchableOpacity, Text, Animated, ScrollView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TabHeader } from "@/src/components/molecules/TabHeader";
import { HeaderPill } from "@/src/components/molecules/HeaderPill";
import { Toast } from "@/src/components/Toast";
import { Theme } from "@/src/theme";
import type { Bonus } from "../types/bonus.types";
import { useBonus } from "../hooks/useBonus";
import { getBonusDescriptor } from "../config/bonusRegistry";
import { BonusCarousel, CAROUSEL_INTERVAL, BonusCarouselHandle } from "./BonusCarousel";
import { BonusCard } from "./BonusCard";
import { BonusCardV2 } from "./BonusCardV2";
import { BonusCardV3 } from "./BonusCardV3";
import { BonusSkeleton, BonusEmptyState } from "./BonusStates";

interface UserBonusModalProps {
  visible: boolean;
  onClose: () => void;
  /**
   * Disposition : "default" (centrée) · "spread" (étalée) · "mesh" (fond coloré
   * porté par chaque carte, page en fond neutre — voir BonusCardV3).
   */
  variant?: "default" | "spread" | "mesh";
}

const LIGHT = "#ffffff";
const GLASS = "rgba(255,255,255,0.22)";
const FADED = "rgba(255,255,255,0.35)";
// Design "mesh" : la page est neutre (le fond coloré est sur les cartes).
const NEUTRAL_BG = "#f3f4f6";
const DARK_DOT = "rgba(0,0,0,0.18)";
const DARK_ICON = Theme.colors.dark;
const DARK_FADED = "rgba(0,0,0,0.25)";
// La tab bar (app/(tabs)/_layout.tsx) est absolue en bas : hauteur 58 + safe-area.
// On décale le contenu de cette hauteur pour que la pagination reste au-dessus.
const TAB_BAR_HEIGHT = 58;

/**
 * Écran plein écran « Bonus » (Settings → Bonus et parrainage).
 * Haut : stats commandes/dépenses. Centre : carrousel plein écran des bonus
 * (fond coloré à la couleur du bonus centré). Bas : pagination (flèches + dots)
 * juste au-dessus de la navbar.
 */
export const UserBonusModal: React.FC<UserBonusModalProps> = ({ visible, onClose, variant = "default" }) => {
  const insets = useSafeAreaInsets();
  // V2 (spread) et V3 (mesh) partagent la même mise en page épurée (page neutre
  // + carte de pagination). Seule la couleur du fond de page diffère :
  // V2 = blanc pur, V3 = gris neutre.
  const isFlat = variant === "mesh" || variant === "spread";
  const pageBg = variant === "spread" ? LIGHT : NEUTRAL_BG;
  const CardComponent = variant === "mesh" ? BonusCardV3 : variant === "spread" ? BonusCardV2 : BonusCard;
  const [headerHeight, setHeaderHeight] = useState(70);
  const [index, setIndex] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const carouselRef = useRef<BonusCarouselHandle>(null);

  const { bonuses, loading, error, claims, claimBonus, refresh } = useBonus();

  // Fond de page PLEIN à la couleur du bonus centré (transition continue au scroll).
  const scrollX = useRef(new Animated.Value(0)).current;
  const colors = useMemo(() => bonuses.map((b) => getBonusDescriptor(b.type).color), [bonuses]);
  const animatedBg = useMemo(() => {
    if (colors.length < 2) return colors[0] || Theme.colors.primary;
    return scrollX.interpolate({
      inputRange: colors.map((_, i) => i * CAROUSEL_INTERVAL),
      outputRange: colors,
      extrapolate: "clamp",
    });
  }, [colors, scrollX]);

  const handleClaim = useCallback(
    async (bonus: Bonus) => {
      const res = await claimBonus(bonus);
      setToast(
        res.success
          ? { message: "🎉 Demande envoyée ! Tu recevras une notification.", type: "success" }
          : { message: res.message || "Échec de la demande", type: "error" },
      );
    },
    [claimBonus],
  );

  if (!visible) return null;

  const hasBonuses = !loading && !error && bonuses.length > 0;

  return (
    <View style={[styles.overlay, variant === "spread" && { backgroundColor: LIGHT }]}>
      {/* Fond de page : neutre en "mesh" (le coloré est sur les cartes),
          sinon couleur pleine animée + blobs + dégradé (effet mesh global). */}
      {isFlat ? (
        <View style={[styles.contentBg, { top: headerHeight, backgroundColor: pageBg }]} pointerEvents="none" />
      ) : (
        <Animated.View style={[styles.contentBg, { top: headerHeight, backgroundColor: animatedBg }]} pointerEvents="none">
          <View style={styles.blobTop} />
          <View style={styles.blobBottom} />
          <LinearGradient
            colors={["rgba(255,255,255,0.16)", "rgba(255,255,255,0)", "rgba(0,0,0,0.22)"]}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}

      <TabHeader
        title="Bonus"
        subtitle="Tes récompenses fidélité"
        right={<HeaderPill label="Retour" icon="arrow-back-outline" onPress={onClose} />}
        onHeightChange={setHeaderHeight}
      />

      <View style={[styles.body, { paddingTop: headerHeight + 10, paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 8 }]}>
        {loading ? (
          <View style={styles.state}><BonusSkeleton /></View>
        ) : error ? (
          <View style={styles.state}>
            <BonusEmptyState icon="cloud-offline-outline" title={error} />
            <TouchableOpacity style={styles.retry} onPress={() => refresh()}>
              <Ionicons name="refresh" size={16} color={LIGHT} />
              <Text style={styles.retryText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : bonuses.length === 0 ? (
          <View style={styles.state}>
            <BonusEmptyState
              title="Aucun bonus pour l'instant"
              subtitle="Passe des commandes : tes fastfoods proposeront bientôt des récompenses."
            />
          </View>
        ) : (
          <View style={styles.carouselZone}>
            <BonusCarousel
              ref={carouselRef}
              bonuses={bonuses}
              claims={claims}
              onClaim={handleClaim}
              scrollX={scrollX}
              onIndexChange={setIndex}
              CardComponent={CardComponent}
            />
          </View>
        )}

        {/* Pagination : flèche ◄ · dots · ► flèche (en bas, au-dessus de la navbar) */}
        {hasBonuses && bonuses.length > 1 && !isFlat && (
          <View style={styles.pagination}>
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => carouselRef.current?.goTo(index - 1)}
              disabled={index === 0}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={20} color={index === 0 ? FADED : LIGHT} />
            </TouchableOpacity>

            <View style={styles.dots}>
              {bonuses.map((_, i) => (
                <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
              ))}
            </View>

            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => carouselRef.current?.goTo(index + 1)}
              disabled={index === bonuses.length - 1}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-forward" size={20} color={index === bonuses.length - 1 ? FADED : LIGHT} />
            </TouchableOpacity>
          </View>
        )}

        {/* Pagination V3 (mesh) : CARTE = galerie des pages à slider (gauche)
            + compteur 2/5 et contrôles flèches/dots (droite). */}
        {hasBonuses && bonuses.length > 1 && isFlat && (
          <View style={[styles.pagCard, variant === "spread" && styles.pagCardOutlined]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.gallery}
              style={styles.galleryScroll}
            >
              {bonuses.map((b, i) => {
                const desc = getBonusDescriptor(b.type);
                const c = desc.color || Theme.colors.primary;
                const active = i === index;
                return (
                  <TouchableOpacity
                    key={b.id ?? i}
                    onPress={() => carouselRef.current?.goTo(i)}
                    activeOpacity={0.85}
                    style={[styles.galleryCard, active && { borderColor: c, backgroundColor: `${c}12` }]}
                  >
                    <View style={styles.galleryCardTop}>
                      <View style={[styles.galleryIcon, { backgroundColor: `${c}1f` }]}>
                        <Ionicons name={desc.icon} size={15} color={c} />
                      </View>
                    </View>
                    <Text
                      style={[styles.galleryName, active && { color: DARK_ICON, fontWeight: "800" }]}
                      numberOfLines={1}
                    >
                      Bonus {i + 1}
                    </Text>
                    <View style={styles.galleryBar}>
                      <View style={[styles.galleryBarFill, { backgroundColor: c, width: active ? "100%" : "34%" }]} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.pagRight}>
              <View style={[styles.counterPill, { backgroundColor: `${colors[index] || Theme.colors.primary}1f` }]}>
                <Text style={[styles.counterText, { color: colors[index] || Theme.colors.primary }]} numberOfLines={1}>
                  Bonus N°{index + 1} · {bonuses[index]?.name}
                </Text>
              </View>
              <View style={styles.pagNav}>
                <TouchableOpacity
                  style={[styles.navBtnSm, styles.navBtnMesh]}
                  onPress={() => carouselRef.current?.goTo(index - 1)}
                  disabled={index === 0}
                  activeOpacity={0.8}
                >
                  <Ionicons name="chevron-back" size={18} color={index === 0 ? DARK_FADED : DARK_ICON} />
                </TouchableOpacity>

                <View style={styles.dots}>
                  {bonuses.map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.dot,
                        { backgroundColor: DARK_DOT },
                        i === index && { width: 20, backgroundColor: DARK_ICON },
                      ]}
                    />
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.navBtnSm, styles.navBtnMesh]}
                  onPress={() => carouselRef.current?.goTo(index + 1)}
                  disabled={index === bonuses.length - 1}
                  activeOpacity={0.8}
                >
                  <Ionicons name="chevron-forward" size={18} color={index === bonuses.length - 1 ? DARK_FADED : DARK_ICON} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>

      {toast && <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 1000, backgroundColor: "transparent" },
  contentBg: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#fff", overflow: "hidden" },
  blobTop: { position: "absolute", top: -50, right: -70, width: 260, height: 260, borderRadius: 130, backgroundColor: "rgba(255,255,255,0.16)" },
  blobBottom: { position: "absolute", bottom: -70, left: -60, width: 280, height: 280, borderRadius: 140, backgroundColor: "rgba(0,0,0,0.12)" },
  body: { flex: 1 },
  state: { flex: 1, justifyContent: "center" },
  carouselZone: { flex: 1 },
  retry: { flexDirection: "row", alignSelf: "center", alignItems: "center", gap: 6, marginTop: 4, paddingHorizontal: 18, paddingVertical: 10 },
  retryText: { color: LIGHT, fontWeight: "700", fontSize: 14 },
  pagination: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14, paddingVertical: 6 },
  navBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: GLASS, justifyContent: "center", alignItems: "center" },
  navBtnMesh: { backgroundColor: "rgba(0,0,0,0.06)" },
  navBtnSm: { width: 30, height: 30, borderRadius: 15, justifyContent: "center", alignItems: "center" },

  // Carte de pagination (design mesh) : galerie à slider + compteur + contrôles
  pagCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: LIGHT,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginHorizontal: 16,
    marginTop: 10,
  },
  // V2 (fond blanc pur) : bordure fine + léger relief pour détacher la carte.
  pagCardOutlined: {
    borderWidth: 1,
    borderColor: "rgba(236, 236, 241, 1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  galleryScroll: { flex: 1 },
  gallery: { flexDirection: "row", alignItems: "stretch", gap: 8, paddingRight: 4 },
  galleryCard: {
    width: 72,
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  galleryCardTop: { flexDirection: "row", alignItems: "center" },
  galleryIcon: { width: 26, height: 26, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  galleryName: { fontSize: 12, fontWeight: "700", color: "rgba(0,0,0,0.7)" },
  galleryBar: { height: 4, borderRadius: 2, backgroundColor: "rgba(0,0,0,0.08)", overflow: "hidden" },
  galleryBarFill: { height: "100%", borderRadius: 2 },
  pagRight: { width: 150, alignItems: "stretch", gap: 6 },
  counterPill: { backgroundColor: "rgba(0,0,0,0.06)", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  counterText: { textAlign: "center", fontSize: 11, fontWeight: "800", color: Theme.colors.dark },
  pagNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dots: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.4)" },
  dotActive: { width: 22, backgroundColor: LIGHT },
});
