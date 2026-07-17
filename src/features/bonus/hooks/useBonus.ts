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
import { useAuth } from "@/src/features/auth/context/AuthContext";
import type {
  Bonus,
  BonusCriteria,
  BonusClaimStatus,
} from "../types/bonus.types";
import { DEFAULT_BONUSES, USE_DEFAULT_BONUSES } from "../config/defaultBonuses";

const HEADERS = { "ngrok-skip-browser-warning": "true" };

/**
 * Déduit un critère d'éligibilité à partir d'un payload libre. Supporte la forme
 * canonique (`criteria`) ET des formes héritées (`order_count`, `type` en
 * `*_bonus`, `minOrderAmount`…). Défaut : bonus de bienvenue (toujours éligible).
 */
const inferCriteria = (raw: any): BonusCriteria => {
  if (raw?.criteria?.kind) return raw.criteria;

  const type = String(raw?.type || "").toLowerCase();
  const fastFoodId = raw?.fastFoodId ?? raw?.criteria?.fastFoodId;

  if (typeof raw?.order_count === "number" && raw.order_count > 0)
    return { kind: "order_count", target: raw.order_count, fastFoodId };
  if (typeof raw?.orderCount === "number" && raw.orderCount > 0)
    return { kind: "order_count", target: raw.orderCount, fastFoodId };
  if (typeof raw?.minOrderAmount === "number" && raw.minOrderAmount > 0)
    return { kind: "amount_spent", target: raw.minOrderAmount, fastFoodId };
  if (type.includes("welcome")) return { kind: "welcome" };

  return { kind: "welcome" };
};

/** Convertit un bonus backend (forme libre) en forme canonique tolérante. */
export const normalizeBonus = (raw: any): Bonus => {
  const data = raw?.data && typeof raw.data === "object" ? raw.data : raw;
  return {
    id: String(raw?.id ?? data?.id ?? Math.random().toString(36).slice(2)),
    type: String(raw?.type ?? data?.type ?? "generic").toLowerCase(),
    name: raw?.name ?? data?.name ?? "Bonus",
    description: raw?.description ?? data?.description ?? "",
    reward: raw?.reward ??
      data?.reward ?? {
        value: raw?.value ?? raw?.amount ?? data?.value ?? data?.amount,
      },
    criteria: inferCriteria({ ...data, ...raw }),
    isFastFoodBonus: !!(raw?.isFastFoodBonus ?? data?.isFastFoodBonus ?? raw?.fastFoodId),
    fastFoodName: raw?.fastFoodName ?? data?.fastFoodName,
    active: raw?.active ?? data?.active ?? true,
    redeemed: raw?.redeemed ?? data?.redeemed ?? false,
    validUntil: raw?.validUntil ?? data?.validUntil,
    createdAt: raw?.createdAt ?? data?.createdAt,
    claimDuration: raw?.claimDuration ?? data?.claimDuration,
    claimedAt: raw?.claimedAt ?? data?.claimedAt,
    usageLimit: raw?.usageLimit ?? data?.usageLimit,
    usageCount: raw?.usageCount ?? data?.usageCount,
    fastFoodBonusCount: raw?.fastFoodBonusCount ?? data?.fastFoodBonusCount,
    userClaimedCount: raw?.userClaimedCount ?? data?.userClaimedCount,
    totalClaimedCount: raw?.totalClaimedCount ?? data?.totalClaimedCount,
    requestStatus: raw?.requestStatus ?? data?.requestStatus,
  };
};

export const useBonus = () => {
  const { userData } = useAuth();
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Statut local de réclamation par bonusId (optimiste). */
  const [claims, setClaims] = useState<Record<string, BonusClaimStatus>>({});

  const fetchBonuses = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      setError(null);
      const res = await axios.get(`${Config.apiUrl}/bonus/all`, { headers: HEADERS });
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
  }, [userData, fetchBonuses]);

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
        await axios.post(
          `${Config.apiUrl}/bonus-request`,
          {
            userId: userData.uid,
            bonusId: bonus.id,
            bonusType: bonus.type,
            status: ["pending"],
          },
          { headers: HEADERS },
        );
        setClaims((c) => ({ ...c, [bonus.id]: "pending" }));
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
    refresh: fetchBonuses,
  };
};
