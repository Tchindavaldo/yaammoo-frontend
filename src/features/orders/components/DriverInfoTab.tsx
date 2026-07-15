import {
  DriverProfile,
  driverService,
} from "@/src/features/driver/services/driverService";
import { BikeAnimation } from "@/src/features/merchant/components/BikeAnimation";
import { ratingService } from "@/src/features/orders/services/ratingService";
import { ratingStatsCache } from "@/src/features/orders/services/ratingStatsCache";
import { socketService } from "@/src/services/socket";
import { Theme } from "@/src/theme";
import { Commande } from "@/src/types";
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
import QRCode from "react-native-qrcode-svg";
const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);
// Même hauteur de référence que CheckoutContactOverlay (base du blur + container).
const SHEET_H = 384;

interface DriverInfoTabProps {
  order: Commande;
  /** false = lecture seule (marchand). Le backend décide via profile.canRate. */
  allowRating?: boolean;
}

/**
 * Tab « Livreur » — reprend la STRUCTURE de la tab Livraison (2 InfoCards à
 * gauche + zone d'état à droite, puis un bloc dessous), remplie avec les infos
 * du livreur (ou du marchand quand il livre lui-même).
 *  - Zone droite : QR (cmd `delivering`, scanné pour confirmer) ou BikeAnimation
 *    + « Livré » (cmd `delivered`).
 *  - Bloc bas : stats (`myStats`) + notation du livreur (si `canRate`).
 */
