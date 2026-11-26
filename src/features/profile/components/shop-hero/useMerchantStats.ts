// Stats du hero marchand : GET /fastFood/:fastFoodId/stats (backend, fonction merchant_stats).
import { useMerchantMode } from "@/src/features/merchant/context/MerchantModeContext";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { Config } from "@/src/api/config";
import { auth } from "@/src/services/firebase";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { showToast } from "@/src/services/globalToast";
import { t } from "@/src/i18n";
import { Bucket, ShopPeriod, bucketOf } from "./shopPeriod";
import { useRefetchOnReconnect } from "@/src/hooks/useRefetchOnReconnect";

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

const RETRY_MS = 4000;

/**
 * Charge les stats de la periode ; `version` change a chaque nouvelle reponse (relance l'animation).
 * Recharge au retour du reseau et a chaque `refreshTick` (pull-to-refresh du home) ;
 * `onSettled` signale la fin du chargement (arret du spinner).
 */
export function useMerchantStats(
  period: ShopPeriod,
  refreshTick = 0,
  onSettled?: () => void,
): { stats: MerchantStats; bucket: Bucket; version: number; loaded: boolean } {
  const { userData } = useAuth();
  const { fastFoodId } = useMerchantMode();
  const bucket = bucketOf(period);
  const [stats, setStats] = useState<MerchantStats>(EMPTY_STATS);
  const [version, setVersion] = useState(0);
  // `false` tant qu'aucune reponse n'est arrivee (backend eteint compris) : le hero affiche un squelette.
  const [loaded, setLoaded] = useState(false);
  const [reconnectTick, setReconnectTick] = useState(0);
  useRefetchOnReconnect(() => setReconnectTick((n) => n + 1));
  // Backend en demarrage : on relance seul toutes les RETRY_MS jusqu'a la premiere reponse.
  const [retryTick, setRetryTick] = useState(0);
  const failedRef = useRef(false);
  const settledRef = useRef(onSettled);
  settledRef.current = onSettled;

  useEffect(() => {
    if (!fastFoodId) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
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
        setLoaded(true);
        failedRef.current = false;
      } catch {
        if (!alive) return;
        // Un seul toast par serie d'echecs, puis relance silencieuse.
        if (!failedRef.current) showToast(t("Impossible de charger les statistiques"), "error");
        failedRef.current = true;
        timer = setTimeout(() => setRetryTick((n) => n + 1), RETRY_MS);
      } finally {
        if (alive) settledRef.current?.();
      }
    })();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [fastFoodId, period.from, period.to, bucket, refreshTick, reconnectTick, retryTick]);

  return { stats, bucket, version, loaded };
}
