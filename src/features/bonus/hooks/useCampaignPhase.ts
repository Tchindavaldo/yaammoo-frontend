// ============================================================================
// useCampaignPhase — phase courante d'une campagne `status_view`
// ----------------------------------------------------------------------------
// Le message et l'action de la ligne de réclamation dépendent d'où l'on se
// trouve dans le calendrier : avant le téléchargement, le jour J, en attente de
// publication, ou en phase d'envoi de la preuve.
//
// ⚠️ `canDownload` / `canUpload` (backend) FONT AUTORITÉ sur les dates : les
// dates ne servent qu'à formuler le message. On ne recalcule jamais un droit
// depuis l'horloge du téléphone, qui peut être décalée.
// ============================================================================
import { useMemo } from "react";
import type { Bonus } from "../types/bonus.types";

export type CampaignPhase =
  /** Téléchargement pas encore ouvert (downloadDate à venir). */
  | "before_download"
  /** Le flyer est téléchargeable. */
  | "download"
  /** Flyer récupéré, publication à venir / en cours. */
  | "await_post"
  /** Le user doit envoyer sa vidéo de preuve. */
  | "upload"
  /** Aucun calendrier fourni — rendu générique. */
  | "none";

export interface CampaignInfo {
  phase: CampaignPhase;
  /** Titre de la ligne de réclamation. */
  title: string;
  /** Description affichée sous le titre. */
  desc: string;
  /** Libellé du bouton (null = pas de bouton propre à la campagne). */
  action: "download" | "upload" | null;
  /** Message de refus si l'action est tentée hors période (null = autorisée). */
  blockedReason: string | null;
}

const MS_DAY = 86_400_000;

/** Minuit local d'une date "YYYY-MM-DD" — évite le décalage UTC de `new Date()`. */
const parseDay = (ymd?: string): Date | null => {
  if (!ymd) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

/** Nombre de jours calendaires entre aujourd'hui et `target` (négatif = passé). */
const daysUntil = (target: Date, now: Date): number => {
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((target.getTime() - a) / MS_DAY);
};

/** "mardi 5 août" — repère lisible, sans l'année (campagnes courtes). */
const fmtDay = (d: Date): string =>
  d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

/** "17h" ou "17h30". */
const fmtHour = (iso?: string): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const h = d.getHours();
  const m = d.getMinutes();
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
};

/** "entre 17h et 20h" — vide si la fenêtre n'est pas fournie. */
const fmtWindow = (start?: string, end?: string): string => {
  const a = fmtHour(start);
  const b = fmtHour(end);
  return a && b ? ` entre ${a} et ${b}` : "";
};

/** Formule la proximité d'une échéance : aujourd'hui / demain / dans N jours. */
const whenText = (days: number, day: Date): string => {
  if (days === 0) return "aujourd'hui";
  if (days === 1) return "demain";
  if (days > 1 && days <= 6) return fmtDay(day);
  return `le ${fmtDay(day)}`;
};

/** Rappel de la date de publication, ajouté au message de téléchargement. */
const postReminder = (post: Date | null, days: number | null): string => {
  if (!post || days === null) return "";
  if (days === 0) return " À poster aujourd'hui.";
  if (days === 1) return " À poster demain.";
  return ` À poster ${whenText(days, post)}.`;
};

/**
 * Calcule la phase d'une campagne `status_view` et les textes associés.
 * Pur et testable : `now` est injectable.
 */
export const computeCampaignPhase = (
  bonus: Bonus,
  now: Date = new Date(),
): CampaignInfo => {
  const s = bonus.campaignSchedule;

  // Envoi de la preuve : prioritaire sur tout le reste du calendrier.
  if (bonus.canUpload) {
    const post = parseDay(s?.postDate);
    const window = fmtWindow(s?.postWindowStart, s?.postWindowEnd);
    return {
      phase: "upload",
      title: "Envoie ta preuve",
      desc: post
        ? `Publie le flyer en statut${window}, puis envoie la vidéo montrant les vues de ton statut du ${fmtDay(post)}.`
        : `Envoie la vidéo montrant les vues de ton statut${window}.`,
      action: "upload",
      blockedReason: null,
    };
  }

  const download = parseDay(s?.downloadDate);
  const post = parseDay(s?.postDate);
  const dDays = download ? daysUntil(download, now) : null;
  const pDays = post ? daysUntil(post, now) : null;
  const reminder = postReminder(post, pDays);

  // Pas de calendrier : on retombe sur le rendu générique du composant.
  if (!download && !post) {
    return {
      phase: "none",
      title: "",
      desc: "",
      action: bonus.canDownload === false ? null : "download",
      blockedReason: null,
    };
  }

  // Téléchargement pas encore ouvert. Le bouton reste ACTIF (demande produit) :
  // le clic déclenche un toast expliquant que ce n'est pas encore le jour.
  if (bonus.canDownload === false) {
    const when = download && dDays !== null ? whenText(dDays, download) : null;
    return {
      phase: "before_download",
      title: when ? `Téléchargement ${when}` : "Téléchargement bientôt ouvert",
      desc: when
        ? `Le flyer sera disponible ${when}.${reminder}`
        : `Le flyer n'est pas encore disponible.${reminder}`,
      action: "download",
      blockedReason: when
        ? `Le flyer sera disponible ${when}.`
        : "Le flyer n'est pas encore disponible.",
    };
  }

  // Publication passée / en cours mais rien à envoyer encore.
  if (pDays !== null && pDays <= 0 && post) {
    const window = fmtWindow(s?.postWindowStart, s?.postWindowEnd);
    return {
      phase: "await_post",
      title: pDays === 0 ? "Poste ton statut aujourd'hui" : "Statut à publier",
      desc:
        pDays === 0
          ? `Publie le flyer en statut${window}. Tu pourras ensuite envoyer ta preuve.`
          : `La publication était prévue le ${fmtDay(post)}.`,
      action: "download",
      blockedReason: null,
    };
  }

  // Téléchargement ouvert : le cas nominal.
  return {
    phase: "download",
    title:
      dDays === 0 ? "Télécharge ton flyer aujourd'hui" : "Télécharger le flyer",
    desc: `Récupère le flyer et publie-le en statut.${reminder}`,
    action: "download",
    blockedReason: null,
  };
};

/** Phase de campagne du bonus — recalculée si le bonus change. */
export const useCampaignPhase = (bonus: Bonus): CampaignInfo =>
  useMemo(() => computeCampaignPhase(bonus), [bonus]);
