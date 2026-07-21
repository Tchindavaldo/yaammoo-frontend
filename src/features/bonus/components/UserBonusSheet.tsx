import { Toast } from "@/src/components/Toast";
import { Theme } from "@/src/theme";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
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
import {
  BonusGlassCard,
  CARD_BG_COLOR,
  CARD_IMAGE_BG,
  GLASS_BORDER,
} from "./BonusGlassCard";
import { BonusPageBackground, USE_IMAGE_BG } from "./BonusPageBackground";
import { BonusPagerInfo } from "./BonusPagerInfo";
import { BonusEmptyState, BonusSkeleton } from "./BonusStates";
import { GALLERY_STEP } from "./gallery.constants";

interface UserBonusSheetProps {
  visible: boolean;
  onClose: () => void;
}

const LIGHT = "#ffffff";
const DARK_ICON = Theme.colors.dark;
// Alignement du contenu des cartes sur le texte : marge + padding interne = GUTTER.
const GUTTER = Theme.spacing.md;
const PAG_PAD = 10;
/** Hauteur fixe de la bottom sheet (px). */
const SHEET_HEIGHT = 400;

/**
 * « Bonus et parrainage » (Settings). Présenté en BOTTOM SHEET et réduit à
 * l'essentiel : la carte principale du bonus courant (récompense + Début/Fin/
 * Durée via BonusCard dans le carrousel) et la CARTE DE PAGINATION du bas —
 * dernière carte intégrale contenant les DEUX lignes : la ligne de réclamation
 * (BonusClaimRow) ET la ligne de pagination (galerie + panneau héro). Le panneau
 * stats du haut n'est pas repris.
 */
