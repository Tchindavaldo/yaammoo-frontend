import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Theme } from "@/src/theme";
import { ratingService } from "../services/ratingService";

interface RateMenuTabProps {
  menuId: string;
  orderId: string;
  menuName: string;
}

/**
 * Tab « Noter » — le client note le plat d'une commande livrée.
 * POST /menu/:id/rating ; le backend émet menuRatingUpdated.
 */
export const RateMenuTab: React.FC<RateMenuTabProps> = ({
  menuId,
  orderId,
  menuName,
}) => {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    if (stars < 1 || submitting) return;
    setSubmitting(true);
    try {
      await ratingService.rateMenu(menuId, orderId, stars, comment.trim());
      setSubmitted(true);
    } catch {
      // erreur silencieuse
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <View style={styles.thanks}>
        <Ionicons name="checkmark-circle" size={22} color="#16a34a" />
        <Text style={styles.thanksText}>Merci pour votre avis !</Text>
      </View>
    );
  }

  return (
    <View style={styles.box}>
      <Text style={styles.title}>Noter « {menuName} »</Text>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity key={n} onPress={() => setStars(n)}>
            <Ionicons
              name={n <= stars ? "star" : "star-outline"}
              size={34}
              color="#F59E0B"
            />
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        style={styles.input}
        placeholder="Votre commentaire (optionnel)"
        placeholderTextColor="#9CA3AF"
        value={comment}
        onChangeText={setComment}
        multiline
      />
      <TouchableOpacity
        style={[styles.btn, stars < 1 && styles.btnDisabled]}
        onPress={submit}
        disabled={stars < 1 || submitting}
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.btnText}>Envoyer mon avis</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  box: { padding: 20, gap: 14 },
  title: { fontSize: 15, fontWeight: "700", color: "#111827", textAlign: "center" },
  starsRow: { flexDirection: "row", gap: 8, justifyContent: "center" },
  input: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#111827",
    minHeight: 60,
    textAlignVertical: "top",
  },
  btn: {
    backgroundColor: Theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  thanks: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 10,
  },
  thanksText: { fontSize: 15, fontWeight: "600", color: "#166534" },
});
