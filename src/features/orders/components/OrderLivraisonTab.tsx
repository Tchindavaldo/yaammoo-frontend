import { Commande } from "@/src/types";
import { Ionicons } from "@expo/vector-icons";
import { useVoiceNotePlayer } from "@/src/services/audio/useVoiceNote";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { BikeAnimation } from "../../merchant/components/BikeAnimation";
import { DS } from "@/src/theme/ds";

/**
 * Onglet « Livraison » du détail client (`OrderBottomSheet`) : créneau,
 * téléphone, carte d'état (vélo / sur place / express / programmée), note et
 * message vocal. Sorti d'`OrderBottomSheet` (R4), rendu inchangé.
 */
export function OrderLivraisonTab({ order }: { order: Commande }) {
  // expo-audio : lecteur libere par le hook au demontage.
  const voice = useVoiceNotePlayer(order.delivery?.voiceNoteUri);
  const isPlaying = voice.playing;
  // En fin de lecture, la barre repart a zero (comme avant la migration).
  const playbackProgress = voice.finished ? 0 : voice.progress;

  async function playSound() {
    if (!order.delivery?.voiceNoteUri) return;
    try {
      await voice.toggle();
    } catch (error) {
      console.log(error);
    }
  }

  return (
    <>
      <View
        style={{ flexDirection: "row", gap: 10, marginTop: 10, height: 110 }}
      >
        <View style={{ width: "42%", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <InfoCard
              label="Créneau"
              value={
                !order.delivery?.status
                  ? "Sur place"
                  : order.delivery?.type === "express"
                    ? "Express"
                    : `Période (${order.delivery?.time || "Dès que possible"})`
              }
              compact
            />
          </View>
          <View style={{ flex: 1 }}>
            <InfoCard
              label="Téléphone"
              value={order.delivery?.phone || "—"}
              small
              compact
            />
          </View>
        </View>

        <View style={{ flex: 1 }}>
          <DeliveryStateCard order={order} />
        </View>
      </View>

      <View style={[styles.infoCard, { marginTop: 12, padding: 12 }]}>
        <Text style={styles.infoLabel}>Note de livraison</Text>
        <Text style={styles.infoValSm}>
          {order.delivery?.note || "Aucune note."}
        </Text>
      </View>

      {order.delivery?.voiceNoteUri ? (
        <>
          <Text style={[styles.infoLabel, { marginTop: 14, marginBottom: 8 }]}>
            Message vocal
          </Text>
          <TouchableOpacity
            style={styles.voiceBar}
            activeOpacity={0.7}
            onPress={playSound}
          >
            <View style={styles.playBtn}>
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={16}
                color={DS.accent}
              />
            </View>
            <Waveform active={isPlaying} progress={playbackProgress} />
            <Text style={styles.waveDur}>
              {Math.round(playbackProgress * 100)}%
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <View
          style={[
            styles.infoCard,
            { marginTop: 12, padding: 12, opacity: 0.5 },
          ]}
        >
          <Text style={styles.infoLabel}>Message vocal</Text>
          <Text style={styles.infoValSm}>Aucun message vocal</Text>
        </View>
      )}
    </>
  );
}

/** Carte droite : s'adapte au type (vélo, sur place, express, programmée). */
function DeliveryStateCard({ order }: { order: Commande }) {
  const isSurPlace = !order.delivery?.status;
  const isExpress = order.delivery?.type === "express";
  const isDelivering = order.status === "delivering";
  const box = [styles.stateCard, { gap: isExpress || isSurPlace || isDelivering ? 8 : 6 }];

  if (isDelivering) {
    return (
      <View style={box}>
        <BikeAnimation />
        <Text style={{ fontSize: 12, fontWeight: "600", color: "#27500A" }}>
          Livraison en cours...
        </Text>
      </View>
    );
  }

  if (isSurPlace) {
    return (
      <View style={box}>
        <Ionicons name="storefront-outline" size={28} color="#6B7280" />
        <Text style={{ fontSize: 12, fontWeight: "600", color: "#6B7280" }}>
          Sur place
        </Text>
      </View>
    );
  }

  if (isExpress) {
    return (
      <View style={box}>
        <Ionicons name="flash-outline" size={28} color={DS.accent} />
        <Text style={{ fontSize: 12, fontWeight: "600", color: DS.accent }}>
          Express
        </Text>
        <Text style={{ fontSize: 10, color: "#9CA3AF" }}>15-20 min</Text>
      </View>
    );
  }

  // Livraison programmée
  return (
    <View style={box}>
      <Ionicons name="time-outline" size={26} color="#2563eb" />
      <Text style={{ fontSize: 11, fontWeight: "600", color: "#2563eb" }}>
        {order.delivery?.time || "Dès que possible"}
      </Text>
      <Text style={{ fontSize: 10, color: "#9CA3AF" }}>30-45 min</Text>
    </View>
  );
}

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
      <Text style={[styles.infoVal, small && styles.infoValSm]}>{value}</Text>
    </View>
  );
}

function Waveform({
  active,
  progress = 0,
}: {
  active?: boolean;
  progress?: number;
}) {
  const heights = [
    4, 7, 12, 6, 10, 14, 8, 5, 11, 9, 13, 6, 8, 12, 5, 10, 7, 14, 6, 9, 11, 4,
    8, 12, 7, 5, 10, 13, 6, 9,
  ];
  return (
    <View style={styles.wave}>
      {heights.map((h, i) => {
        const barProgress = (i + 1) / heights.length;
        const isPlayed = progress >= barProgress;
        return (
          <View
            key={i}
            style={[
              styles.wavebar,
              { height: h },
              active && isPlayed && { backgroundColor: DS.accent },
              active && !isPlayed && { backgroundColor: "rgba(236,19,49,0.2)" },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // Ancien `mapPlaceholder` + surcharges de la carte d'état, fusionnés.
  stateCard: {
    height: "100%",
    backgroundColor: DS.gray100,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  infoCard: {
    backgroundColor: DS.gray50,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: DS.gray100,
  },
  infoLabel: {
    fontSize: 10,
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "700",
    marginBottom: 6,
  },
  infoVal: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  infoValSm: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 20,
  },
  voiceBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: DS.gray50,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: DS.gray100,
  },
  playBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  wave: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  wavebar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
  },
  waveDur: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9CA3AF",
  },
});
