import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import { Commande } from "@/src/types";
import { Theme } from "@/src/theme";
import {
  driverService,
  DriverProfile,
} from "@/src/features/driver/services/driverService";
import { BikeAnimation } from "@/src/features/merchant/components/BikeAnimation";

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

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const req = driverId
      ? driverService.getDriverInfo(driverId)
      : driverService.getMerchantDeliveryInfo(order.fastFoodId);
    req
      .then((p) => alive && setProfile(p))
      .catch(() => alive && setProfile(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [driverId, order.fastFoodId]);

  const submitRating = async () => {
    if (stars < 1 || submitting || !driverId) return;
    setSubmitting(true);
    try {
      await driverService.rateDriver(driverId, order.id, stars, comment.trim());
      setSubmitted(true);
      setCommentOpen(false);
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
  // Note possible seulement sur une cmd LIVRÉE par un livreur délégué, si le
  // backend l'autorise (canRate = livré ≥1 fois ET pas encore noté).
  // La notation est possible si :
  //   - Livreur délégué (driverId) : canRate venant de GET /driver/:id (scope public)
  //   - Marchand livre lui-même (isMerchantDelivery) : canRate venant de GET /fastFood/:id/delivery-stats (scope client)
  const canRateDelivery = !!profile?.canRate && isDelivered;
  const showRateBtn =
    allowRating && isDelivered && canRateDelivery && !submitted;
  const alreadyRated = !isDelivered ? false : submitted || !!profile?.hasRated;

  // DEBUG — pourquoi la ligne de note ne s'affiche pas :
  console.log("⭐ DriverInfoTab rating debug:", {
    orderId: order.id,
    status: order.status,
    rawDriverId: (order as any).driverId,
    fastFoodId: order.fastFoodId,
    isMerchantDelivery,
    driverId,
    allowRating,
    isDelivered,
    scope: profile?.scope,
    canRate: profile?.canRate,
    hasRated: profile?.hasRated,
    showRateBtn,
    alreadyRated,
  });

  const qrValue = JSON.stringify({
    orderId: order.id,
    userId: order.userId,
    userEmail: order.userData?.email || (order as any).userEmail || "",
    ...(driverId
      ? { driverId, driverEmail: (profile as any)?.email || "" }
      : { fastFoodId: order.fastFoodId }),
  });

  return (
    <>
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
                  ? `★ ${profile.ratingAvg.toFixed(1)} (${profile.ratingCount ?? 0})`
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
              <BikeAnimation />
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
        <View style={[styles.infoCard, { marginTop: 12, padding: 12 }]}>
          <Text style={styles.infoLabel}>Livraisons</Text>
          <View style={styles.statsRow}>
            <Stat label="Livrées" value={stats.delivered} />
            <Stat label="En cours" value={stats.inProgress} />
            <Stat label="En attente" value={stats.pending} />
          </View>
        </View>
      )}

      {alreadyRated ? (
        <View style={[styles.infoCard, styles.ratedCard]}>
          <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
          <Text style={styles.ratedText}>Vous avez noté ce livreur</Text>
        </View>
      ) : showRateBtn ? (
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
                onPress={() => setCommentOpen((v) => !v)}
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={18}
                  color={commentOpen ? "#fff" : Theme.colors.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.iconBtn,
                  styles.sendBtn,
                  stars < 1 && styles.submitDisabled,
                ]}
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

          {/* Input commentaire — design/taille de la tab Commande */}
          {commentOpen && (
            <View style={styles.commentBox}>
              <TextInput
                style={styles.commentInput}
                placeholder="Votre commentaire…"
                placeholderTextColor="#9CA3AF"
                value={comment}
                onChangeText={setComment}
                multiline
              />
            </View>
          )}
        </View>
      ) : null}
    </>
  );
};

const Stat = ({ label, value }: { label: string; value: number }) => (
  <View style={styles.statBox}>
    <Text style={styles.statVal}>{value}</Text>
    <Text style={styles.statLbl}>{label}</Text>
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
  statsRow: { flexDirection: "row", gap: 8, marginTop: 2 },
  statBox: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  statVal: { fontSize: 17, fontWeight: "900", color: "#111827" },
  statLbl: { fontSize: 9, color: "#6B7280", fontWeight: "600", marginTop: 2 },
  ratedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    padding: 14,
  },
  ratedText: { fontSize: 13, fontWeight: "600", color: "#166534" },
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
  sendBtn: { backgroundColor: Theme.colors.primary },
  submitDisabled: { opacity: 0.4 },
  // Input commentaire — même design que le conteneur de la tab Commande.
  commentBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    padding: 12,
  },
  commentInput: {
    fontSize: 13,
    color: "#111827",
    minHeight: 44,
    textAlignVertical: "top",
  },
});
