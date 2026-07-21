// ============================================================================
// useBonusV2 — récupération des bonus + réclamation (claim)
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
  redeemed: raw?.redeemed ?? false,
  usageLimit: raw?.usageLimit,
  usageCount: raw?.usageCount,
  remainingUses: raw?.remainingUses,
  code: raw?.code ?? null,
  rewardCredentials: raw?.rewardCredentials ?? null,
  expiresAt: raw?.expiresAt ?? null,
  expired: raw?.expired ?? false,
  fastFoodBonusCount: raw?.fastFoodBonusCount,
  userClaimedCount: raw?.userClaimedCount,
  totalClaimedCount: raw?.totalClaimedCount,
  requestStatus: raw?.requestStatus,
  bonusStats: raw?.bonusStats,
});

export const useBonusV2 = () => {
  const { userData } = useAuth();
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  // `true` dès le départ : le premier fetch part au montage, sans ça la page
  // affiche un écran vide le temps que `fetchBonuses` passe `loading` à true.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Statut local de réclamation par bonusId (optimiste). */
  const [claims, setClaims] = useState<Record<string, BonusClaimStatus>>({});

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
              ...(p.expiresAt !== undefined && { expiresAt: p.expiresAt }),
            },
      ),
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

  return {
    bonuses,
    loading,
    error,
    claims,
    claimBonus,
    /** Injection depuis les events socket `bonus.claimed` / `bonus.reward_credentials`. */
    applyClaimPayload,
    /** Injection depuis l'event socket `bonus.stats_updated`. */
    applyBonusStats,
    refresh: fetchBonuses,
  };
};
