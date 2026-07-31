// ============================================================================
// useBonusFlyer — téléchargement du flyer d'un bonus `status_view`
// ----------------------------------------------------------------------------
// GET /bonus/:id/flyer → { data: { flyerUrl, claimableAt, downloadCount, … } }
// Le fichier est ensuite rapatrié localement puis passé à la feuille de partage
// native, qui offre au user « Enregistrer l'image » (galerie) ou l'envoi direct
// vers WhatsApp — c'est là qu'il postera son statut.
// ============================================================================
import { Config } from "@/src/api/config";
import { auth } from "@/src/services/firebase";
import axios from "axios";
import { File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import { useCallback, useState } from "react";
import type { Bonus } from "../types/bonus.types";

const HEADERS = { "ngrok-skip-browser-warning": "true" };

/** Headers authentifiés — token relu à chaque appel (cf. useBonus.ts). */
const authHeaders = async () => {
  const idToken = await auth.currentUser?.getIdToken();
  return { ...HEADERS, Authorization: `Bearer ${idToken}` };
};

/** Payload utile renvoyé par `GET /bonus/:id/flyer`. */
export interface FlyerPayload {
  bonusId: string;
  flyerUrl: string;
  downloadedAt?: string;
  lastDownloadedAt?: string;
  downloadCount?: number;
  claimDelayHours?: number;
  /** ISO8601 — date à partir de laquelle le bonus devient réclamable. */
  claimableAt?: string;
}

/** Payload renvoyé par `POST /bonus/:id/claim` (identique au socket `bonus.claimed`). */
export interface ClaimPayload {
  bonusId: string;
  requestId?: string;
  requestStatus?: string;
  code?: string | null;
  claimedAt?: string | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  proofVideoUrl?: string;
  bonusStats?: Bonus["bonusStats"];
}

/** Déduit un nom de fichier de l'URL, avec repli sur une extension .png. */
const fileNameFor = (bonus: Bonus, url: string): string => {
  const ext = url.split("?")[0].split(".").pop();
  const safe = ext && ext.length <= 4 ? ext : "png";
  return `flyer-${bonus.id}.${safe}`;
};

/**
 * Télécharge le flyer d'un bonus puis ouvre le partage natif.
 * `downloading` pilote le spinner du bouton ; `error` porte le message d'échec.
 */
export const useBonusFlyer = () => {
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const downloadFlyer = useCallback(
    async (bonus: Bonus): Promise<FlyerPayload | null> => {
      setDownloading((s) => ({ ...s, [bonus.id]: true }));
      setError(null);
      try {
        const res = await axios.get(
          `${Config.apiUrl}/bonus/${bonus.id}/flyer`,
          { headers: await authHeaders() },
        );
        const data: FlyerPayload | undefined = res.data?.data;
        if (!data?.flyerUrl) throw new Error("Flyer indisponible.");

        // Rapatrié en cache : la feuille de partage exige un fichier local.
        // Un flyer déjà téléchargé est écrasé, sinon `downloadFileAsync` échoue.
        const target = new File(Paths.cache, fileNameFor(bonus, data.flyerUrl));
        if (target.exists) target.delete();
        const file = await File.downloadFileAsync(data.flyerUrl, target);

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(file.uri, {
            mimeType: "image/png",
            dialogTitle: bonus.name,
          });
        }
        return data;
      } catch (e: any) {
        setError(
          e?.response?.data?.message ??
            e?.message ??
            "Téléchargement du flyer impossible.",
        );
        return null;
      } finally {
        setDownloading((s) => ({ ...s, [bonus.id]: false }));
      }
    },
    [],
  );

  /**
   * Réclamation d'un bonus `status_view` : le user choisit la vidéo attestant
   * les vues de son statut, envoyée en multipart à `POST /bonus/:id/claim`.
   *
   * Les contrôles backend (flyer téléchargé, délai écoulé) tournent AVANT le
   * stockage : un refus 400/409 est purement informatif, rien n'est conservé.
   * Retourne le payload du claim, ou null si annulé/échoué.
   */
  const uploadProof = useCallback(
    async (bonus: Bonus): Promise<ClaimPayload | null> => {
      setError(null);
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        quality: 1,
      });
      if (picked.canceled || !picked.assets?.length) return null;

      const asset = picked.assets[0];
      setUploading((s) => ({ ...s, [bonus.id]: true }));
      try {
        const form = new FormData();
        // RN attend cette forme d'objet (et non un Blob) pour un fichier local.
        form.append("proofVideo", {
          uri: asset.uri,
          name: asset.fileName ?? `proof-${bonus.id}.mp4`,
          type: asset.mimeType ?? "video/mp4",
        } as any);

        const res = await axios.post(
          `${Config.apiUrl}/bonus/${bonus.id}/claim`,
          form,
          {
            headers: {
              ...(await authHeaders()),
              "Content-Type": "multipart/form-data",
            },
          },
        );
        return res.data?.data ?? null;
      } catch (e: any) {
        setError(
          e?.response?.data?.message ??
            e?.message ??
            "Envoi de la preuve impossible.",
        );
        return null;
      } finally {
        setUploading((s) => ({ ...s, [bonus.id]: false }));
      }
    },
    [],
  );

  return { downloadFlyer, downloading, uploadProof, uploading, error };
};
