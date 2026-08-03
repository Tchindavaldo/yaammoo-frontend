import { Config } from "@/src/api/config";
import React from "react";
import { Keyboard, Platform, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { PaymentWebViewSkeleton } from "./PaymentWebViewSkeleton";

interface PaymentWebViewModalProps {
  visible: boolean;
  onClose: () => void;
  /** Paramètres passés à la page (total, titre du menu, prix détaillés…). */
  params?: Record<string, string | number | undefined>;
  /** Étape affichée par la capsule (input/waiting/ussd_sent/success/…). */
  paymentState?: string;
  /** Message USSD (ou libellé d'étape) affiché en état `ussd_sent`. */
  ussdMessage?: string;
  /** Clic sur « payer » dans la page. */
  onPay?: (phone: string, network: "orange" | "mtn") => void;
  /** La page a terminé sa séquence (commande créée) : on peut fermer. */
  onDone?: () => void;
}

/**
 * WebView plein écran chargeant la page de paiement servie par le backend
 * (`GET /payment-page`). Remplace les overlays natifs au clic sur "Buy".
 */
export const PaymentWebViewModal: React.FC<PaymentWebViewModalProps> = ({
  visible,
  onClose,
  params,
  paymentState,
  ussdMessage,
  onPay,
  onDone,
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

  const webRef = React.useRef<WebView>(null);

  React.useEffect(() => {
    if (visible) setError(null);
  }, [visible]);

  // Étape courante poussée dans la page (la capsule affiche l'état).
  React.useEffect(() => {
    if (!paymentState) return;
    webRef.current?.injectJavaScript(
      `window.__setState && window.__setState(${JSON.stringify(
        paymentState,
      )}, ${JSON.stringify(ussdMessage || "")}); true;`,
    );
  }, [paymentState, ussdMessage]);

  // La WebView ne bouge pas : on transmet juste la hauteur du clavier à la
  // page, qui fait remonter la SEULE capsule de saisie.
  React.useEffect(() => {
    const setKb = (height: number) =>
      webRef.current?.injectJavaScript(
        `window.__setKeyboard && window.__setKeyboard(${height}); true;`,
      );
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => setKb(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKb(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Rendu comme overlay absolu (PAS un Modal) : un second Modal au-dessus du
  // Modal du checkout ne s'affiche pas sur iOS.
  if (!visible) return null;

  return (
    <View style={styles.backdrop}>
        <WebView
          ref={webRef}
          source={{ uri }}
          style={styles.webview}
          containerStyle={styles.webviewContainer}
          originWhitelist={["*"]}
          // Fond transparent (via style/containerStyle) : on voit le sheet natif
          // sous la page.
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
            const data = e.nativeEvent.data;
            if (data === "close") {
              onClose();
              return;
            }
            if (data === "done") {
              onDone?.();
              return;
            }
            try {
              const msg = JSON.parse(data);
              if (msg?.type === "pay") {
                onPay?.(String(msg.phone || ""), msg.network || "orange");
              }
            } catch {
              // messages non JSON (keyboard:open/close) : rien à faire
            }
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
    </View>
  );
};

const styles = StyleSheet.create({
  // Plein écran : le contenu de la page reste calé sur la hauteur du sheet,
  // mais la capsule peut remonter au-dessus quand le clavier s'ouvre.
  backdrop: {
    ...StyleSheet.absoluteFillObject,
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
