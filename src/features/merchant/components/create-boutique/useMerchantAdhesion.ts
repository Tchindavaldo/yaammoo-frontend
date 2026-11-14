// Etat du formulaire d'adhesion du Marchand (Annexe 3) pour la creation de
// boutique : texte en vigueur (version), qualite, denomination, adresse, case.
// `save` est appele juste apres `POST /fastFood` ; son echec ne defait pas la
// boutique creee (journalise, l'acceptation est redemandee par l'ecran CGU).
import axios from "axios";
import { useEffect, useState } from "react";
import { Config } from "@/src/api/config";
import { t } from "@/src/i18n";
import { fetchLegalDocument, type LegalDocument } from "@/src/features/legal/services/legalService";
import type { RepresentativeRole } from "./MerchantAdhesionBlock";

export function useMerchantAdhesion() {
  const [document, setDocument] = useState<LegalDocument | null>(null);
  const [role, setRole] = useState<RepresentativeRole | null>(null);
  const [legalName, setLegalName] = useState("");
  const [address, setAddress] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [legalOpen, setLegalOpen] = useState(false);

  useEffect(() => {
    fetchLegalDocument().then(setDocument).catch(e => console.warn("CGU non chargees:", e));
  }, []);

  const validate = (): string | null => {
    if (!role) return t("Indiquez votre qualité (gérant, directeur ou propriétaire)");
    if (!address.trim()) return t("Indiquez l'adresse de la boutique");
    if (!accepted) return t("Cochez la case d'acceptation des conditions");
    if (!document) return t("Conditions indisponibles, réessayez dans un instant");
    return null;
  };

  const save = async (fastFoodId: string) => {
    if (!document || !role) return;
    await axios
      .post(`${Config.apiUrl}/legal/merchant-adhesion`, { fastFoodId, version: document.version, representativeRole: role, legalName: legalName.trim(), address: address.trim() })
      .catch(e => console.warn("Adhesion marchand non enregistree:", e?.response?.data || e));
  };

  return {
    document, role, setRole, legalName, setLegalName, address, setAddress, accepted, setAccepted,
    legalOpen, openLegal: () => setLegalOpen(true), closeLegal: () => setLegalOpen(false),
    validate, save,
  };
}
