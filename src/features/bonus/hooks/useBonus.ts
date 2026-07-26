// ============================================================================
// useBonus — récupération des bonus + réclamation (claim)
// ----------------------------------------------------------------------------
// GET  /bonus/all      → liste des bonus disponibles (forme libre côté backend)
// POST /bonus-request  → réclame un bonus (flux request → approbation)
// normalizeBonus() rend l'UI robuste aux formes partielles / héritées.
// ============================================================================
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Config } from "@/src/api/config";
import { auth } from "@/src/services/firebase";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import type {
  Bonus,
  BonusCriteria,
  BonusClaimStatus,
} from "../types/bonus.types";
import { DEFAULT_BONUSES, USE_DEFAULT_BONUSES } from "../config/defaultBonuses";

const HEADERS = { "ngrok-skip-browser-warning": "true" };

/**
 * Headers authentifiés : le token est relu à CHAQUE appel (getIdToken sert le cache
 * s'il est valide, régénère sinon). Ne jamais le mémoriser dans une variable.
 */
const authHeaders = async () => {
  const idToken = await auth.currentUser?.getIdToken();
  return { ...HEADERS, Authorization: `Bearer ${idToken}` };
};

/**
 * Critère d'éligibilité. Le backend envoie la forme canonique
 * (`criteria: { kind, period?, target? }`) ; on la reprend telle quelle en
 * rattachant le `fastFoodId` du bonus. Absent → bienvenue (toujours éligible).
 */
const readCriteria = (raw: any): BonusCriteria => {
  const fastFoodId = raw?.fastFoodId ?? undefined;
  if (raw?.criteria?.kind) return { ...raw.criteria, fastFoodId };
  return { kind: "welcome", fastFoodId };
};

/** Convertit un bonus backend en forme canonique. */
export const normalizeBonus = (raw: any): Bonus => ({
  id: String(raw?.id ?? Math.random().toString(36).slice(2)),
  type: String(raw?.type ?? "generic").toLowerCase(),
  name: raw?.name ?? "Bonus",
  description: raw?.description ?? "",
  criteria: readCriteria(raw),
  fastFoodId: raw?.fastFoodId ?? null,
  fastFoodName: raw?.fastFoodName,
  active: raw?.active ?? true,
  createdAt: raw?.createdAt,
  claimDuration: raw?.claimDuration,
  claimedAt: raw?.claimedAt,
  startsAt: raw?.startsAt ?? null,
  redeemed: raw?.redeemed ?? false,
  usageLimit: raw?.usageLimit,
  usageCount: raw?.usageCount,
  remainingUses: raw?.remainingUses,
  code: raw?.code ?? null,
  rewardCredentials: raw?.rewardCredentials ?? null,
  expiresAt: raw?.expiresAt ?? null,
  expired: raw?.expired ?? false,
  armed: raw?.armed ?? false,
  fastFoodBonusCount: raw?.fastFoodBonusCount,
  userClaimedCount: raw?.userClaimedCount,
  totalClaimedCount: raw?.totalClaimedCount,
  requestStatus: raw?.requestStatus,
  bonusStats: raw?.bonusStats,
});

