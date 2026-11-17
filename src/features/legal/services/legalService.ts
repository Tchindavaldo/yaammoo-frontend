import axios from "axios";
import { Config } from "@/src/api/config";

/** Texte en vigueur (CGU + confidentialité), servi par `GET /legal/current`. */
export interface LegalDocument {
  version: number;
  title: string;
  content: string;
  requiresAcceptance: boolean;
  publishedAt: string;
}

/** `GET /legal/status` : `mustAccept` = écran d'acceptation à afficher. */
export interface LegalStatus {
  latestVersion: number | null;
  publishedAt: string | null;
  acceptedVersion: number | null;
  acceptedAt: string | null;
  mustAccept: boolean;
  /** Id de la boutique du compte sans formulaire d'adhesion (Annexe 3) : bottom sheet obligatoire. */
  merchantAdhesionPending?: string | null;
}

export const fetchLegalDocument = async (): Promise<LegalDocument> => {
  const { data } = await axios.get(`${Config.apiUrl}/legal/current`);
  return data.data;
};

export const fetchLegalStatus = async (): Promise<LegalStatus> => {
  const { data } = await axios.get(`${Config.apiUrl}/legal/status`);
  return data.data;
};

export const acceptLegal = async (version: number): Promise<LegalStatus> => {
  const { data } = await axios.post(`${Config.apiUrl}/legal/accept`, { version });
  return data.data;
};

/** Formulaire d'adhesion du Marchand (Annexe 3), renvoie le nouveau statut. */
export const saveMerchantAdhesion = async (body: { fastFoodId: string; version: number; representativeRole: string; legalName: string }): Promise<LegalStatus> => {
  const { data } = await axios.post(`${Config.apiUrl}/legal/merchant-adhesion`, body);
  return data.data;
};
