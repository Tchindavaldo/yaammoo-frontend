import { HeaderPill } from "@/src/components/molecules/HeaderPill";
import { TabHeader } from "@/src/components/molecules/TabHeader";
import { Toast } from "@/src/components/Toast";
import { Theme } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getBonusDescriptor } from "../config/bonusRegistry";
import { useBonus } from "../hooks/useBonus";
import type { Bonus } from "../types/bonus.types";
import { BonusCard } from "./BonusCard";
import { BonusCarousel, BonusCarouselHandle } from "./BonusCarousel";
import { BonusEmptyState, BonusSkeleton } from "./BonusStates";

interface UserBonusModalProps {
  visible: boolean;
  onClose: () => void;
}

const LIGHT = "#ffffff";
const DARK_DOT = "rgba(0,0,0,0.18)";
const DARK_ICON = Theme.colors.dark;
const DARK_FADED = "rgba(0,0,0,0.25)";
// La tab bar (app/(tabs)/_layout.tsx) est absolue en bas : hauteur 58 + safe-area.
// On décale le contenu de cette hauteur pour que la pagination reste au-dessus.
const TAB_BAR_HEIGHT = 58;

/**
 * Écran plein écran « Bonus » (Settings → Bonus et parrainage).
 * Fond de page blanc pur. Centre : carrousel plein écran des bonus (cartes
 * blanches, couleur du bonus en accent — BonusCard). Bas : carte de pagination
 * (galerie à slider + compteur + flèches/dots) juste au-dessus de la navbar.
 */
export const UserBonusModal: React.FC<UserBonusModalProps> = ({
  visible,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const [headerHeight, setHeaderHeight] = useState(70);
  const [index, setIndex] = useState(0);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const carouselRef = useRef<BonusCarouselHandle>(null);

  const { bonuses, loading, error, claims, claimBonus, refresh } = useBonus();

  // Suivi du scroll horizontal du carousel (transition couleur des cartes).
  const scrollX = useRef(new Animated.Value(0)).current;
  const colors = useMemo(
    () => bonuses.map((b) => getBonusDescriptor(b.type).color),
    [bonuses],
  );

  const handleClaim = useCallback(
    async (bonus: Bonus) => {
      const res = await claimBonus(bonus);
      setToast(
        res.success
          ? {
              message: "🎉 Demande envoyée ! Tu recevras une notification.",
              type: "success",
            }
          : { message: res.message || "Échec de la demande", type: "error" },
      );
    },
    [claimBonus],
  );

  if (!visible) return null;

  const hasBonuses = !loading && !error && bonuses.length > 0;

  return (
    <View style={[styles.overlay, { backgroundColor: LIGHT }]}>
      {/* Fond de page : blanc pur (les cartes portent la couleur du bonus). */}
      <View
        style={[styles.contentBg, { top: headerHeight, backgroundColor: LIGHT }]}
        pointerEvents="none"
      />

      <TabHeader
        title="Bonus"
        subtitle="Tes récompenses fidélité"
        right={
          <HeaderPill
            label="Retour"
            icon="arrow-back-outline"
            onPress={onClose}
          />
        }
        onHeightChange={setHeaderHeight}
      />

      <View
        style={[
          styles.body,
          {
            paddingTop: headerHeight + 10,
            paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 8,
          },
        ]}
      >
        {loading ? (
          <View style={styles.state}>
            <BonusSkeleton />
          </View>
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
              CardComponent={BonusCard}
            />
          </View>
        )}

        {/* Pagination : CARTE = galerie des pages à slider (gauche)
            + compteur et contrôles flèches/dots (droite). */}
        {hasBonuses && bonuses.length > 1 && (
          <View style={[styles.pagCard, styles.pagCardOutlined]}>
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
                    style={[
                      styles.galleryCard,
                      active && { borderColor: c, backgroundColor: `${c}12` },
                    ]}
                  >
                    <View style={styles.galleryCardTop}>
                      <View
                        style={[
                          styles.galleryIcon,
                          { backgroundColor: `${c}1f` },
                        ]}
                      >
                        <Ionicons name={desc.icon} size={15} color={c} />
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.galleryName,
                        active && { color: DARK_ICON, fontWeight: "800" },
                      ]}
                      numberOfLines={1}
                    >
                      Bonus {i + 1}
                    </Text>
                    <View style={styles.galleryBar}>
                      <View
                        style={[
                          styles.galleryBarFill,
                          {
                            backgroundColor: c,
                            width: active ? "100%" : "34%",
                          },
                        ]}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.pagRight}>
              <View
                style={[
                  styles.counterPill,
                  {
                    backgroundColor: `${colors[index] || Theme.colors.primary}1f`,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.counterText,
                    { color: colors[index] || Theme.colors.primary },
                  ]}
                  numberOfLines={1}
                >
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
                  <Ionicons
                    name="chevron-back"
                    size={18}
                    color={index === 0 ? DARK_FADED : DARK_ICON}
                  />
                </TouchableOpacity>

                <View style={styles.dots}>
                  {bonuses.map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.dot,
                        { backgroundColor: DARK_DOT },
                        i === index && {
                          width: 20,
                          backgroundColor: DARK_ICON,
                        },
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
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={
                      index === bonuses.length - 1 ? DARK_FADED : DARK_ICON
                    }
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onHide={() => setToast(null)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    backgroundColor: "transparent",
  },
  contentBg: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  body: { flex: 1 },
  state: { flex: 1, justifyContent: "center" },
  carouselZone: { flex: 1 },
  retry: {
    flexDirection: "row",
    alignSelf: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  retryText: { color: LIGHT, fontWeight: "700", fontSize: 14 },
  navBtnMesh: { backgroundColor: "rgba(0,0,0,0.06)" },
  navBtnSm: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },

  // Carte de pagination : galerie à slider + compteur + contrôles
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
  // Bordure fine + léger relief pour détacher la carte du fond blanc.
  pagCardOutlined: {
    borderWidth: 0.5,
    borderColor: "rgba(0,0,0,0.04)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  galleryScroll: { flex: 1 },
  gallery: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 8,
    paddingRight: 4,
  },
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
  galleryIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  galleryName: { fontSize: 12, fontWeight: "700", color: "rgba(0,0,0,0.7)" },
  galleryBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.08)",
    overflow: "hidden",
  },
  galleryBarFill: { height: "100%", borderRadius: 2 },
  pagRight: { width: 150, alignItems: "stretch", gap: 6 },
  counterPill: {
    backgroundColor: "rgba(0,0,0,0.06)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  counterText: {
    textAlign: "center",
    fontSize: 11,
    fontWeight: "800",
    color: Theme.colors.dark,
  },
  pagNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dots: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
});
