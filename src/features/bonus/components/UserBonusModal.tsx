import { HeaderPill } from "@/src/components/molecules/HeaderPill";
import { TabHeader } from "@/src/components/molecules/TabHeader";
import { Toast } from "@/src/components/Toast";
import { Theme } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getBonusDescriptor } from "../config/bonusRegistry";
import { useBonusContext } from "../context/BonusContext";
import type { Bonus } from "../types/bonus.types";
import { BonusCard } from "./BonusCard";
import {
  BonusCarousel,
  BonusCarouselHandle,
  CAROUSEL_INTERVAL,
} from "./BonusCarousel";
import { BonusClaimRow } from "./BonusClaimRow";
import { BonusGalleryCard } from "./BonusGalleryCard";
import { BonusGlassCard, GLASS_BORDER } from "./BonusGlassCard";
import { BonusPagerInfo } from "./BonusPagerInfo";
import { BonusPageBackground, USE_IMAGE_BG } from "./BonusPageBackground";
import { BonusEmptyState, BonusSkeleton } from "./BonusStates";

interface UserBonusModalProps {
  visible: boolean;
  onClose: () => void;
}

const LIGHT = "#ffffff";
const DARK_ICON = Theme.colors.dark;
// La tab bar (app/(tabs)/_layout.tsx) est absolue en bas : hauteur 58 + safe-area.
// On décale le contenu de cette hauteur pour que la pagination reste au-dessus.
const TAB_BAR_HEIGHT = 58;
// Alignement sur le header (voir BonusCard.tsx) : marge + padding interne = GUTTER,
// pour que le CONTENU des cartes tombe sur la verticale du texte du header.
const GUTTER = Theme.spacing.md;
const PAG_PAD = 10;

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
  const [refreshing, setRefreshing] = useState(false);
  const carouselRef = useRef<BonusCarouselHandle>(null);

  const { bonuses, loading, error, claims, claimBonus, refresh } =
    useBonusContext();

  /**
   * Image de fond choisie pour la carte principale (ligne 2). Volontairement en
   * état local : c'est un outil de réglage du rendu, elle n'est pas persistée et
   * disparaît à la fermeture de la page. null = asset par défaut.
   */
  const [cardImage, setCardImage] = useState<string | null>(null);

  const pickCardImage = useCallback(async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
    });
    if (!res.canceled && res.assets[0]) setCardImage(res.assets[0].uri);
  }, []);

  /** Pull-to-refresh : rechargement silencieux (pas de skeleton plein écran). */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh(true);
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  // Suivi du scroll horizontal du carousel (transition couleur des cartes).
  const scrollX = useRef(new Animated.Value(0)).current;

  /**
   * Index visé par une navigation directe (tap sur une mini-carte). Pendant
   * l'animation, `scrollX` traverse toutes les cartes intermédiaires : sans ce
   * verrou, le compteur textuel les afficherait successivement (effet de flash).
   */
  const jumpTarget = useRef<number | null>(null);

  // Le compteur textuel est du contenu, pas un style : il ne peut pas être
  // interpolé comme les dots. On le rafraîchit dès le franchissement de la
  // moitié d'une carte pour qu'il suive le geste sans attendre la fin du swipe.
  useEffect(() => {
    const id = scrollX.addListener(({ value }) => {
      const next = Math.round(value / CAROUSEL_INTERVAL);
      // Saut en cours : on n'affiche que la destination, pas les étapes.
      if (jumpTarget.current !== null) {
        if (next !== jumpTarget.current) return;
        jumpTarget.current = null;
      }
      setIndex((prev) => (prev === next ? prev : next));
    });
    return () => scrollX.removeListener(id);
  }, [scrollX]);

  /** Navigation directe : pose le verrou puis délègue au carousel. */
  const goToBonus = useCallback(
    (i: number) => {
      // Même clamp que le carousel : un verrou hors bornes ne serait jamais levé.
      const target = Math.max(0, Math.min(bonuses.length - 1, i));
      jumpTarget.current = target;
      setIndex(target);
      carouselRef.current?.goTo(target);
    },
    [bonuses.length],
  );

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

  /** Contrôle de pull partagé par les 3 états scrollables (liste, vide, erreur). */
  const pullControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={Theme.colors.primary}
      colors={[Theme.colors.primary]}
    />
  );

  return (
    <View
      style={[
        styles.overlay,
        // Sur fond image, l'overlay reste transparent : un aplat blanc ici
        // recouvrirait BonusPageBackground.
        { backgroundColor: USE_IMAGE_BG ? "transparent" : LIGHT },
      ]}
    >
      {/* Fond de page : image de plat floutée + blur clair, commune à toute la
          page (les cartes sont translucides et la laissent transparaître).
          Démarre SOUS le header : la bande du header reste non peinte, settings
          y transparaît et le TabHeader la floute (cf. MenuManageModal). */}
      <BonusPageBackground top={headerHeight} />
      {!USE_IMAGE_BG && (
        <View
          style={[
            styles.contentBg,
            { top: headerHeight, backgroundColor: LIGHT },
          ]}
          pointerEvents="none"
        />
      )}

      <TabHeader
        title="Bonus"
        subtitle="Tes récompenses fidélité"
        right={
          <View style={styles.headerActions}>
            <HeaderPill
              label="Image"
              icon="image-outline"
              onPress={pickCardImage}
            />
            <HeaderPill
              label="Retour"
              icon="arrow-back-outline"
              onPress={onClose}
            />
          </View>
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
          // Pleine zone (et non `state`, qui centre) : le squelette reproduit la
          // silhouette de la page, il doit occuper la même place que le carrousel.
          <View style={styles.carouselZone}>
            <BonusSkeleton />
          </View>
        ) : error ? (
          <ScrollView
            style={styles.carouselZone}
            contentContainerStyle={styles.state}
            refreshControl={pullControl}
          >
            <BonusEmptyState icon="cloud-offline-outline" title={error} />
            <TouchableOpacity style={styles.retry} onPress={() => refresh()}>
              <Ionicons name="refresh" size={16} color={LIGHT} />
              <Text style={styles.retryText}>Réessayer</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : bonuses.length === 0 ? (
          <ScrollView
            style={styles.carouselZone}
            contentContainerStyle={styles.state}
            refreshControl={pullControl}
          >
            <BonusEmptyState
              title="Aucun bonus pour l'instant"
              subtitle="Passe des commandes : tes fastfoods proposeront bientôt des récompenses."
            />
          </ScrollView>
        ) : (
          // ScrollView vertical englobant : il ne défile pas (le contenu remplit
          // la zone) mais capte le geste du pull-to-refresh, que le carrousel
          // horizontal ne peut pas gérer lui-même.
          <ScrollView
            style={styles.carouselZone}
            contentContainerStyle={styles.carouselContent}
            showsVerticalScrollIndicator={false}
            // Android : laisse le carrousel horizontal imbriqué gérer son geste.
            nestedScrollEnabled
            refreshControl={pullControl}
          >
            <BonusCarousel
              ref={carouselRef}
              bonuses={bonuses}
              claims={claims}
              onClaim={handleClaim}
              scrollX={scrollX}
              onIndexChange={setIndex}
              CardComponent={BonusCard}
              cardImage={cardImage}
            />
          </ScrollView>
        )}

        {/* Carte commune du bas : ligne de réclamation du bonus COURANT en
            haut, pagination en bas (galerie à slider + compteur + contrôles). */}
        {hasBonuses && (
          <BonusGlassCard
            style={[styles.pagCard, styles.pagCardOutlined]}
            radius={20}
          >
            <BonusClaimRow
              bonus={bonuses[index]}
              claimStatus={claims[bonuses[index]?.id]}
              onClaim={handleClaim}
            />

            {bonuses.length > 1 && <View style={styles.pagDivider} />}

            {bonuses.length > 1 && (
              <View style={styles.pagInner}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.gallery}
                  style={styles.galleryScroll}
                >
                  {bonuses.map((b, i) => (
                    <BonusGalleryCard
                      key={b.id ?? i}
                      bonus={b}
                      position={i}
                      scrollX={scrollX}
                      active={i === index}
                      activeTextColor={DARK_ICON}
                      onPress={() => goToBonus(i)}
                    />
                  ))}
                </ScrollView>

                <BonusPagerInfo
                  bonuses={bonuses}
                  index={index}
                  scrollX={scrollX}
                  dotColor={DARK_ICON}
                  accent={colors[index] || Theme.colors.primary}
                />
              </View>
            )}
          </BonusGlassCard>
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
  // flexGrow (et non flex) : utilisé comme contentContainerStyle d'un ScrollView.
  state: { flexGrow: 1, justifyContent: "center" },
  carouselZone: { flex: 1 },
  // flexGrow pour que le carrousel occupe toute la hauteur disponible : sans ça
  // le ScrollView le laisserait à sa hauteur intrinsèque.
  carouselContent: { flexGrow: 1 },
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

  // Carte de pagination : galerie à slider + compteur + contrôles
  pagCard: {
    // Empile réclamation puis pagination (la rangée pagination, elle, est en
    // `row` via pagInner).
    flexDirection: "column",
    paddingVertical: 10,
    // En verre comme les cartes de bonus : BonusGlassCard porte le fond.
    backgroundColor: USE_IMAGE_BG ? "transparent" : LIGHT,
    borderRadius: 20,
    paddingHorizontal: PAG_PAD,
    // marge + padding = GUTTER → contenu aligné sur le texte du header.
    marginHorizontal: GUTTER - PAG_PAD,
    marginTop: 10,
  },
  // Bordure fine + léger relief pour détacher la carte du fond.
  pagCardOutlined: {
    borderWidth: USE_IMAGE_BG ? 1 : 0.5,
    // Sur verre, une arête claire ; sur fond blanc, un gris très discret.
    borderColor: USE_IMAGE_BG ? GLASS_BORDER : "rgba(0,0,0,0.04)",
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
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  // Rangée pagination (galerie | contrôles) dans la carte commune.
  pagInner: { flexDirection: "row", alignItems: "center", gap: 10 },
  // Sépare la ligne de réclamation de la pagination.
  pagDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
    marginVertical: 10,
  },
});
