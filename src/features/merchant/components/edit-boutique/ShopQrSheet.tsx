"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import { GlobalToastHost } from "@/src/components/GlobalToastHost";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import React, { useRef, useState } from "react";
import { Animated, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useSheetAnimation } from "./useSheetAnimation";
import { useSheetSafeInsets } from "@/src/hooks/usePageBottomInset";
import { SafeAreaDebugBand } from "@/src/components/SafeAreaDebugBand";
import { showToast } from "@/src/services/globalToast";
import { DS } from "@/src/theme/ds";
import { t, useLanguage } from "@/src/i18n";

/**
 * Sheet « QR code de la boutique » (maquette AjQr, canvas page Ajustements) :
 * QR de https://yaammoo.rauval.com/shop/<id> (Universal / App Links), logo de
 * la boutique au centre (logo de l'app sinon), Partager / Télécharger.
 */
const APP_LOGO = require("@/assets/images/logo.png");
const SHOP_LINK = "https://yaammoo.rauval.com/shop/";

export const ShopQrSheet: React.FC<{
  visible: boolean;
  onClose: () => void;
  shopId: string;
  shopName: string;
  logoUri?: string;
}> = ({ visible, onClose, shopId, shopName, logoUri }) => {
  useLanguage();
  const insets = useSheetSafeInsets();
  const { mounted, backdropOpacity, translateY } = useSheetAnimation(visible);
  const qrRef = useRef<any>(null);
  const [busy, setBusy] = useState(false);
  const url = SHOP_LINK + shopId;

  // Les deux boutons ouvrent la feuille de partage : « Enregistrer l'image » y
  // fait le téléchargement dans la galerie.
  const exportQr = () => {
    if (!qrRef.current || busy) return;
    setBusy(true);
    qrRef.current.toDataURL(async (data: string) => {
      try {
        const file = `${FileSystem.cacheDirectory}yaammoo-qr-${shopId}.png`;
        await FileSystem.writeAsStringAsync(file, data, { encoding: FileSystem.EncodingType.Base64 });
        await Sharing.shareAsync(file, { mimeType: "image/png", dialogTitle: shopName });
      } catch (e) {
        console.warn("[ShopQrSheet] export", e);
        showToast(t("Impossible d'exporter le QR code"), "error");
      } finally {
        setBusy(false);
      }
    });
  };

  if (!mounted) return null;

  return (
    <Modal transparent visible={mounted} animationType="none">
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Animated.View style={[StyleSheet.absoluteFill, s.backdrop, { opacity: backdropOpacity }]} />
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <Animated.View style={[s.sheet, { paddingBottom: insets.bottom, transform: [{ translateY }] }]}>
          <View style={s.head}>
            <Text style={s.title}>{t("QR code de la boutique")}</Text>
            <TouchableOpacity onPress={onClose} style={s.close}>
              <Ionicons name="close" size={20} color={DS.slate500} />
            </TouchableOpacity>
          </View>
          <View style={s.card}>
            <View style={s.qrBox}>
              <QRCode
                value={url}
                size={200}
                getRef={(r: any) => (qrRef.current = r)}
                logo={logoUri ? { uri: logoUri } : APP_LOGO}
                logoSize={46}
                logoBackgroundColor={DS.onInk}
                logoMargin={4}
                logoBorderRadius={10}
                ecl="H"
              />
            </View>
            <Text style={s.name} numberOfLines={1}>{shopName}</Text>
            <Text style={s.link} numberOfLines={1}>{url.replace("https://", "")}</Text>
          </View>
          <Text style={s.help}>
            {t("Les clients scannent ce code : l'app ouvre votre boutique, ou le store si l'app n'est pas installée.")}
          </Text>
          <View style={s.actions}>
            <TouchableOpacity style={[s.btn, s.btnSoft]} onPress={exportQr} disabled={busy}>
              <Text style={[s.btnText, { color: DS.ink }]}>{t("Partager")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, s.btnMain]} onPress={exportQr} disabled={busy}>
              <Text style={[s.btnText, { color: DS.onInk }]}>{t("Télécharger")}</Text>
            </TouchableOpacity>
          </View>
          <SafeAreaDebugBand />
        </Animated.View>
      </View>
      <GlobalToastHost modal />
    </Modal>
  );
};

const s = StyleSheet.create({
  backdrop: { backgroundColor: DS.inkGlass },
  sheet: { backgroundColor: DS.onInk, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  title: { fontSize: 16, fontWeight: "bold", color: DS.ink },
  close: { width: 32, height: 32, borderRadius: 16, backgroundColor: DS.slate100, alignItems: "center", justifyContent: "center" },
  card: { borderRadius: 20, backgroundColor: DS.slate50, borderWidth: 1, borderColor: DS.slate100, padding: 22, alignItems: "center", gap: 12 },
  qrBox: { padding: 12, backgroundColor: DS.onInk, borderRadius: 16 },
  name: { fontSize: 15, fontWeight: "700", color: DS.ink },
  link: { fontSize: 11, color: DS.slate500 },
  help: { marginTop: 12, marginBottom: 16, marginHorizontal: 2, fontSize: 12, color: DS.slate500, lineHeight: 17 },
  actions: { flexDirection: "row", gap: 8 },
  btn: { flex: 1, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  btnSoft: { backgroundColor: DS.slate100 },
  btnMain: { backgroundColor: DS.accent },
  btnText: { fontSize: 13, fontWeight: "700" },
});