export const DriverInfoTab: React.FC<DriverInfoTabProps> = ({
  order,
  allowRating = true,
}) => {
  const rawDriverId = (order as any).driverId as string | undefined;
  // Le marchand se livre lui-même quand driverId === fastFoodId (ou absent).
  const isMerchantDelivery = !rawDriverId || rawDriverId === order.fastFoodId;
  // driverId "réel" d'un livreur délégué (undefined si c'est le marchand).
  const driverId = isMerchantDelivery ? undefined : rawDriverId;
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [commentOpen, setCommentOpen] = useState(false);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isModifying, setIsModifying] = useState(false); // mode modification

  // ── Animation clavier (même système/logique que CheckoutLocationOverlay) ──
  // Une seule Animated.Value pilotée par la hauteur du clavier ; le calage de la
  // carte se fait via une interpolation BORNÉE (comme la card note livraison),
  // pas via -(kbHeight - 60) qui faisait remonter la carte beaucoup trop haut.
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

  // Clé de cache : driverId réel, ou fastFoodId quand le marchand livre.
  const cacheId = driverId || order.fastFoodId;

  useEffect(() => {
    let alive = true;
    // Cache : affichage instantané SANS loader si déjà chargé, refetch en fond.
    const cached = ratingStatsCache.get<DriverProfile>(
      "driver",
      cacheId,
      order.id,
    );
    if (cached) {
      setProfile(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    // 1. Charger le profil (driver ou marchand)
    const req = driverId
      ? driverService.getDriverInfo(driverId)
      : driverService.getMerchantDeliveryInfo(order.fastFoodId);
    Promise.all([
      req,
      // 2. Charger la note existante de l'user pour cette commande
      ratingService.getOrderRating(order.id),
    ])
      .then(([p, rating]) => {
        if (!alive) return;
        if (p) {
          setProfile(p);
          ratingStatsCache.set("driver", cacheId, order.id, p);
        } else if (!cached) {
          setProfile(null);
        }
        // Préremplir avec la note existante si présente
        if (rating?.driverRating) {
          setStars(rating.driverRating.value);
          setComment(rating.driverRating.comment || "");
        }
      })
      .catch(() => {
        if (alive && !cached) setProfile(null);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [driverId, order.fastFoodId, order.id, cacheId]);

  // Socket : la note moyenne du livreur change en direct quand un autre user note.
  // Payload backend : { data: { driverId, ratingAvg, ratingCount } } (enveloppé).
  useEffect(() => {
    if (!driverId) return;
    const sock = socketService.getSocket();
    const onUpdate = (payload: any) => {
      const d = payload?.data ?? payload;
      if (!d || d.driverId !== driverId) return;
      ratingStatsCache.patchRating("driver", cacheId, d.ratingAvg, d.ratingCount);
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
    sock.on("driverRatingUpdated", onUpdate);
    return () => {
      sock.off("driverRatingUpdated", onUpdate);
    };
  }, [driverId, cacheId]);

  const submitRating = async () => {
    if (stars < 1 || submitting || !driverId) return;
    setSubmitting(true);
    // Temps minimum d'affichage du loader (l'appel peut être trop rapide sinon
    // le loader flashe et l'user ne voit rien se passer).
    const minDelay = new Promise((r) => setTimeout(r, 600));
    try {
      await Promise.all([
        driverService.rateDriver(driverId, order.id, stars, comment.trim()),
        minDelay,
      ]);
      setSubmitted(true);
      setIsModifying(false);
      setCommentOpen(false);
      // Ma note vient de changer → purger le cache (refetch propre ensuite).
      ratingStatsCache.invalidate("driver", driverId, order.id);
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

  if (!profile && driverId) {
    return (
      <View style={styles.centered}>
        <Ionicons name="person-remove-outline" size={28} color="#9CA3AF" />
        <Text style={styles.muted}>Livreur indisponible</Text>
      </View>
    );
  }

  const name =
    profile?.displayName ||
    `${profile?.prenom || ""} ${profile?.nom || ""}`.trim() ||
    (isMerchantDelivery ? "Le restaurant" : "Livreur");

  const stats = profile?.myStats || profile?.stats;
  const isDelivered = order.status === "delivered";
  const scope = profile?.scope;

  // Déterminer qui consulte la tab :
  const viewerIsSelf = scope === "self"; // le livreur lui-même
  const viewerIsMerchant = scope === "merchant"; // le marchand

  // Message d'info selon le contexte
  // Affiché dans tous les cas où la notation n'est pas possible/pertinente :
  // - Auto-notation (livreur, marchand)
  // - Commande en cours (client)
  // - Commande livrée sans possibilité de noter (canRate absent)
  // - Marchand livre lui-même (isMerchantDelivery) : le restaurant assure la livraison
  let infoMessage: string | null = null;
  if (viewerIsSelf) {
    infoMessage = "Vous ne pouvez pas vous noter vous-même";
  } else if (viewerIsMerchant) {
    infoMessage = "Vous ne pouvez pas noter votre propre livraison";
  } else if (isMerchantDelivery) {
    infoMessage = isDelivered
      ? "Livré par le restaurant"
      : "Livraison par le restaurant";
  } else if (!isDelivered) {
    infoMessage = "Notez le livreur après réception";
  }

  // Commande livrée : peut-on noter ? déjà noté ?
  // isModifying permet de rouvrir le formulaire même si hasRated est vrai
  const canRateDelivery = !!profile?.canRate && isDelivered;
  const showRateBtn =
    allowRating && isDelivered && canRateDelivery && !submitted && !isModifying;
  const showRateFormModify =
    allowRating && isDelivered && (isModifying || submitting);
  const alreadyRated = !isDelivered
    ? false
    : submitted || (!!profile?.hasRated && !isModifying);

  // Si déjà noté : on permet la modification (réaffiche le formulaire avec les valeurs existantes)
  const handleModify = () => {
    setIsModifying(true);
  };

  const qrValue = JSON.stringify({
    orderId: order.id,
    userId: order.userId,
    userEmail: order.userData?.email || (order as any).userEmail || "",
    ...(driverId
      ? { driverId, driverEmail: (profile as any)?.email || "" }
      : { fastFoodId: order.fastFoodId }),
  });

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
      {/* ── Haut : 2 InfoCards à gauche + zone d'état à droite (comme Livraison) ── */}
      <View
        style={{ flexDirection: "row", gap: 10, marginTop: 10, height: 110 }}
      >
        <View style={{ width: "42%", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <InfoCard
              label={isMerchantDelivery ? "Restaurant" : "Livreur"}
              value={name}
              compact
            />
          </View>
          <View style={{ flex: 1 }}>
            <InfoCard
              label="Note"
              value={
                profile?.ratingAvg != null
                  ? `★ ${profile.ratingAvg.toFixed(1)}`
                  : "—"
              }
              small
              compact
            />
          </View>
        </View>

        <View style={{ flex: 1 }}>
          {isDelivered ? (
            <View style={styles.statePlaceholder}>
              {/* Commande livrée : vélo figé (plus d'animation, il est arrivé). */}
              <BikeAnimation paused />
              <Text style={styles.deliveredText}>Livré</Text>
            </View>
          ) : (
            <View style={styles.statePlaceholder}>
              <QRCode value={qrValue} size={84} />
            </View>
          )}
        </View>
      </View>

      {/* ── Bloc bas : stats + notation (à la place de Note/vocal) ── */}
      {stats && (
        <View style={styles.statsCardsRow}>
          <StatCard
            title={"Cmd\nlivré"}
            value={stats.delivered}
            label="livraisons"
          />
          <StatCard
            title={"Cmd\nen cours"}
            value={stats.inProgress}
            label="livraisons"
          />
          <StatCard
            title={"Cmd nen\ attente"}
            value={stats.pending}
            label="livraisons"
          />
          <StatCard
            title={"Nombre\nvote"}
            value={profile?.ratingCount ?? 0}
            label="vote"
          />
        </View>
      )}

      {/* Message info pour les commandes en cours ou auto-notation */}
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
          <Text style={styles.ratedText}>
            {viewerIsSelf
              ? "Vous avez noté"
              : viewerIsMerchant
                ? "Noté"
                : "Vous avez noté ce livreur"}
          </Text>
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

/** Card stat individuelle : titre (haut, 2 lignes via \n) + chiffre + label. */
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
  deliveredText: { fontSize: 12, fontWeight: "600", color: "#27500A" },
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
  // Cards stats individuelles côte à côte (titre 2 lignes + chiffre + label).
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
