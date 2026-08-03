import { Config } from "@/src/api/config";
import React from "react";
import {
  Animated,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { PaymentWebViewSkeleton, SHEET_HEIGHT } from "./PaymentWebViewSkeleton";

interface PaymentWebViewModalProps {
  visible: boolean;
  onClose: () => void;
  /** Paramètres passés à la page (total, titre du menu, prix détaillés…). */
  params?: Record<string, string | number | undefined>;
}

/**
 * WebView plein écran chargeant la page de paiement servie par le backend
 * (`GET /payment-page`). Remplace les overlays natifs au clic sur "Buy".
 */
export const PaymentWebViewModal: React.FC<PaymentWebViewModalProps> = ({
  visible,
  onClose,
  params,
}) => {
  const uri = React.useMemo(() => {
    const query = Object.entries(params || {})
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(
        ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
      )
      .join("&");
    return query ? `${Config.paymentPageUrl}?${query}` : Config.paymentPageUrl;
  }, [params]);

  const [error, setError] = React.useState<string | null>(null);

  // Décalage vertical suivant le clavier : la page se cale juste au-dessus,
  // comme la capsule native d'origine.
  const bottom = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) setError(null);
  }, [visible]);

  React.useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        Animated.spring(bottom, {
          toValue: e.endCoordinates.height,
          useNativeDriver: false,
          tension: 40,
          friction: 8,
        }).start();
      },
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        Animated.spring(bottom, {
          toValue: 0,
          useNativeDriver: false,
          tension: 40,
          friction: 8,
        }).start();
      },
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, [bottom]);

  // Rendu comme overlay absolu (PAS un Modal) : un second Modal au-dessus du
  // Modal du checkout ne s'affiche pas sur iOS.
  if (!visible) return null;

  return (
    <Animated.View style={[styles.backdrop, { bottom }]}>
        <WebView
          source={{ uri }}
          style={styles.webview}
          containerStyle={styles.webviewContainer}
          originWhitelist={["*"]}
          // Fond transparent : on voit le sheet natif sous la page.
          opaque={false}
          backgroundColor="transparent"
          // Masque la barre d'accessoires iOS (chevrons + Done) au-dessus du clavier.
          hideKeyboardAccessoryView
          javaScriptEnabled
          domStorageEnabled
          keyboardDisplayRequiresUserAction={false}
          setSupportMultipleWindows={false}
          // Contenu figé : la page tient exactement dans la hauteur du sheet.
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          nestedScrollEnabled={false}
          onMessage={(e) => {
            if (e.nativeEvent.data === "close") onClose();
          }}
          onError={() => setError("Impossible de charger la page de paiement")}
          onHttpError={() =>
            setError("Impossible de charger la page de paiement")
          }
          startInLoadingState
          renderLoading={() => <PaymentWebViewSkeleton />}
        />

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  // Limité à la hauteur du bottom sheet de commande, ancré en bas.
  backdrop: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: SHEET_HEIGHT,
    zIndex: 200,
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
  },
  webviewContainer: {
    flex: 1,
    backgroundColor: "transparent",
  },
  errorBox: {
    position: "absolute",
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: "rgba(239,68,68,0.95)",
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
});
