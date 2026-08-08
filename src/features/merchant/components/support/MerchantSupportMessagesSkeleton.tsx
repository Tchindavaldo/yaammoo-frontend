import React from "react";
import { MerchantSupportThreadsSkeleton } from "./MerchantSupportThreadsSkeleton";

/**
 * Placeholder de la conversation pendant le `GET` des messages, côté boutique.
 * Affiché AVANT les textes d'accueil et la barre de réponse : à l'ouverture
 * d'un fil, seul le squelette doit apparaître, pas l'état « Aucun message ».
 *
 * Reprend **le même rendu que le chargement de l'historique** (spinner centré) :
 * un motif unique pour toute la feature.
 */
export const MerchantSupportMessagesSkeleton: React.FC = () => (
  <MerchantSupportThreadsSkeleton />
);
