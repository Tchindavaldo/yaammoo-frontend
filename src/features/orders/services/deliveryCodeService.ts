// Code de livraison d'une commande (contenu du QR code client). Backend :
// GET /order/:orderId/delivery-code -> { code, text, whatsappLink } (client de la commande seulement).
// Le QR prouve la remise, il ne paie rien. Voir architecture/orders-client.md (tab Livreur).
import axios from "axios";
import { Config } from "@/src/api/config";
import { auth } from "@/src/services/firebase";

export interface DeliveryLink {
  code: string;
  /** Message « LIVRÉ <orderId> <code> » prérempli dans WhatsApp. */
  text: string;
  /** https://wa.me/<numéro Yaammoo>?text=… : scanné avec l'appareil photo par le marchand sans app. */
  whatsappLink: string | null;
}

// Le code ne change jamais pour une commande : gardé en mémoire le temps de la session.
const cache = new Map<string, DeliveryLink>();

export async function getDeliveryLink(orderId: string): Promise<DeliveryLink> {
  const hit = cache.get(orderId);
  if (hit) return hit;
  const idToken = await auth.currentUser?.getIdToken();
  const { data } = await axios.get(`${Config.apiUrl}/order/${orderId}/delivery-code`, {
    headers: { "ngrok-skip-browser-warning": "true", Authorization: `Bearer ${idToken}` },
  });
  const link: DeliveryLink = { code: data.code, text: data.text, whatsappLink: data.whatsappLink ?? null };
  cache.set(orderId, link);
  return link;
}
