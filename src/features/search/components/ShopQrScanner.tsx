// Scanner de QR code de boutique, plein ecran, ouvert par l'icone camera de la
// page de recherche. Appelle `onScanned(shopId)` une seule fois par ouverture.
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import React, { useEffect, useRef } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlobalToastHost } from "@/src/components/GlobalToastHost";
import { showToast } from "@/src/services/globalToast";
import { DS } from "@/src/theme/ds";
import { t } from "@/src/i18n";
import { parseShopQr } from "../utils/parseShopQr";

interface Props {
  visible: boolean;
  onClose: () => void;
  onScanned: (shopId: string) => void;
}

export const ShopQrScanner: React.FC<Props> = ({ visible, onClose, onScanned }) => {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const handled = useRef(false);

  useEffect(() => {
    if (!visible) return;
    handled.current = false;
    if (permission && !permission.granted && permission.canAskAgain) requestPermission();
  }, [visible, permission, requestPermission]);

  const onBarcode = ({ data }: { data: string }) => {
    if (handled.current) return;
    const id = parseShopQr(data);
    if (!id) {
      showToast(t("QR code non reconnu"), "error");
      return;
    }
    handled.current = true;
    onScanned(id);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.screen}>
        {permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={onBarcode}
          />
        ) : (
          <View style={styles.denied}>
            <Text style={styles.deniedText}>
              {t("Autorisez la caméra pour scanner le QR code d'une boutique.")}
            </Text>
          </View>
        )}
        <View style={styles.frame} pointerEvents="none" />
        <Text style={[styles.hint, { bottom: insets.bottom + 40 }]}>
          {t("Scannez le QR code d'une boutique")}
        </Text>
        <TouchableOpacity
          style={[styles.close, { top: insets.top + 12 }]}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={22} color={DS.onInk} />
        </TouchableOpacity>
        <GlobalToastHost modal />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: DS.ink },
  denied: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  deniedText: { color: DS.onInk, fontSize: 14, textAlign: "center" },
  frame: {
    position: "absolute",
    alignSelf: "center",
    top: "30%",
    width: 240,
    height: 240,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: DS.accent,
  },
  hint: { position: "absolute", alignSelf: "center", color: DS.onInk, fontSize: 14, fontWeight: "600" },
  close: {
    position: "absolute",
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DS.scrimMid,
    alignItems: "center",
    justifyContent: "center",
  },
});
