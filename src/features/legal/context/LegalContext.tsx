import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { acceptLegal, fetchLegalDocument, fetchLegalStatus, LegalDocument, LegalStatus, saveMerchantAdhesion } from "../services/legalService";

// Dernière version OUVERTE dans le Profil (confort par appareil) : pastille
// « mise à jour » sur la ligne du menu tant qu'une version plus récente n'a
// pas été ouverte.
const SEEN_KEY = "legal_seen_version";

interface LegalContextValue {
  status: LegalStatus | null;
  document: LegalDocument | null;
  /** Une version plus récente que celle ouverte (et acceptée) existe. */
  hasUpdate: boolean;
  loadDocument: () => Promise<LegalDocument | null>;
  accept: () => Promise<boolean>;
  /** Annexe 3 : qualite (texte libre) + denomination facultative. */
  submitAdhesion: (representativeRole: string, legalName: string) => Promise<boolean>;
  markSeen: () => void;
}

const LegalContext = createContext<LegalContextValue | null>(null);

/**
 * Conditions d'utilisation et confidentialité : statut d'acceptation de
 * l'utilisateur connecté (`GET /legal/status`) et texte en vigueur. Source de
 * vérité pour l'écran d'acceptation et la ligne du menu compte (R6).
 */
export function LegalProvider({ children }: { children: React.ReactNode }) {
  const { user, userData } = useAuth();
  const uid = user?.uid;
  // Boutique creee : le statut est relu (merchantAdhesionPending).
  const shopId = userData?.fastFoodId;
  const [status, setStatus] = useState<LegalStatus | null>(null);
  const [document, setDocument] = useState<LegalDocument | null>(null);
  const [seen, setSeen] = useState<number | null>(null);

  useEffect(() => {
    setStatus(null);
    if (!uid) return;
    fetchLegalStatus().then(setStatus).catch(() => {});
    AsyncStorage.getItem(SEEN_KEY)
      .then(v => setSeen(v ? Number(v) : null))
      .catch(() => {});
  }, [uid, shopId]);

  const loadDocument = useCallback(async () => {
    try {
      const doc = await fetchLegalDocument();
      setDocument(doc);
      return doc;
    } catch {
      return null;
    }
  }, []);

  const accept = useCallback(async () => {
    const doc = document ?? (await loadDocument());
    if (!doc) return false;
    try {
      setStatus(await acceptLegal(doc.version));
      setSeen(doc.version);
      AsyncStorage.setItem(SEEN_KEY, String(doc.version)).catch(() => {});
      return true;
    } catch {
      // Version dépassée entre-temps : on recharge le texte et le statut.
      await loadDocument();
      fetchLegalStatus().then(setStatus).catch(() => {});
      return false;
    }
  }, [document, loadDocument]);

  const submitAdhesion = useCallback(
    async (representativeRole: string, legalName: string) => {
      const fastFoodId = status?.merchantAdhesionPending;
      const doc = document ?? (await loadDocument());
      if (!fastFoodId || !doc) return false;
      try {
        setStatus(await saveMerchantAdhesion({ fastFoodId, version: doc.version, representativeRole, legalName }));
        return true;
      } catch {
        await loadDocument();
        return false;
      }
    },
    [status?.merchantAdhesionPending, document, loadDocument],
  );

  const markSeen = useCallback(() => {
    const v = status?.latestVersion;
    if (v == null) return;
    setSeen(v);
    AsyncStorage.setItem(SEEN_KEY, String(v)).catch(() => {});
  }, [status?.latestVersion]);

  const latest = status?.latestVersion ?? null;
  const known = Math.max(seen ?? 0, status?.acceptedVersion ?? 0);
  const hasUpdate = latest != null && !status?.mustAccept && latest > known;

  return (
    <LegalContext.Provider value={{ status, document, hasUpdate, loadDocument, accept, submitAdhesion, markSeen }}>
      {children}
    </LegalContext.Provider>
  );
}

export const useLegal = (): LegalContextValue => {
  const ctx = useContext(LegalContext);
  if (!ctx) throw new Error("useLegal doit être utilisé dans LegalProvider");
  return ctx;
};