export const useBonus = () => {
  const { userData } = useAuth();
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  // `true` dès le départ : le premier fetch part au montage, sans ça la page
  // affiche un écran vide le temps que `fetchBonuses` passe `loading` à true.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Statut local de réclamation par bonusId (optimiste). */
  const [claims, setClaims] = useState<Record<string, BonusClaimStatus>>({});
  /** Requête d'armement en vol par bonusId (spinner sur le bouton Activer). */
  const [arming, setArming] = useState<Record<string, boolean>>({});

  const fetchBonuses = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      setError(null);
      const res = await axios.get(`${Config.apiUrl}/bonus/all`, {
        headers: await authHeaders(),
      });
      const list = res.data?.data ?? res.data ?? [];
      const normalized = Array.isArray(list) ? list.map(normalizeBonus) : [];
      // Fallback démo : si aucun bonus réel, on affiche les bonus par défaut
      // pour pouvoir visualiser/ajuster l'interface.
      setBonuses(normalized.length > 0 ? normalized : USE_DEFAULT_BONUSES ? DEFAULT_BONUSES : []);
    } catch (e: any) {
      console.error("Erreur chargement bonus:", e?.message);
      // En cas d'échec réseau, on retombe aussi sur les bonus de démo.
      if (USE_DEFAULT_BONUSES) {
        setBonuses(DEFAULT_BONUSES);
      } else if (!quiet) {
        setError("Impossible de charger les bonus");
      }
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userData) fetchBonuses();
    // Pas d'utilisateur (déconnecté / session expirée) : aucun fetch ne partira,
    // il faut donc lever `loading` nous-mêmes, sinon le squelette tourne à vide.
    else setLoading(false);
  }, [userData, fetchBonuses]);

  /**
   * Applique le solde recalculé par le backend : une map { bonusId → stats }
   * couvrant TOUS les bonus, chacun selon sa portée (plateforme = toutes les
   * commandes, fastfood = ses commandes seules).
   *
   * Pot commun : réclamer chez un fastfood décrémente aussi le solde plateforme
   * et inversement — d'où une map globale plutôt qu'une entrée isolée.
   *
   * Sources : event `bonus.stats_updated` et réponse HTTP du claim (redondants
   * à dessein, si le socket est déconnecté). Idempotent : appliquer deux fois
   * la même map ne change rien.
   */
  const applyBonusStats = useCallback((statsMap: any) => {
    if (!statsMap || typeof statsMap !== "object") return;
    setBonuses((list) =>
      list.map((b) => (statsMap[b.id] ? { ...b, bonusStats: statsMap[b.id] } : b)),
    );
  }, []);

  /**
   * Applique un payload de claim/livraison sur le bonus concerné.
   * Partagé par la réponse HTTP du claim et les events `bonus.claimed` /
   * `bonus.reward_credentials` — même forme pour les trois. Seuls les champs présents
   * écrasent l'existant (`bonus.claimed` n'envoie pas `rewardCredentials`).
   *
   * Le solde n'est PAS traité ici : il arrive sous forme de map globale via
   * `applyBonusStats` — un seul chemin fait autorité dessus.
   */
  const applyClaimPayload = useCallback((p: any) => {
    const id = p?.bonusId;
    if (!id) return;
    setBonuses((list) =>
      list.map((b) =>
        b.id !== id
          ? b
          : {
              ...b,
              ...(p.requestStatus !== undefined && {
                requestStatus: p.requestStatus,
              }),
              ...(p.code !== undefined && { code: p.code }),
              ...(p.rewardCredentials !== undefined && {
                rewardCredentials: p.rewardCredentials,
              }),
              ...(p.claimedAt !== undefined && { claimedAt: p.claimedAt }),
              ...(p.startsAt !== undefined && { startsAt: p.startsAt }),
              ...(p.expiresAt !== undefined && { expiresAt: p.expiresAt }),
            },
      ),
    );
  }, []);

  /**
   * `bonus.redeemed` — une utilisation du code vient d'être consommée. Le
   * payload porte les compteurs recalculés par le backend, on les applique tels
   * quels.
   *
   * ÉPUISEMENT (`redeemed: true` / plus d'utilisation restante) : le bonus doit
   * repartir sur ses CRITÈRES d'éligibilité, comme s'il n'avait jamais été
   * réclamé. On remet donc `requestStatus: "none"` et on efface ce qui a été
   * délivré (code, identifiants, échéance) — sans quoi la ligne continuerait
   * d'afficher « Bonus validé » avec les boutons Activer/Copier sur un code mort.
   * Le backend fait de même de son côté ; on l'anticipe ici car le payload de cet
   * event ne porte pas `requestStatus`, et attendre un refetch laisserait l'UI
   * dans un état incohérent.
   */
  const applyRedeemedPayload = useCallback((p: any) => {
    const id = p?.bonusId;
    if (!id) return;
    setBonuses((list) =>
      list.map((b) => {
        if (b.id !== id) return b;
        const next: Bonus = {
          ...b,
          ...(p.usageCount !== undefined && { usageCount: p.usageCount }),
          ...(p.usageLimit !== undefined && { usageLimit: p.usageLimit }),
          ...(p.remainingUses !== undefined && {
            remainingUses: p.remainingUses,
          }),
          ...(p.redeemed !== undefined && { redeemed: p.redeemed }),
          ...(p.expiresAt !== undefined && { expiresAt: p.expiresAt }),
        };
        // Épuisé : on se fie à `redeemed`, avec `remainingUses` en garde-fou.
        const exhausted =
          next.redeemed === true ||
          (typeof next.remainingUses === "number" && next.remainingUses <= 0);
        if (!exhausted) return next;
        return {
          ...next,
          requestStatus: "none",
          // `redeemed` est REMIS À FALSE volontairement : il signifie « code en
          // cours d'utilisation, épuisé » et pilote l'état « Utilisé » qui
          // bloquerait `isEligible`. Le cycle étant terminé, le bonus redevient
          // un bonus ordinaire jugé sur ses seules stats.
          redeemed: false,
          usageCount: 0,
          remainingUses: undefined,
          code: null,
          rewardCredentials: null,
          claimedAt: null,
          startsAt: null,
          expiresAt: null,
          // Un bonus épuisé ne peut plus être armé : l'offre ne s'applique plus.
          armed: false,
        };
      }),
    );
  }, []);

  /** Réclame un bonus. Optimiste : passe le statut local à "pending" au succès. */
  const claimBonus = useCallback(
    async (bonus: Bonus): Promise<{ success: boolean; message?: string }> => {
      if (!userData) return { success: false, message: "Non connecté" };
      setClaims((c) => ({ ...c, [bonus.id]: "posting" }));
      // Bonus de démo : pas d'appel réseau, on simule le succès pour l'UI.
      if (bonus.id.startsWith("mock-")) {
        await new Promise((r) => setTimeout(r, 500));
        setClaims((c) => ({ ...c, [bonus.id]: "pending" }));
        return { success: true };
      }
      try {
        const res = await axios.post(
          `${Config.apiUrl}/bonus/${bonus.id}/claim`,
          {},
          { headers: await authHeaders() },
        );
        // Le backend renvoie l'état résultant : on l'applique tel quel, sans
        // refetch. Redondant avec les sockets, mais indispensable si la socket
        // est déconnectée au moment du claim (les deux sont idempotents).
        const payload = res.data?.data ?? res.data;
        applyBonusStats(payload?.bonusStats);
        applyClaimPayload(payload);
        setClaims((c) => ({ ...c, [bonus.id]: "idle" }));
        return { success: true };
      } catch (e: any) {
        setClaims((c) => ({ ...c, [bonus.id]: "error" }));
        return {
          success: false,
          message: e?.response?.data?.message || "Échec de la demande",
        };
      }
    },
    [userData],
  );

  /**
   * Applique l'état d'armement renvoyé par le backend : le bonus visé prend
   * `armed`, et les bonus qu'il recouvre (`disarmedBonusIds`) sont désarmés.
   * Un seul chemin d'écriture pour la réponse HTTP comme pour un futur event.
   */
  const applyArmPayload = useCallback((p: any) => {
    const id = p?.bonusId;
    if (!id) return;
    const disarmed: string[] = Array.isArray(p?.disarmedBonusIds)
      ? p.disarmedBonusIds
      : [];
    setBonuses((list) =>
      list.map((b) => {
        if (b.id === id) return { ...b, armed: !!p.armed };
        if (disarmed.includes(b.id)) return { ...b, armed: false };
        return b;
      }),
    );
  }, []);

  /**
   * Arme / désarme un bonus. `POST /bonus/:id/arm` pour armer,
   * `DELETE /bonus/:id/arm` pour désarmer — sans body, juste le Bearer token.
   * Optimiste : l'UI bascule tout de suite, et on repart de l'état backend
   * (qui seul connaît les bonus auto-désarmés) à la réponse ; en cas d'échec on
   * restaure l'état d'origine.
   */
  const armBonus = useCallback(
    async (
      bonus: Bonus,
      next = !bonus.armed,
    ): Promise<{ success: boolean; message?: string }> => {
      if (!userData) return { success: false, message: "Non connecté" };
      const previous = !!bonus.armed;
      setArming((a) => ({ ...a, [bonus.id]: true }));
      setBonuses((list) =>
        list.map((b) => (b.id === bonus.id ? { ...b, armed: next } : b)),
      );
      // Bonus de démo : pas d'appel réseau, la bascule optimiste fait foi.
      if (bonus.id.startsWith("mock-")) {
        setArming((a) => ({ ...a, [bonus.id]: false }));
        return { success: true };
      }
      try {
        const url = `${Config.apiUrl}/bonus/${bonus.id}/arm`;
        const headers = await authHeaders();
        const res = next
          ? await axios.post(url, {}, { headers })
          : await axios.delete(url, { headers });
        applyArmPayload(res.data?.data ?? res.data);
        return { success: true };
      } catch (e: any) {
        // Rollback : on remet l'état d'avant la bascule optimiste.
        setBonuses((list) =>
          list.map((b) => (b.id === bonus.id ? { ...b, armed: previous } : b)),
        );
        return {
          success: false,
          message:
            e?.response?.data?.message ||
            (next ? "Échec de l'activation" : "Échec de la désactivation"),
        };
      } finally {
        setArming((a) => ({ ...a, [bonus.id]: false }));
      }
    },
    [userData, applyArmPayload],
  );

  return {
    bonuses,
    loading,
    error,
    claims,
    claimBonus,
    arming,
    armBonus,
    /** Injection depuis une réponse/event d'armement. */
    applyArmPayload,
    /** Injection depuis l'event socket `bonus.redeemed` (consommation du code). */
    applyRedeemedPayload,
    /** Injection depuis les events socket `bonus.claimed` / `bonus.reward_credentials`. */
    applyClaimPayload,
    /** Injection depuis l'event socket `bonus.stats_updated`. */
    applyBonusStats,
    refresh: fetchBonuses,
  };
};
