// Stats du hero marchand : GET /fastFood/:fastFoodId/stats (backend, fonction merchant_stats).
import axios from "axios";
import { useEffect, useState } from "react";
import { Config } from "@/src/api/config";
import { auth } from "@/src/services/firebase";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { showToast } from "@/src/services/globalToast";
import { t } from "@/src/i18n";
import { Bucket, ShopPeriod, bucketOf } from "./shopPeriod";

export interface StatsPoint {
  start: string;
  revenue: number;
  delivered: number;
  onSite: number;
  ongoing: number;
  cancelled: number;
  newClients: number;
  returning: number;
  delayMin: number | null;
}
export interface RankRow {
  name: string;
  count: number;
  amount?: number;
}
export interface MerchantStats {
  series: StatsPoint[];
  revenue: number;
  revenueToday: number;
  balance: number;
  orders: number;
  cancelled: number;
  funnel: { views: number; opens: number; carts: number; orders: number };
  delays: { prep: number | null; delivery: number | null; total: number | null };
  heatmap: { dow: number; hour: number; count: number }[];
  rankings: Record<"dishes" | "views" | "clients" | "drivers" | "zones", RankRow[]>;
}

export const EMPTY_STATS: MerchantStats = {
  series: [],
  revenue: 0,
  revenueToday: 0,
  balance: 0,
  orders: 0,
  cancelled: 0,
  funnel: { views: 0, opens: 0, carts: 0, orders: 0 },
  delays: { prep: null, delivery: null, total: null },
  heatmap: [],
  rankings: { dishes: [], views: [], clients: [], drivers: [], zones: [] },
};

export const money = (n: number) => `${Math.round(n).toLocaleString("fr-FR").replace(/ | /g, " ")} F`;
export const compact = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(".", ",")}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : `${Math.round(n)}`;

/** Charge les stats de la periode ; `version` change a chaque nouvelle reponse (relance l'animation). */
export function useMerchantStats(period: ShopPeriod): { stats: MerchantStats; bucket: Bucket; version: number } {
  const { userData } = useAuth();
  const fastFoodId = userData?.fastFoodId;
  const bucket = bucketOf(period);
  const [stats, setStats] = useState<MerchantStats>(EMPTY_STATS);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!fastFoodId) return;
    let alive = true;
    (async () => {
      try {
        const idToken = await auth.currentUser?.getIdToken();
        const res = await axios.get(`${Config.apiUrl}/fastFood/${fastFoodId}/stats`, {
          params: { from: period.from, to: period.to, bucket },
          headers: { "ngrok-skip-browser-warning": "true", Authorization: `Bearer ${idToken}` },
        });
        if (!alive) return;
        setStats({ ...EMPTY_STATS, ...res.data.data });
        setVersion((v) => v + 1);
      } catch {
        if (alive) showToast(t("Impossible de charger les statistiques"), "error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [fastFoodId, period.from, period.to, bucket]);

  return { stats, bucket, version };
}
