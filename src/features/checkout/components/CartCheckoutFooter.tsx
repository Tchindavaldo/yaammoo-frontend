import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Loader } from "../../../components/Loader";
import { styles } from "./CartCheckoutSheet.styles";

interface CheckoutFooterProps {
  total: number;
  quantity: number;
  setQuantity: (q: number) => void;
  onBuy: () => void;
  isLoading?: boolean;
  isCartMode?: boolean;
  /** Enregistre les modifications locales sans lancer le paiement. */
  onAddToCart?: () => void;
  /** Loader du bouton Enregistrer (distinct de celui de Valider). */
  isSaving?: boolean;
}

export const CartCheckoutFooter: React.FC<CheckoutFooterProps> = ({
  total,
  quantity,
  setQuantity,
  onBuy,
  isLoading,
  onAddToCart,
  isSaving,
}) => {
  const busy = isLoading || isSaving;
  return (
    <View style={[styles.bottomActionBar, styles.actionBarLight]}>
      <View style={styles.priceSectionLeft}>
        <Text style={[styles.currencyText, styles.textDark]}>
          XAF {"\n"}
          {total}
        </Text>
      </View>

      <View style={[styles.counterContainer, styles.counterLight]}>
        <TouchableOpacity
          style={styles.counterBtn}
          onPress={() => setQuantity(Math.max(1, quantity - 1))}
        >
          <Ionicons name="remove" size={18} color="black" />
        </TouchableOpacity>
        <Text style={[styles.counterText, styles.textDark]}>{quantity}</Text>
        <TouchableOpacity
          style={[
            styles.counterBtn,
            styles.counterBtnAdd,
            styles.counterBtnAddLight,
          ]}
          onPress={() => setQuantity(quantity + 1)}
        >
          <Ionicons name="add" size={18} color="black" />
        </TouchableOpacity>
      </View>

      {/* Enregistrer : persiste les modifications locales (PUT en pendingToBuy)
          sans lancer le paiement. */}
      {onAddToCart && (
        <TouchableOpacity
          style={[styles.saveBtn, busy && { opacity: 0.7 }]}
          onPress={onAddToCart}
          disabled={busy}
        >
          {isSaving ? (
            <Loader size={20} color="white" />
          ) : (
            <>
              <Ionicons name="save-outline" size={16} color="white" />
              <Text style={styles.btnText}>save</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.buyBtn, busy && { opacity: 0.7 }]}
        onPress={onBuy}
        disabled={busy}
      >
        {isLoading ? (
          <Loader size={20} color="white" />
        ) : (
          <>
            <Ionicons name="checkmark-circle-outline" size={16} color="white" />
            <Text style={styles.btnText}>Valider</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};
