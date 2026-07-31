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
import { Video as VideoCompressor, getVideoMetaData } from "react-native-compressor";
import type { Bonus } from "../types/bonus.types";

const HEADERS = { "ngrok-skip-browser-warning": "true" };

/**
 * Au-delà de ce poids, la vidéo est recompressée avant l'envoi. En dessous,
 * elle part telle quelle : recompresser une petite vidéo coûte du temps CPU
 * pour un gain nul, et dégrade l'image pour rien.
 */
const COMPRESS_THRESHOLD_MB = 7;
const MB = 1024 * 1024;

/**
 * Part de la barre de progression allouée à la compression. Compression et
 * envoi sont SÉQUENTIELS (le fichier doit exister en entier avant le multipart)
 * mais l'utilisateur ne voit qu'une seule barre continue de 0 à 100.
 */
const COMPRESS_SHARE = 0.4;

/** Étape courante de l'envoi — pilote le libellé affiché sous le bouton. */
export type UploadPhase = "compressing" | "uploading";

export interface UploadState {
  phase: UploadPhase;
  /** Progression globale (compression + envoi) sur 0 → 1. */
  progress: number;
}

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
 * Télécharge le flyer d'un bonus (partage natif) et envoie la vidéo de preuve.
 *
 * `downloading` pilote un spinner indéterminé — l'API fichier d'Expo v19
 * n'expose pas la progression d'un téléchargement. `uploading` porte en
 * revanche une vraie progression, compression comprise. `error` porte le
 * message d'échec commun aux deux opérations.
 */
export const useBonusFlyer = () => {
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});
  // Absent de la map = aucun envoi en cours pour ce bonus.
  const [uploading, setUploading] = useState<Record<string, UploadState>>({});
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
      const setPhase = (phase: UploadPhase, progress: number) =>
        setUploading((s) => ({ ...s, [bonus.id]: { phase, progress } }));

      setPhase("compressing", 0);
      try {
        // --- 1. Compression, seulement si la vidéo dépasse le seuil ---------
        // `size` est absent de l'asset sur certaines plateformes : on interroge
        // alors le fichier. Taille inconnue = on ne compresse pas plutôt que de
        // compresser à l'aveugle.
        let uri = asset.uri;
        let bytes = asset.fileSize;
        if (typeof bytes !== "number") {
          bytes = await getVideoMetaData(asset.uri)
            .then((m) => m.size)
            .catch(() => undefined);
        }

        if (typeof bytes === "number" && bytes > COMPRESS_THRESHOLD_MB * MB) {
          uri = await VideoCompressor.compress(
            asset.uri,
            {
              compressionMethod: "auto",
              // La lib ignore d'elle-même les fichiers sous ce poids : filet de
              // sécurité si notre propre mesure de taille était fausse.
              minimumFileSizeForCompress: COMPRESS_THRESHOLD_MB,
              // Sans diviseur, le natif émet un événement par pourcent et
              // sature le pont JS sur les vidéos longues.
              progressDivider: 5,
            },
            (p) => setPhase("compressing", p * COMPRESS_SHARE),
          );
        }

        // --- 2. Envoi multipart --------------------------------------------
        setPhase("uploading", COMPRESS_SHARE);
        const form = new FormData();
        // RN attend cette forme d'objet (et non un Blob) pour un fichier local.
        form.append("proofVideo", {
          uri,
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
            // `total` peut manquer selon la plateforme : on garde alors la
            // dernière valeur connue plutôt que de faire reculer la barre.
            onUploadProgress: (e) => {
              if (!e.total) return;
              const sent = e.loaded / e.total;
              setPhase("uploading", COMPRESS_SHARE + sent * (1 - COMPRESS_SHARE));
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
        setUploading((s) => {
          const next = { ...s };
          delete next[bonus.id];
          return next;
        });
      }
    },
    [],
  );

  return { downloadFlyer, downloading, uploadProof, uploading, error };
};
