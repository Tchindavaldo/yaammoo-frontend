"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
// Zone droite de la tab « Livreur » (DriverInfoTab) : QR code de livraison (commande `delivering`)
// ou vélo figé + « Livré » (`delivered`). Côté client (`fetchLink`), le QR contient le lien WhatsApp
// « LIVRÉ <orderId> <code> » du backend : le marchand sans app le scanne avec l'appareil photo.
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { BikeAnimation } from "@/src/features/merchant/components/BikeAnimation";
import { getDeliveryLink } from "@/src/features/orders/services/deliveryCodeService";
import { DS } from "@/src/theme/ds";
import { t } from "@/src/i18n";
import { styles } from "./DriverInfoTab.styles";

interface Props {
  isDelivered: boolean;
  orderId: string;
  /** Contenu historique du QR (vue marchand, lecture seule). */
  fallbackValue: string;
  /** true (client) : QR = lien WhatsApp de validation, lu sur le backend. */
  fetchLink: boolean;
}

export function DeliveryStateCard({ isDelivered, orderId, fallbackValue, fetchLink }: Props) {
  const [link, setLink] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (isDelivered || !fetchLink) return;
    let alive = true;
    getDeliveryLink(orderId)
      .then((r) => {
        if (!alive) return;
        setLink(r.whatsappLink || r.text);
        setCode(r.code);
      })
      .catch((e) => {
        console.warn("[DeliveryStateCard] code de livraison :", e?.message);
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [orderId, isDelivered, fetchLink]);

  if (isDelivered) {
    return (
      <View style={styles.statePlaceholder}>
        {/* Commande livrée : vélo figé (plus d'animation, il est arrivé). */}
        <BikeAnimation paused />
        <Text style={styles.deliveredText}>{t("Livré")}</Text>
      </View>
    );
  }

  if (!fetchLink) {
    return (
      <View style={styles.statePlaceholder}>
        <QRCode value={fallbackValue} size={84} />
      </View>
    );
  }

  return (
    <View style={styles.statePlaceholder}>
      {link ? (
        <>
          <QRCode value={link} size={84} />
          {code ? <Text style={styles.deliveredText}>{code}</Text> : null}
        </>
      ) : failed ? (
        <Text style={styles.deliveredText}>{t("Code indisponible")}</Text>
      ) : (
        <ActivityIndicator size="small" color={DS.accent} />
      )}
    </View>
  );
}
