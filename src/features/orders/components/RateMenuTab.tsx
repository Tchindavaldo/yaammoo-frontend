import {
  MenuStatsProfile,
  ratingService,
} from "@/src/features/orders/services/ratingService";
import { ratingStatsCache } from "@/src/features/orders/services/ratingStatsCache";
import { socketService } from "@/src/services/socket";
import { Theme } from "@/src/theme";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);
// Même hauteur de référence que CheckoutContactOverlay (base du blur + container).
const SHEET_H = 384;

interface RateMenuTabProps {
  menuId: string;
  orderId: string;
  menuName: string;
  /** Image du plat (fallback depuis la commande si le backend n'en renvoie pas). */
  menuImage?: string;
}

/**
 * Tab « Noter » — le client note le PLAT d'une commande livrée. Reprend la
 * STRUCTURE exacte de DriverInfoTab (2 InfoCards à gauche + image du plat à
 * droite, puis stats + notation), adaptée au menu.
 *  - GET /menu/:menuId/stats → ratingAvg/ratingCount, totalOrders (popularité),
 *    myTotalOrders, hasRated, canRate.
 *  - POST /menu/:menuId/rating → le backend émet menuRatingUpdated.
 */
export const RateMenuTab: React.FC<RateMenuTabProps> = ({
  menuId,
  orderId,
  menuName,
  menuImage,
}) => {
  const [profile, setProfile] = useState<MenuStatsProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [commentOpen, setCommentOpen] = useState(false);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isModifying, setIsModifying] = useState(false); // mode modification

  // ── Animation clavier (même système/logique que CheckoutLocationOverlay) ──
  const keyboardHeight = useRef(new Animated.Value(0)).current;
  // Opacité du blur d'overlay : FONDU (0 → 1) piloté par la présence du clavier.
  const blurOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (event) => {
        Animated.parallel([
          Animated.spring(keyboardHeight, {
            toValue: event.endCoordinates.height,
            useNativeDriver: false,
            tension: 40,
            friction: 8,
          }),
          Animated.timing(blurOpacity, {
            toValue: 1,
            duration: 220,
            useNativeDriver: false,
          }),
        ]).start();
      },
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        Animated.parallel([
          Animated.spring(keyboardHeight, {
            toValue: 0,
            useNativeDriver: false,
            tension: 40,
            friction: 8,
          }),
          Animated.timing(blurOpacity, {
            toValue: 0,
            duration: 220,
            useNativeDriver: false,
          }),
        ]).start();
      },
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeCommentOverlay = () => {
    Keyboard.dismiss();
    setCommentOpen(false);
  };

  useEffect(() => {
    let alive = true;
    // Cache : si on a déjà chargé ce plat/commande, on l'affiche SANS loader et
    // on rafraîchit en arrière-plan. Sinon loader + GET.
    const cached = ratingStatsCache.get<MenuStatsProfile>(
      "menu",
      menuId,
      orderId,
    );
    if (cached) {
      setProfile(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    Promise.all([
      ratingService.getMenuStats(menuId),
      ratingService.getOrderRating(orderId),
    ])
      .then(([p, rating]) => {
        if (!alive) return;
        if (p) {
          setProfile(p);
          ratingStatsCache.set("menu", menuId, orderId, p);
        } else if (!cached) {
          setProfile(null);
        }
        // Préremplir avec la note existante du PLAT si présente
        if (rating?.menuRating) {
          setStars(rating.menuRating.value);
          setComment(rating.menuRating.comment || "");
        }
      })
      .catch(() => {
        if (alive && !cached) setProfile(null);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [menuId, orderId]);

  // Socket : la note moyenne du plat change en direct quand un autre user note.
  // Payload backend : { data: { menuId, ratingAvg, ratingCount } } (enveloppé).
  useEffect(() => {
    const sock = socketService.getSocket();
    const onUpdate = (payload: any) => {
      const d = payload?.data ?? payload;
      if (!d || d.menuId !== menuId) return;
      ratingStatsCache.patchRating("menu", menuId, d.ratingAvg, d.ratingCount);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              ratingAvg: d.ratingAvg ?? prev.ratingAvg,
              ratingCount: d.ratingCount ?? prev.ratingCount,
            }
          : prev,
      );
    };
    sock.on("menuRatingUpdated", onUpdate);
    return () => {
      sock.off("menuRatingUpdated", onUpdate);
    };
  }, [menuId]);

  const submitRating = async () => {
    if (stars < 1 || submitting) return;
    setSubmitting(true);
    // Temps minimum d'affichage du loader (l'appel peut être trop rapide sinon
    // le loader flashe et l'user ne voit rien se passer).
    const minDelay = new Promise((r) => setTimeout(r, 600));
    try {
      await Promise.all([
        ratingService.rateMenu(menuId, orderId, stars, comment.trim()),
        minDelay,
      ]);
      setSubmitted(true);
      setIsModifying(false);
      setCommentOpen(false);
      // Ma note vient de changer → purger le cache pour un refetch propre
      // (hasRated / ratingAvg à jour au prochain affichage).
      ratingStatsCache.invalidate("menu", menuId, orderId);
    } catch {
      // erreur silencieuse
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Theme.colors.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.centered}>
        <Ionicons name="fast-food-outline" size={28} color="#9CA3AF" />
        <Text style={styles.muted}>Plat indisponible</Text>
      </View>
    );
  }

  const name = profile.name || menuName;
  // Image du plat : celle du backend, sinon fallback de la commande.
  const imageUri = profile.image || menuImage;
  // Totaux : popularité (tous users) + mes commandes sur ce plat.
  const totalOrders = profile.totalOrders ?? 0;
  const myTotalOrders = profile.myTotalOrders ?? 0;
  const ratingCount = profile.ratingCount ?? 0;

  // Message d'info quand la notation n'est pas possible :
  // - Auto-notation (le marchand consulte son propre plat)
  // - Pas encore de commande livrée sur ce plat
  let infoMessage: string | null = null;
  if (profile.scope === "self") {
    infoMessage = "Vous ne pouvez pas noter votre propre plat";
  } else if (!profile.canRate && !profile.hasRated) {
    infoMessage = "Notez le plat après réception";
  }

  const canRate = !!profile.canRate;
  const showRateBtn = canRate && !submitted && !isModifying;
  const showRateFormModify = isModifying || submitting;
  const alreadyRated = submitted || (!!profile.hasRated && !isModifying);

  const handleModify = () => {
    setIsModifying(true);
  };

  // Contenu interne de la card commentaire.
  const commentCardContent = (
    <>
      <View style={styles.commentInlineHeader}>
        <View style={styles.commentHeaderLeft}>
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={20}
            color="#94a3b8"
          />
          <Text style={styles.commentInlineTitle}>Commentaire</Text>
          <TouchableOpacity
            onPress={() => Keyboard.dismiss()}
            style={styles.keyboardSmallBtn}
          >
            <Ionicons name="chevron-down-outline" size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          onPress={closeCommentOverlay}
          style={styles.commentInlineClose}
        >
          <Ionicons name="close" size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>
      <TextInput
        style={styles.commentModalInput}
        placeholder="Votre commentaire…"
        placeholderTextColor="#9CA3AF"
        value={comment}
        onChangeText={setComment}
        multiline
        textAlignVertical="top"
        autoFocus
      />
      <TouchableOpacity
        style={styles.commentValidateBtn}
        onPress={closeCommentOverlay}
      >
        <Ionicons name="checkmark" size={18} color="#fff" />
        <Text style={styles.commentValidateText}>Valider</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <View style={styles.container}>
      {/* ── Haut : 2 InfoCards à gauche + image du plat à droite ── */}
      <View
        style={{ flexDirection: "row", gap: 10, marginTop: 10, height: 110 }}
      >
        <View style={{ width: "42%", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <InfoCard label="Plat" value={name} compact />
          </View>
          <View style={{ flex: 1 }}>
            <InfoCard
              label="Note"
              value={
                profile.ratingAvg != null
                  ? `★ ${profile.ratingAvg.toFixed(1)}`
                  : "—"
              }
              small
              compact
            />
          </View>
        </View>

        <View style={{ flex: 1 }}>
          <View style={styles.statePlaceholder}>
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={styles.menuImage}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={0}
              />
            ) : (
              <Ionicons name="fast-food-outline" size={40} color="#9CA3AF" />
            )}
          </View>
        </View>
      </View>

      {/* ── Bloc bas : 3 cards stats INDIVIDUELLES (titre sur 2 lignes + chiffre) ── */}
      <View style={styles.statsCardsRow}>
        <StatCard title={"Total\nplat"} value={totalOrders} label="commandes" />
        <StatCard
          title={"Mes Cmd\nlivrées"}
          value={myTotalOrders}
          label="commandes"
        />
        <StatCard title={"Nombre\nvote"} value={ratingCount} label="avis" />
      </View>

      {/* Message info (auto-notation, pas encore livré) */}
      {infoMessage && (
        <View style={[styles.infoCard, styles.infoMsgCard]}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color="#6B7280"
          />
          <Text style={styles.infoMsgText}>{infoMessage}</Text>
        </View>
      )}

      {/* Message déjà noté + bouton modifier (caché en mode modification) */}
      {alreadyRated && !isModifying ? (
        <View style={[styles.infoCard, styles.ratedCard]}>
          <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
          <Text style={styles.ratedText}>Vous avez noté ce plat</Text>
          <TouchableOpacity style={styles.modifyBtn} onPress={handleModify}>
            <Ionicons
              name="pencil-outline"
              size={16}
              color={Theme.colors.primary}
            />
            <Text style={styles.modifyBtnText}>Modifier</Text>
          </TouchableOpacity>
        </View>
      ) : showRateFormModify || showRateBtn ? (
        <View style={{ marginTop: 12, gap: 10 }}>
          {/* Ligne de notation : 5 étoiles + 2 boutons (commenter / envoyer) */}
          <View style={styles.rateRow}>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity key={n} onPress={() => setStars(n)}>
                  <Ionicons
                    name={n <= stars ? "star" : "star-outline"}
                    size={26}
                    color="#F59E0B"
                  />
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.rateActions}>
              <TouchableOpacity
                style={[styles.iconBtn, commentOpen && styles.iconBtnActive]}
                onPress={() => setCommentOpen(true)}
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={18}
                  color={commentOpen ? "#fff" : Theme.colors.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sendBtn, stars < 1 && styles.submitDisabled]}
                onPress={submitRating}
                disabled={stars < 1 || submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={16} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}

      {/* ── OVERLAY COMMENTAIRE : Modal, blur plein écran en fondu piloté par le
          clavier + card opaque. Remontée BORNÉE. ── */}
      <Modal
        visible={commentOpen}
        transparent
        animationType="fade"
        onRequestClose={closeCommentOverlay}
      >
        <View style={styles.keyboardWrapper}>
          <AnimatedBlurView
            intensity={40}
            tint="light"
            pointerEvents="none"
            style={[styles.blurOverlay, { opacity: blurOpacity }]}
          />
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeCommentOverlay}
          />
          <Animated.View
            style={[
              styles.commentContainer,
              {
                transform: [
                  {
                    translateY: keyboardHeight.interpolate({
                      inputRange: [0, 100],
                      outputRange: [0, -90],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.commentModalCard}>{commentCardContent}</View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

/** Card stat individuelle : titre (haut) + chiffre + label (comme InfoCard). */
const StatCard = ({
  title,
  value,
  label,
}: {
  title: string;
  value: number;
  label: string;
}) => (
  <View style={[styles.infoCard, styles.statCard]}>
    <Text style={styles.statCardTitle}>{title}</Text>
    <Text style={styles.statCardVal}>{value}</Text>
    <Text style={styles.statCardLbl}>{label}</Text>
  </View>
);

/** Repris de la tab Livraison (mêmes styles infoCard). */
function InfoCard({
  label,
  value,
  small,
  compact,
}: {
  label: string;
  value: string;
  small?: boolean;
  compact?: boolean;
}) {
  return (
    <View style={[styles.infoCard, compact && { padding: 10, flex: 1 }]}>
      <Text
        style={[styles.infoLabel, compact && { marginBottom: 2, fontSize: 9 }]}
      >
        {label}
      </Text>
      <Text
        style={[styles.infoVal, small && styles.infoValSm]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    minHeight: 200,
  },
  // ── Overlay commentaire : même structure que CheckoutContactOverlay ──
  keyboardWrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  blurOverlay: {
    // Plein écran, rendu via l'opacity (fondu) quand le clavier est ouvert.
    ...StyleSheet.absoluteFillObject,
  },
  commentContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_H,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  commentModalCard: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  commentInlineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  commentHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  keyboardSmallBtn: {
    marginLeft: 8,
    padding: 4,
  },
  commentInlineTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0f172a",
  },
  commentInlineClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  commentModalInput: {
    height: 140,
    fontSize: 15,
    color: "#334155",
    textAlignVertical: "top",
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 16,
  },
  commentValidateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: Theme.colors.primary,
  },
  commentValidateText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 8,
  },
  muted: { fontSize: 13, color: "#9CA3AF" },
  // — repris de LivraisonTab —
  statePlaceholder: {
    height: "100%",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  menuImage: { width: "100%", height: "100%" },
  infoCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  infoLabel: {
    fontSize: 10,
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "700",
    marginBottom: 6,
  },
  infoVal: { fontSize: 14, fontWeight: "600", color: "#111827" },
  infoValSm: { fontSize: 13, color: "#374151", lineHeight: 20 },
  // Cards stats individuelles côte à côte.
  statsCardsRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  statCard: { flex: 1, padding: 10, alignItems: "flex-start" },
  statCardTitle: {
    fontSize: 9,
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontWeight: "700",
    marginBottom: 4,
    lineHeight: 12,
  },
  statCardVal: { fontSize: 20, fontWeight: "900", color: "#111827" },
  statCardLbl: {
    fontSize: 9,
    color: "#6B7280",
    fontWeight: "600",
    marginTop: 2,
  },
  ratedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    padding: 14,
  },
  ratedText: { fontSize: 13, fontWeight: "600", color: "#166534" },
  modifyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: "auto",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Theme.colors.primary + "15",
  },
  modifyBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: Theme.colors.primary,
  },
  infoMsgCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    padding: 14,
    borderColor: "#E5E7EB",
  },
  infoMsgText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    color: "#6B7280",
  },
  // Ligne notation : étoiles (gauche) + 2 boutons icônes (droite).
  rateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  starsRow: { flexDirection: "row", gap: 4 },
  rateActions: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Theme.colors.primary + "15",
  },
  iconBtnActive: { backgroundColor: Theme.colors.primary },
  submitDisabled: { opacity: 0.4 },
  sendBtn: {
    backgroundColor: Theme.colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