export const UserBonusSheet: React.FC<UserBonusSheetProps> = ({
  visible,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const carouselRef = useRef<BonusCarouselHandle>(null);

  const { bonuses, loading, error, claims, claimBonus } = useBonusContext();

  // Suivi du scroll horizontal du carousel (transition couleur des cartes).
  const scrollX = useRef(new Animated.Value(0)).current;

  // À chaque OUVERTURE, on remet le scroll partagé à 0 ET on ré-arme l'index.
  // Sans ça, à la réouverture le carrousel repart à l'offset 0 mais `scrollX`
  // garde son ancienne valeur : l'animation temps réel de la galerie ne suit
  // plus (elle croit être ailleurs). On force aussi le remontage du carrousel.
  const [openKey, setOpenKey] = useState(0);
  useEffect(() => {
    if (visible) {
      scrollX.setValue(0);
      setIndex(0);
      setOpenKey((k) => k + 1);
    }
  }, [visible, scrollX]);

  // Ref de la galerie de mini-cartes : on la fait défiler auto pour garder la
  // carte active visible (n'en montre que ~2 à la fois).
  const galleryRef = useRef<ScrollView>(null);

  /**
   * Index visé par une navigation directe (tap sur une mini-carte). Pendant
   * l'animation, `scrollX` traverse toutes les cartes intermédiaires : sans ce
   * verrou, le compteur textuel les afficherait successivement (effet de flash).
   */
  const jumpTarget = useRef<number | null>(null);

  useEffect(() => {
    const id = scrollX.addListener(({ value }) => {
      const next = Math.round(value / CAROUSEL_INTERVAL);
      if (jumpTarget.current !== null) {
        if (next !== jumpTarget.current) return;
        jumpTarget.current = null;
      }
      setIndex((prev) => (prev === next ? prev : next));
    });
    return () => scrollX.removeListener(id);
    // `openKey` : les listeners sont ré-armés à CHAQUE ouverture. La Modal ne
    // démonte pas ce composant (elle masque son contenu), donc sans ça les
    // abonnements posés au 1er montage ne suivent plus le carrousel recréé.
  }, [scrollX, openKey]);

  // Auto-scroll de la galerie EN TEMPS RÉEL : la mini-carte active reste calée
  // en 1ère position (à gauche) et les autres défilent derrière elle, suivant le
  // doigt pendant le slide du carrousel (pas seulement au changement d'index).
  useEffect(() => {
    const id = scrollX.addListener(({ value }) => {
      // Position fractionnaire du carrousel (0 = 1er bonus, 1 = 2e…).
      const pos = value / CAROUSEL_INTERVAL;
      galleryRef.current?.scrollTo({
        x: Math.max(0, pos * GALLERY_STEP),
        animated: false,
      });
    });
    return () => scrollX.removeListener(id);
  }, [scrollX, openKey]);

  /** Navigation directe : pose le verrou puis délègue au carousel. */
  const goToBonus = useCallback(
    (i: number) => {
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

  const hasBonuses = !loading && !error && bonuses.length > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        {/* Fond assombri : tap pour fermer. */}
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + 12 },
            // Sur fond image, la sheet doit être transparente : un aplat blanc
            // recouvrirait BonusPageBackground.
            USE_IMAGE_BG && { backgroundColor: "transparent" },
          ]}
        >
          {/* Fond de la sheet : image de plat floutée + blur (piloté dans
              BonusPageBackground : USE_IMAGE_BG, BLUR_INTENSITY, VEIL). */}
          <BonusPageBackground top={0} />

          {loading ? (
            <View style={styles.carouselZone}>
              <BonusSkeleton />
            </View>
          ) : error ? (
            <View style={styles.state}>
              <BonusEmptyState icon="cloud-offline-outline" title={error} />
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
                key={openKey}
                ref={carouselRef}
                bonuses={bonuses}
                claims={claims}
                onClaim={handleClaim}
                scrollX={scrollX}
                onIndexChange={setIndex}
                CardComponent={BonusCard}
                cardImage={null}
              />
            </View>
          )}

          {/* Carte de pagination EN BAS : dernière carte intégrale — ligne de
              réclamation + ligne de pagination (galerie + panneau héro). */}
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
                  <View style={styles.galleryScroll}>
                    <Animated.ScrollView
                      key={openKey}
                      ref={galleryRef}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.gallery}
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
                    </Animated.ScrollView>
                  </View>

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
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    // Hauteur fixe (px, pas en %) : ajuste SHEET_HEIGHT pour la régler.
    height: SHEET_HEIGHT,
    backgroundColor: LIGHT,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    // Espace entre le haut de la sheet et la première carte.
    paddingTop: 8,
    overflow: "hidden",
  },

  state: { flex: 1, justifyContent: "center" },
  carouselZone: { flex: 1 },
  // Le carrousel occupe toute la zone ; le contenu se centre verticalement.

  pagCard: {
    flexDirection: "column",
    paddingVertical: 10,
    backgroundColor: CARD_IMAGE_BG ? "transparent" : CARD_BG_COLOR,
    borderRadius: 20,
    paddingHorizontal: PAG_PAD,
    marginHorizontal: GUTTER - PAG_PAD,
    // Pagination EN BAS : l'espace va au-dessus (vers le carrousel).
    marginTop: 10,
  },
  pagCardOutlined: {
    borderWidth: CARD_IMAGE_BG ? 1 : 0.5,
    borderColor: CARD_IMAGE_BG ? GLASS_BORDER : "rgba(0,0,0,0.04)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  // Largeur bornée à ~2 mini-cartes : la galerie défile (auto-scroll) au lieu
  // d'étaler toutes les cartes. Le pager héro garde sa place à droite.
  galleryScroll: { width: 2 * GALLERY_STEP },
  gallery: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 8,
    paddingRight: 4,
  },
  // space-between : galerie (largeur fixe) à gauche, panneau héro collé au bord
  // DROIT — sinon l'espace résiduel laisse un vide à droite du compteur.
  pagInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  pagDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.06)",
    marginVertical: 10,
  },
});
