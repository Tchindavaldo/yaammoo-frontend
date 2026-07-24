import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DeliveryOffer } from "@/src/types";

/**
 * Ligne unique en bas des overlays de sélection de livraison (Période / Express).
 * TOUT le texte / l'input est à GAUCHE ; le(s) bouton(s) à DROITE, même ligne.
 *
 * Trois états d'affichage à gauche :
 *  1. Offre gratuite détectée (`deliveryOffer.active`) → « Livraison offerte ·
 *     <émetteur> » d'entrée. Un seul bouton VALIDER.
 *  2. Pas d'offre, aucune zone choisie → l'input de code bonus est affiché
 *     PAR DÉFAUT (pas de clic préalable). Bouton VALIDER à droite.
 *  3. Zone choisie → détails (lieu · prix, ou « offerte » si le code saisi vaut
 *     le bonusCode). À droite : bouton code (ouvre/ferme l'input) + VALIDER.
 */

const ACCENT = "#ec4913";

interface DeliveryValidateRowProps {
  hasSelection: boolean;
  selectedLabel?: string;
  selectedPrice?: string;
  deliveryOffer?: DeliveryOffer | null;
  bonusCode: string;
  onChangeBonusCode: (code: string) => void;
  /** Input code ouvert (état 3). En état 2 l'input est toujours visible. */
  codeInputOpen: boolean;
  onToggleCodeInput: () => void;
  onValidate: () => void;
  /** true si `bonusCode` correspond au `bonusCode` de l'offre → livraison offerte. */
  bonusApplied?: boolean;
}

const offerIssuer = (offer: DeliveryOffer): string =>
  offer.reason === "campaign" ? "Promo yaammoo" : offer.bonusName || "Bonus";

export const DeliveryValidateRow: React.FC<DeliveryValidateRowProps> = ({
  hasSelection,
  selectedLabel,
  selectedPrice,
  deliveryOffer,
  bonusCode,
  onChangeBonusCode,
  codeInputOpen,
  onToggleCodeInput,
  onValidate,
  bonusApplied,
}) => {
  const offerActive = !!deliveryOffer?.active;
  const isFree = offerActive || bonusApplied;
  const issuer = deliveryOffer ? offerIssuer(deliveryOffer) : "Bonus";

  // L'input code est visible :
  //  - état 2 (pas d'offre, pas de sélection) : TOUJOURS (par défaut).
  //  - état 3 (sélection) : seulement si l'utilisateur l'a ouvert.
  const showInputByDefault = !offerActive && !hasSelection;
  const inputVisible = showInputByDefault || (hasSelection && codeInputOpen);

  const codeInput = (
    <TextInput
      style={styles.codeInput}
      placeholder="Code bonus (optionnel)"
      placeholderTextColor="#94a3b8"
      autoCapitalize="characters"
      value={bonusCode}
      onChangeText={onChangeBonusCode}
    />
  );

  // ---- Colonne GAUCHE ----
  // Mini-carte d'info sur 2 niveaux (pastille icône + titre + sous-ligne), au
  // lieu d'un texte à plat. Reste sur la même rangée que les boutons à droite.
  let left: React.ReactNode;
  if (inputVisible) {
    left = codeInput;
  } else if (isFree) {
    left = (
      <View style={styles.infoCard}>
        <View style={[styles.iconPill, styles.iconPillFree]}>
          <Ionicons name="gift" size={16} color="white" />
        </View>
        <View style={styles.infoTextCol}>
          <Text style={[styles.infoTitle, { color: ACCENT }]} numberOfLines={1}>
            Livraison offerte
          </Text>
          <Text style={styles.infoSub} numberOfLines={1}>
            Par {issuer}
          </Text>
        </View>
      </View>
    );
  } else {
    left = (
      <View style={styles.infoCard}>
        <View style={styles.iconPill}>
          <Ionicons name="location-sharp" size={16} color={ACCENT} />
        </View>
        <View style={styles.infoTextCol}>
          <Text style={styles.infoTitle} numberOfLines={1}>
            {selectedLabel || "Sélectionnez une zone"}
          </Text>
          <Text
            style={[styles.infoSub, selectedPrice ? styles.infoPrice : null]}
            numberOfLines={1}
          >
            {selectedPrice ? `${selectedPrice} F · livraison` : "Aucune sélection"}
          </Text>
        </View>
      </View>
    );
  }

  // ---- Colonne DROITE ----
  // Bouton "code" affiché seulement en état 3 (sélection, pas d'offre active) :
  // il permet d'ouvrir/fermer l'input pour appliquer un code sur la zone choisie.
  const showCodeBtn = hasSelection && !offerActive;

  return (
    <View style={styles.row}>
      <View style={styles.leftWrap}>{left}</View>
      <View style={styles.btnGroup}>
        {showCodeBtn && (
          <TouchableOpacity
            style={[styles.codeBtn, codeInputOpen && styles.codeBtnActive]}
            onPress={onToggleCodeInput}
            accessibilityLabel="Saisir un code bonus"
          >
            <Ionicons
              name="pricetag-outline"
              size={18}
              color={codeInputOpen ? "white" : ACCENT}
            />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.validateBtn} onPress={onValidate}>
          <Text style={styles.validateText}>VALIDER</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },
  leftWrap: {
    flex: 1,
    justifyContent: "center",
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 48,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#eef2f6",
  },
  iconPill: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "rgba(236, 73, 19, 0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconPillFree: {
    backgroundColor: ACCENT,
  },
  infoTextCol: {
    flex: 1,
    justifyContent: "center",
  },
  infoTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#0f172a",
  },
  infoSub: {
    fontSize: 11.5,
    fontWeight: "500",
    color: "#94a3b8",
    marginTop: 1,
  },
  infoPrice: {
    color: ACCENT,
    fontWeight: "700",
  },
  codeInput: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#0f172a",
  },
  btnGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  codeBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: ACCENT,
    backgroundColor: "rgba(236, 73, 19, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  codeBtnActive: {
    backgroundColor: ACCENT,
  },
  validateBtn: {
    height: 48,
    paddingHorizontal: 22,
    backgroundColor: ACCENT,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  validateText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
});
