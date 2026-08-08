import React from "react";
import { SupportThreadsSkeleton } from "./SupportThreadsSkeleton";

/**
 * Placeholder de la conversation pendant le `GET` des messages. Affiché AVANT
 * les textes d'accueil, les chips d'objet et la saisie : à l'ouverture d'un fil
 * existant, seul le squelette doit apparaître, pas l'état « Aucun message ».
 *
 * Reprend **le même rendu que le chargement de l'historique** (spinner centré) :
 * un motif unique pour toute la feature.
 */
export const SupportMessagesSkeleton: React.FC = () => (
  <SupportThreadsSkeleton />
);
